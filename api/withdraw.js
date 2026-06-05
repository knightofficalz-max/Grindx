// GrindX — api/withdraw.js
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
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, amount, upiId, accountName } = req.body;
    if (!userId || !amount || !upiId || !accountName)
      return res.status(400).json({ error: "Missing required fields" });

    // Settings
    const sSnap = await db.ref("settings").once("value");
    const s = sSnap.val() || {};
    const minW = parseFloat(s.minWithdraw || 100);
    const maxW = parseFloat(s.maxWithdraw || 10000);

    if (amount < minW) return res.status(400).json({ error: `Minimum withdrawal is ₹${minW}` });
    if (amount > maxW) return res.status(400).json({ error: `Maximum withdrawal is ₹${maxW}` });

    // Check user balance (only winningBal can be withdrawn)
    const uSnap = await db.ref(`users/${userId}`).once("value");
    if (!uSnap.exists()) return res.status(404).json({ error: "User not found" });
    const user = uSnap.val();
    if (user.status === "banned") return res.status(403).json({ error: "Account banned" });
    if ((user.winningBal || 0) < amount)
      return res.status(400).json({ error: "Insufficient winning balance" });

    // Pending request check
    const pendingSnap = await db.ref("withdrawals")
      .orderByChild("userId").equalTo(userId).once("value");
    if (pendingSnap.exists()) {
      const hasPending = Object.values(pendingSnap.val()).some(w => w.status === "pending");
      if (hasPending) return res.status(400).json({ error: "You already have a pending withdrawal" });
    }

    // Deduct balance atomically
    let deducted = false;
    await db.ref(`users/${userId}`).transaction(u => {
      if (!u) return u;
      if ((u.winningBal || 0) < amount) return; // abort
      u.winningBal = (u.winningBal || 0) - amount;
      deducted = true;
      return u;
    });
    if (!deducted) return res.status(400).json({ error: "Insufficient balance (race condition)" });

    const wId = `WD_${userId.slice(0, 6)}_${Date.now()}`;
    await db.ref(`withdrawals/${wId}`).set({
      wId, userId, amount: parseFloat(amount), upiId, accountName,
      status: "pending", createdAt: Date.now(), processedAt: null
    });
    const txnId = `txn_${Date.now()}`;
    const txnData = {
      userId, type: "withdrawal", amount: parseFloat(amount),
      description: `Withdrawal to UPI: ${upiId}`, status: "pending",
      wId, timestamp: Date.now()
    };
    await db.ref(`transactions/${txnId}`).set(txnData);
    await db.ref(`userTransactions/${userId}/${txnId}`).set(txnData);
    await db.ref(`notifications/${userId}/notif_${Date.now()}`).set({
      title: "💸 Withdrawal Requested",
      message: `₹${amount} withdrawal to ${upiId} is under review.`,
      type: "withdrawal", read: false, createdAt: Date.now()
    });

    return res.status(200).json({ success: true, wId, message: "Withdrawal request submitted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
