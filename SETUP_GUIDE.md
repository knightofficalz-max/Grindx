# GRINDX v5 — Complete Setup Guide

---

## STEP 1 — Firebase Setup

### 1.1 Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add Project** → Name it `grindx`
3. Disable Google Analytics (optional) → **Create Project**

### 1.2 Enable Authentication
1. Left menu → **Authentication** → **Get Started**
2. Enable: **Email/Password** ✅
3. Enable: **Google** ✅ (set your support email)

### 1.3 Enable Realtime Database
1. Left menu → **Realtime Database** → **Create Database**
2. Choose region: **asia-southeast1 (Singapore)** (closest for India)
3. Start in **locked mode** → Done
4. Go to **Rules** tab → Paste content from `firebase-rules.json` → **Publish**

### 1.4 Get Firebase Config (for user.html & admin.html)
1. Project Settings (gear icon) → **Your Apps** → **Web App** → Add App
2. Copy the firebaseConfig object
3. Paste into `user.html` and `admin.html` where it says `YOUR_API_KEY` etc.

### 1.5 Get Service Account (for Vercel backend)
1. Project Settings → **Service Accounts** tab
2. Click **Generate new private key** → Download JSON
3. From that JSON, copy:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

---

## STEP 2 — Cashfree Setup

1. Register at https://merchant.cashfree.com
2. Complete KYC
3. Go to **Payment Gateway** → **Credentials**
4. Copy **App ID** and **Secret Key**
5. For testing use **Sandbox** credentials first
6. Set in Vercel env vars:
   - `CASHFREE_APP_ID`
   - `CASHFREE_SECRET_KEY`
   - `CASHFREE_ENV=sandbox` (change to `production` when live)

### Cashfree Webhook Setup
1. In Cashfree Dashboard → **Developers** → **Webhooks**
2. Add URL: `https://YOUR-VERCEL-URL.vercel.app/api/cashfree-webhook`
3. Select events: `PAYMENT_SUCCESS`, `PAYMENT_FAILED`
4. Save

---

## STEP 3 — Gmail SMTP for OTP

1. Use a Gmail account for sending OTPs
2. Enable 2-Factor Authentication on that Gmail
3. Go to: Google Account → Security → 2-Step Verification → **App Passwords**
4. Generate password for **Mail** → **Other (GRINDX)**
5. Copy the 16-digit password → `SMTP_PASS`
6. Set `SMTP_EMAIL` = that Gmail address

---

## STEP 4 — Vercel Deployment

### 4.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 4.2 Deploy
```bash
cd grindx_v5
vercel
```
Follow prompts:
- Scope: your account
- Project name: grindx
- Directory: `./` (current)

### 4.3 Set Environment Variables
Go to https://vercel.com → Your Project → **Settings** → **Environment Variables**

Add all variables from `.env.example`:
```
FIREBASE_PROJECT_ID          = your-project-id
FIREBASE_CLIENT_EMAIL        = firebase-adminsdk-xxx@...
FIREBASE_PRIVATE_KEY         = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_DATABASE_URL        = https://your-project-default-rtdb.firebaseio.com
CASHFREE_APP_ID              = your_app_id
CASHFREE_SECRET_KEY          = your_secret_key
CASHFREE_ENV                 = sandbox
SMTP_EMAIL                   = yourapp@gmail.com
SMTP_PASS                    = your_app_password
ALLOWED_ORIGIN               = *
```

### 4.4 Redeploy after adding env vars
```bash
vercel --prod
```

Copy your Vercel URL (e.g. `https://grindx.vercel.app`)

---

## STEP 5 — Update Frontend URLs

In both `user.html` and `admin.html`, replace:
```js
const BACKEND = "https://YOUR-VERCEL-PROJECT.vercel.app";
```
With your actual Vercel URL.

---

## STEP 6 — Host on InfinityFree

1. Register at https://infinityfree.com
2. Create hosting account → get your domain/subdomain
3. Go to **File Manager** → `htdocs` folder
4. Upload `user.html` → rename to `index.html`
5. Upload `admin.html` → keep as `admin.html`
6. Access: `yourdomain.com` = user app, `yourdomain.com/admin.html` = admin

---

## STEP 7 — Create First Admin User

1. Open `user.html` → Sign up with your email
2. Go to Firebase Console → **Realtime Database**
3. Navigate to `users` → find your UID
4. Add field: `isAdmin: true`
5. Now login to `admin.html` with same credentials ✅

---

## STEP 8 — Initial Data Setup (Admin Panel)

After logging into admin panel:

1. **Games** page → Add games (e.g. Free Fire, BGMI)
2. **Games** page → Add modes for each game (e.g. Battle Royale, Clash Squad)
3. **Banners** page → Add home screen banners
4. **Banners** page → Add announcements/notes
5. **Settings** page → Set wallet limits, referral amounts, support links
6. **Settings** page → Add social media links
7. Create first tournament → **Tournaments** → **Create Tournament**

---

## TESTING CHECKLIST

### Auth
- [ ] Email signup with OTP verification
- [ ] Login with email/password
- [ ] Google login
- [ ] Forgot password (reset email)
- [ ] Banned user cannot login

### User App
- [ ] Home screen loads banners
- [ ] Notes ticker changes
- [ ] Site stats display
- [ ] Game cards load and click
- [ ] Mode selection works
- [ ] Tournament list loads
- [ ] Tournament filter (Solo/Duo/Squad) works
- [ ] Tournament details page opens
- [ ] Join tournament with sufficient balance
- [ ] Join tournament with insufficient balance → redirects to Add Cash
- [ ] Room ID hidden before 10 mins
- [ ] Room ID visible 10 mins before match
- [ ] Wallet: Main / Winning / Bonus balances show
- [ ] Add Cash → Cashfree payment opens
- [ ] Payment success → balance credited
- [ ] Withdrawal request submitted
- [ ] Transaction history shows
- [ ] Leaderboard loads (Winning / Referral)
- [ ] Referral code displayed
- [ ] Share referral works
- [ ] Lucky Draw spins and credits bonus
- [ ] Lucky Draw 24h cooldown works
- [ ] Notifications show unread count
- [ ] Mark all read works
- [ ] My Matches shows joined tournaments
- [ ] Profile data loads correctly
- [ ] Edit profile saves
- [ ] Support form submits dispute
- [ ] Tutorials open links
- [ ] Follow Us links work
- [ ] Legal pages load from Firebase
- [ ] Logout works

### Admin Panel
- [ ] Admin login (non-admin blocked)
- [ ] Dashboard stats load
- [ ] Revenue chart renders
- [ ] Users chart renders
- [ ] Create tournament saves to Firebase
- [ ] Edit tournament works
- [ ] Tournament participants list opens
- [ ] Enter results → wallets credited automatically
- [ ] Cancel tournament → all fees refunded
- [ ] User list loads and searches
- [ ] View user details
- [ ] Edit user wallet (add/deduct balance)
- [ ] Ban user works
- [ ] Unban user works
- [ ] Pending withdrawals show badge count
- [ ] Approve withdrawal marks as approved
- [ ] Reject withdrawal refunds amount
- [ ] Send notification to all users
- [ ] Send notification to specific user
- [ ] Add banner
- [ ] Delete banner
- [ ] Add note/announcement
- [ ] Add game
- [ ] Add mode to game
- [ ] Add tutorial
- [ ] Maintenance mode ON/OFF
- [ ] Wallet settings save
- [ ] Referral settings save
- [ ] Social links save
- [ ] Policy content saves and shows in user app
- [ ] Activity logs record actions

### Security
- [ ] Firebase rules block unauthenticated reads
- [ ] Non-admin users cannot write to tournaments
- [ ] API keys not visible in frontend source
- [ ] OTP expires after 10 minutes
- [ ] Duplicate tournament join blocked
- [ ] Duplicate result submission blocked
- [ ] Double referral reward blocked

---

## COMMON ISSUES & FIXES

**OTP not received**
→ Check SMTP_EMAIL and SMTP_PASS in Vercel env vars
→ Make sure Gmail App Password is used (not account password)
→ Check spam folder

**Payment not working**
→ Verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY
→ Make sure you're using sandbox credentials for testing
→ Check Vercel function logs for errors

**Firebase permission denied**
→ Make sure firebase-rules.json is published in Firebase Console
→ Check that your user has `isAdmin: true` for admin access

**Google login fails**
→ Add your domain to Firebase Auth → Authorized Domains
→ InfinityFree domain must be whitelisted

**Admin page shows "Not authorized"**
→ Set `isAdmin: true` manually in Firebase for your UID

---

## FOLDER STRUCTURE

```
grindx_v5/
├── user.html          ← User app (upload as index.html)
├── admin.html         ← Admin panel
├── firebase-rules.json ← Paste in Firebase Console
├── vercel.json        ← Vercel routing config
├── package.json       ← Backend dependencies
├── .env.example       ← Env variables template
└── api/
    ├── otp.js              ← Email OTP send/verify
    ├── cashfree-order.js   ← Create payment order
    ├── cashfree-verify.js  ← Verify payment
    ├── cashfree-webhook.js ← Payment webhook + referral
    ├── google-auth.js      ← Google login handler
    └── withdraw.js         ← Withdrawal request
```
