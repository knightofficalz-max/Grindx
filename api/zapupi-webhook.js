// GrindX — api/zapupi-webhook.js (ZapUPI Webhook Handler)
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}
const db = admin.database();

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { order_id, status, payment_id, amount } = req.body;

    if (!order_id) return res.status(400).json({ error: "Missing order_id" });

    const depositSnap = await db.ref(`depositRequests/${order_id}`).once("value");
    if (!depositSnap.exists()) return res.status(404).json({ error: "Order not found" });

    const deposit = depositSnap.val();
    if (deposit.status === "approved") return res.status(200).json({ message: "Already processed" });

    const successStatuses = ["SUCCESS", "PAID", "COMPLETED", "success", "paid", "completed"];

    if (!successStatuses.includes(status)) {
      await db.ref(`depositRequests/${order_id}`).update({ status: "failed", zapupi_status: status });
      return res.status(200).json({ received: true });
    }

    const { userId, amount: depositAmount } = deposit;

    // Credit user balance
    await db.ref(`users/${userId}`).transaction(u => {
      if (!u) return u;
      if (!u.depositBal) u.depositBal = 0;
      u.depositBal += depositAmount;
      return u;
    });

    // Update deposit request
    await db.ref(`depositRequests/${order_id}`).update({
      status: "approved", paymentId: payment_id, approvedAt: Date.now(), method: "zapupi_auto"
    });

    // Add transaction (dual-write: flat for admin + per-user for user panel)
    const txnId = `txn_${Date.now()}`;
    const txnData = {
      userId, type: "deposit", amount: depositAmount,
      description: "Wallet Deposit via ZapUPI",
      status: "success", orderId: order_id, paymentId: payment_id,
      timestamp: Date.now()
    };
    await db.ref(`transactions/${txnId}`).set(txnData);
    await db.ref(`userTransactions/${userId}/${txnId}`).set(txnData);

    // Add notification
    await db.ref(`notifications/${userId}/notif_${Date.now()}`).set({
      title: "💰 Deposit Successful!",
      message: `₹${depositAmount} added to your wallet.`,
      type: "payment", read: false, createdAt: Date.now()
    });

    // Referral reward
    const uSnap = await db.ref(`users/${userId}`).once("value");
    const u = uSnap.val();
    if (u && !u.referralRewarded && u.referredBy) {
      const sSnap = await db.ref("settings").once("value");
      const s = sSnap.val() || {};
      const rb1 = parseFloat(s.referralBonus || 50);
      const rb2 = parseFloat(s.referredBonus || 25);
      await db.ref(`users/${u.referredBy}/bonusBal`).transaction(b => (b || 0) + rb1);
      await db.ref(`users/${userId}/bonusBal`).transaction(b => (b || 0) + rb2);
      await db.ref(`users/${userId}/referralRewarded`).set(true);
      await db.ref(`notifications/${u.referredBy}/notif_${Date.now()}`).set({
        title: "🎉 Referral Bonus!",
        message: `You earned ₹${rb1} for referring a friend!`,
        type: "bonus", read: false, createdAt: Date.now()
      });
    }

    console.log(`✅ ₹${depositAmount} credited to ${userId} via ZapUPI`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("ZapUPI webhook error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};
