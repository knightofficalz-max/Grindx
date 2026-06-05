// GrindX — api/google-auth.js
const admin = require("firebase-admin");
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n") }), databaseURL: process.env.FIREBASE_DATABASE_URL });
}
const db = admin.database(), auth = admin.auth();

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const idToken = (req.headers.authorization || "").replace("Bearer ", "");
    if (!idToken) return res.status(401).json({ error: "No token" });
    const decoded = await auth.verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;
    const userSnap = await db.ref("users/" + uid).once("value");
    if (!userSnap.exists()) {
      const code = "GX" + uid.slice(0,6).toUpperCase();
      const { referralCode } = req.body || {};
      let referredBy = null;
      if (referralCode) {
        const rs = await db.ref("users").orderByChild("myRefCode").equalTo(referralCode.toUpperCase()).once("value");
        if (rs.exists()) referredBy = Object.keys(rs.val())[0];
      }
      const sSnap = await db.ref("settings").once("value");
      const s = sSnap.val() || {};
      const signupBonus = parseFloat(s.signupBonus || 0);
      await db.ref("users/" + uid).set({
        uid, name: name||"Player", email: email||"", phone: "", createdAt: Date.now(),
        status: "active", banReason: "", profilePic: picture||"",
        depositBal: signupBonus, winningBal: 0, bonusBal: signupBonus,
        totalMatches: 0, totalWon: 0, lifetimeEarnings: 0,
        myRefCode: code, referredBy, referrals: 0, referralEarnings: 0,
        referralRewarded: false, isAdmin: false
      });
      return res.status(200).json({ success: true, isNew: true, uid, referralCode: code });
    } else {
      const u = userSnap.val();
      if (u.status === "banned") return res.status(403).json({ error: "banned", banReason: u.banReason });
      return res.status(200).json({ success: true, isNew: false, uid, referralCode: u.myRefCode });
    }
  } catch(err) {
    if (err.code === "auth/id-token-expired") return res.status(401).json({ error: "Token expired" });
    return res.status(500).json({ error: "Internal server error" });
  }
};
