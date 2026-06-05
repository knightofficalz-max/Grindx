// GrindX — api/zapupi-order.js (Create ZapUPI Payment Order)
const axios = require("axios");
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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { userId, amount, userEmail, userName } = req.body;
    if (!userId || !amount || amount < 10)
      return res.status(400).json({ error: "Invalid amount (min ₹10)" });

    const sSnap = await db.ref("settings/minDeposit").once("value");
    const minDep = sSnap.val() || 10;
    if (amount < minDep)
      return res.status(400).json({ error: `Minimum deposit is ₹${minDep}` });

    const uSnap = await db.ref("users/" + userId).once("value");
    if (!uSnap.exists()) return res.status(404).json({ error: "User not found" });

    const orderId = `GX_${userId.slice(0, 6)}_${Date.now()}`;

    // ZapUPI Create Order API
    const zapRes = await axios.post(
      `${process.env.ZAPUPI_API_URL || "https://api.zapupi.com"}/v1/create-order`,
      {
        order_id: orderId,
        amount: parseFloat(amount),
        customer_name: userName || "Player",
        customer_email: userEmail || "user@grindx.in",
        redirect_url: `${process.env.ALLOWED_ORIGIN || "https://grindx.in"}/user.html?order_id=${orderId}`,
        webhook_url: `${process.env.ALLOWED_ORIGIN || "https://grindx.in"}/api/zapupi-webhook`
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ZAPUPI_API_KEY}`,
          "X-Api-Key": process.env.ZAPUPI_API_KEY
        }
      }
    );

    if (!zapRes.data || !zapRes.data.success) {
      return res.status(400).json({ error: zapRes.data?.message || "ZapUPI order failed" });
    }

    // Save pending order
    await db.ref(`depositRequests/${orderId}`).set({
      orderId, userId, amount: parseFloat(amount),
      status: "pending", method: "zapupi",
      zapupi_order_id: zapRes.data.order_id || orderId,
      timestamp: Date.now()
    });

    return res.status(200).json({
      success: true,
      orderId: orderId,
      paymentUrl: zapRes.data.payment_url || zapRes.data.checkout_url,
      upiId: zapRes.data.upi_id || null,
      upiLink: zapRes.data.upi_link || null
    });

  } catch (err) {
    console.error("ZapUPI order error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Payment order failed" });
  }
};
