// GrindX — api/cashfree-order.js
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
    const { userId, amount, userEmail, userName } = req.body;
    if (!userId || !amount || amount < 1) return res.status(400).json({ error: "Invalid request" });
    const sSnap = await db.ref("settings/minDeposit").once("value");
    const minDep = sSnap.val() || 10;
    if (amount < minDep) return res.status(400).json({ error: `Minimum deposit is ₹${minDep}` });
    const uSnap = await db.ref("users/" + userId).once("value");
    if (!uSnap.exists()) return res.status(404).json({ error: "User not found" });
    const user = uSnap.val();
    const orderId = `GX_${userId.slice(0,6)}_${Date.now()}`;
    const cfRes = await fetch(`${CF_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-version": "2023-08-01", "x-client-id": CF_ID, "x-client-secret": CF_SEC },
      body: JSON.stringify({
        order_id: orderId, order_amount: parseFloat(amount), order_currency: "INR",
        customer_details: { customer_id: userId, customer_email: userEmail||user.email||"user@grindx.in", customer_phone: user.phone||"9999999999", customer_name: userName||user.name||"Player" },
        order_meta: { return_url: `${process.env.ALLOWED_ORIGIN}/payment-status?order_id={order_id}`, notify_url: `${process.env.ALLOWED_ORIGIN}/api/cashfree-webhook` },
        order_note: "GrindX Wallet Deposit"
      })
    });
    const cfData = await cfRes.json();
    if (!cfRes.ok) return res.status(400).json({ error: cfData.message || "Cashfree error" });
    await db.ref(`depositRequests/${orderId}`).set({ orderId, userId, amount: parseFloat(amount), status: "pending", method: "cashfree", mode: isLive?"live":"test", timestamp: Date.now() });
    return res.status(200).json({ success: true, orderId, paymentSessionId: cfData.payment_session_id });
  } catch(err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
};
