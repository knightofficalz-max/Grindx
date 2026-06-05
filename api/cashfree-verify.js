// GrindX — api/cashfree-verify.js
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n") }), databaseURL: process.env.FIREBASE_DATABASE_URL });
}
const db = admin.database();
const isLive = process.env.CF_ENV === "live";
const CF_BASE = isLive ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
const CF_ID   = isLive ? process.env.CF_LIVE_APP_ID  : process.env.CF_TEST_APP_ID;
const CF_SEC  = isLive ? process.env.CF_LIVE_SECRET  : process.env.CF_TEST_SECRET;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { orderId, userId } = req.body;
    if (!orderId || !userId) return res.status(400).json({ error: "orderId and userId required" });
    const depositSnap = await db.ref(`depositRequests/${orderId}`).once("value");
    if (!depositSnap.exists()) return res.status(404).json({ error: "Order not found" });
    const deposit = depositSnap.val();
    if (deposit.userId !== userId) return res.status(403).json({ error: "Unauthorized" });
    if (deposit.status === "approved") return res.status(200).json({ success: true, message: "Already credited" });
    const cfRes = await fetch(`${CF_BASE}/orders/${orderId}/payments`, { headers: { "x-api-version": "2023-08-01", "x-client-id": CF_ID, "x-client-secret": CF_SEC } });
    const payments = await cfRes.json();
    const success = Array.isArray(payments) ? payments.find(p => p.payment_status === "SUCCESS") : null;
    if (!success) return res.status(200).json({ success: false, message: "Payment not successful yet" });
    const { amount } = deposit;
    await db.ref(`users/${userId}`).transaction(u => { if (!u) return u; if (!u.depositBal) u.depositBal = 0; u.depositBal += amount; return u; });
    await db.ref(`depositRequests/${orderId}`).update({ status: "approved", paymentId: success.cf_payment_id, approvedAt: Date.now(), method: "cashfree_verify" });
    const txnId = `txn_${Date.now()}`;
    const txnData = { userId, type: "deposit", amount, description: "Wallet Deposit (Verified)", status: "success", orderId, timestamp: Date.now() };
    await db.ref(`transactions/${txnId}`).set(txnData);
    await db.ref(`userTransactions/${userId}/${txnId}`).set(txnData);
    await db.ref(`notifications/${userId}/notif_${Date.now()}`).set({ title: "💰 Deposit Successful!", message: `₹${amount} added to your wallet.`, type: "payment", read: false, createdAt: Date.now() });
    return res.status(200).json({ success: true, amount });
  } catch(err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
};
