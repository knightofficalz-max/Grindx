// GrindX — api/otp.js  (Email OTP via Nodemailer / SMTP)
const nodemailer = require("nodemailer");
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

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASS }
});

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { email, action } = req.body; // action: "send" | "verify"
    if (!email) return res.status(400).json({ error: "Email required" });

    if (action === "send") {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 min
      await db.ref(`otps/${email.replace(/\./g, "_")}`).set({ otp, expires, attempts: 0 });
      await transporter.sendMail({
        from: `"GrindX" <${process.env.SMTP_EMAIL}>`,
        to: email,
        subject: "GrindX — Your OTP Code",
        html: `<div style="font-family:sans-serif;max-width:400px;margin:auto;background:#0d0d0d;padding:32px;border-radius:16px;border:1px solid #1f1f1f;">
          <h2 style="color:#4ade80;margin:0 0 8px;">GRINDX 🎮</h2>
          <p style="color:#a1a1aa;margin:0 0 24px;">Your one-time verification code</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#fff;text-align:center;padding:20px;background:#141414;border-radius:12px;">${otp}</div>
          <p style="color:#71717a;font-size:13px;margin-top:20px;">Valid for 10 minutes. Do not share with anyone.</p>
        </div>`
      });
      return res.status(200).json({ success: true, message: "OTP sent" });
    }

    if (action === "verify") {
      const { otp } = req.body;
      if (!otp) return res.status(400).json({ error: "OTP required" });
      const key = email.replace(/\./g, "_");
      const snap = await db.ref(`otps/${key}`).once("value");
      if (!snap.exists()) return res.status(400).json({ error: "OTP expired or not found" });
      const stored = snap.val();
      if (Date.now() > stored.expires) {
        await db.ref(`otps/${key}`).remove();
        return res.status(400).json({ error: "OTP expired" });
      }
      if ((stored.attempts || 0) >= 5) return res.status(429).json({ error: "Too many attempts" });
      if (stored.otp !== otp.toString()) {
        await db.ref(`otps/${key}/attempts`).transaction(a => (a || 0) + 1);
        return res.status(400).json({ error: "Invalid OTP" });
      }
      await db.ref(`otps/${key}`).remove();
      return res.status(200).json({ success: true, verified: true });
    }

    return res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
