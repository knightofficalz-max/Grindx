// GrindX — api/cashfree-webhook.js
const admin  = require("firebase-admin");
const crypto = require("crypto");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n") }), databaseURL: process.env.FIREBASE_DATABASE_URL });
}
const db = admin.database();
const isLive = process.env.CF_ENV === "live";
const CF_SEC = isLive ? process.env.CF_LIVE_SECRET : process.env.CF_TEST_SECRET;

function verifySignature(rawBody, timestamp, signature) {
  const computed = crypto.createHmac("sha256", CF_SEC).update(timestamp + rawBody).digest("base64");
  return computed === signature;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const rawBody = JSON.stringify(req.body);
    if (!verifySignature(rawBody, req.headers["x-webhook-timestamp"], req.headers["x-webhook-signature"])) return res.status(401).json({ error: "Invalid signature" });
    if (req.body?.type !== "PAYMENT_SUCCESS_WEBHOOK") return res.status(200).json({ received: true });
    const orderId = req.body?.data?.order?.order_id;
    const cfAmount = parseFloat(req.body?.data?.payment?.payment_amount || 0);
    const paymentId = req.body?.data?.payment?.cf_payment_id;
    if (!orderId) return res.status(400).json({ error: "Missing order_id" });
    const depositSnap = await db.ref(`depositRequests/${orderId}`).once("value");
    if (!depositSnap.exists()) return res.status(404).json({ error: "Order not found" });
    const deposit = depositSnap.val();
    if (deposit.status === "approved") return res.status(200).json({ message: "Already processed" });
    if (deposit.amount !== cfAmount) { await db.ref(`depositRequests/${orderId}`).update({ status: "amount_mismatch", cfAmount }); return res.status(400).json({ error: "Amount mismatch" }); }
    const { userId, amount } = deposit;
    await db.ref(`users/${userId}`).transaction(u => { if (!u) return u; if (!u.depositBal) u.depositBal = 0; u.depositBal += amount; return u; });
    await db.ref(`depositRequests/${orderId}`).update({ status: "approved", paymentId, approvedAt: Date.now(), method: "cashfree_auto" });
    const txnId = `txn_${Date.now()}`;
    const txnData = { userId, type: "deposit", amount, description: "Wallet Deposit via Cashfree", status: "success", orderId, paymentId, timestamp: Date.now() };
    await db.ref(`transactions/${txnId}`).set(txnData);
    await db.ref(`userTransactions/${userId}/${txnId}`).set(txnData);
    await db.ref(`notifications/${userId}/notif_${Date.now()}`).set({ title: "💰 Deposit Successful!", message: `₹${amount} added to your wallet.`, type: "payment", read: false, createdAt: Date.now() });
    // Referral reward
    const uSnap = await db.ref(`users/${userId}`).once("value");
    const u = uSnap.val();
    if (u && !u.referralRewarded && u.referredBy) {
      const sSnap = await db.ref("settings").once("value");
      const s = sSnap.val() || {};
      const rb1 = parseFloat(s.referralBonus || 50), rb2 = parseFloat(s.referredBonus || 25);
      await db.ref(`users/${u.referredBy}/bonusBal`).transaction(b => (b||0) + rb1);
      await db.ref(`users/${userId}/bonusBal`).transaction(b => (b||0) + rb2);
      await db.ref(`users/${userId}/referralRewarded`).set(true);
      await db.ref(`notifications/${u.referredBy}/notif_${Date.now()}`).set({ title: "🎉 Referral Bonus!", message: `You earned ₹${rb1} for referring a friend!`, type: "bonus", read: false, createdAt: Date.now() });
    }
    console.log(`✅ ₹${amount} credited to ${userId}`);
    return res.status(200).json({ success: true });
  } catch(err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
};
