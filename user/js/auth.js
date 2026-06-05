// GrindX — user/js/auth.js
// ═══════════════ AUTH ═══════════════
// Handle Google redirect result (mobile flow)
auth.getRedirectResult().then(result => {
  if (result.user) handleGoogleResult(result.user);
}).catch(e => { if (e && e.message) toast(e.message, 'error'); });

auth.onAuthStateChanged(async user => {
  if (user) {
    currentUser = user;
    loadUserData(user.uid);
    navigateTo('home');
    // Check for payment redirect
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order_id');
    if (orderId) {
      window.history.replaceState({}, '', window.location.pathname);
      checkPaymentStatus(orderId);
    }
  } else {
    currentUser = null; userData = null;
    navigateTo('login');
  }
});

async function checkPaymentStatus(orderId) {
  try {
    const snap = await db.ref(`depositRequests/${orderId}`).once('value');
    if (snap.exists()) {
      const order = snap.val();
      if (order.status === 'approved') {
        toast('Payment successful! Balance updated.', 'success');
      } else if (order.status === 'pending') {
        toast('Payment processing. Balance will update shortly.', 'info');
      } else if (order.status === 'failed') {
        toast('Payment failed. Try again.', 'error');
      }
    }
  } catch (e) { console.error('Check payment error:', e); }
}

// ═══════════════ USER DATA ═══════════════
function loadUserData(uid) {
  db.ref('users/' + uid).on('value', snap => {
    if (!snap.exists()) return;
    userData = snap.val();
    if (userData.status === 'banned') { auth.signOut(); alert('Account banned: ' + userData.banReason); return; }
    updateUserUI();
  });
  loadTransactions(uid);
  loadNotifBadge(uid);
}

function updateUserUI() {
  if (!userData) return;
  const total = (userData.depositBal || 0) + (userData.winningBal || 0) + (userData.bonusBal || 0);
  document.getElementById('headerBal').textContent = '₹' + total.toFixed(0);
  document.getElementById('walTotalBal').textContent = '₹' + total.toFixed(2);
  document.getElementById('walDeposit').textContent = '₹' + (userData.depositBal || 0).toFixed(0);
  document.getElementById('walWinning').textContent = '₹' + (userData.winningBal || 0).toFixed(0);
  document.getElementById('walBonus').textContent = '₹' + (userData.bonusBal || 0).toFixed(0);
  const name = userData.name || userData.username || 'Player';
  document.getElementById('profileName').textContent = name;
  document.getElementById('profileId').textContent = 'ID: ' + (userData.username || currentUser.uid.slice(0, 8));
  document.getElementById('pStatMatches').textContent = userData.totalMatches || 0;
  document.getElementById('pStatWon').textContent = userData.totalWon || 0;
  document.getElementById('pStatEarned').textContent = '₹' + (userData.lifetimeEarnings || 0).toFixed(0);
  document.getElementById('profileAvLetter').textContent = name[0].toUpperCase();
  if (userData.profilePic) {
    document.getElementById('profileAv').innerHTML = `<img src="${escapeHtml(userData.profilePic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="Profile">`;
  }
  document.getElementById('availWithdraw').textContent = '₹' + (userData.winningBal || 0).toFixed(0);
  document.getElementById('refCodeDisp').textContent = userData.myRefCode || '—';
  document.getElementById('refCount').textContent = userData.referrals || 0;
  document.getElementById('refEarned').textContent = '₹' + (userData.referralEarnings || 0);
}

// ═══════════════ AUTH FUNCTIONS ═══════════════
async function doLogin() {
  const email = document.getElementById('lEmail').value.trim();
  const pass = document.getElementById('lPass').value;
  if (!email || !pass) return toast('Enter email and password', 'error');
  const btn = document.querySelector('[data-action="doLogin"]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try { await auth.signInWithEmailAndPassword(email, pass); toast('Welcome back!', 'success'); }
  catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login'; }
}

function doSignup() {
  const first = document.getElementById('rFirst').value.trim();
  const last = document.getElementById('rLast').value.trim();
  const uname = document.getElementById('rUser').value.trim();
  const email = document.getElementById('rEmail').value.trim();
  const phone = document.getElementById('rPhone').value.trim();
  const pass = document.getElementById('rPass').value;
  const ref = document.getElementById('rRefCode').value.toUpperCase().trim();
  if (!first || !uname || !email || !phone || !pass) return toast('Fill all required fields', 'error');
  if (pass.length < 6) return toast('Password min 6 chars', 'error');
  if (!/^\d{10}$/.test(phone)) return toast('Enter 10-digit phone', 'error');
  // Save form data to sessionStorage and redirect to OTP page
  sessionStorage.setItem('grindx_signup', JSON.stringify({ first, last, uname, email, phone, pass, refCode: ref }));
  window.location.href = 'otp.html';
}

async function doGoogleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    if (window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      await auth.signInWithRedirect(provider);
    } else {
      const cred = await auth.signInWithPopup(provider);
      handleGoogleResult(cred.user);
    }
  } catch (e) { toast(e.message, 'error'); }
}

async function handleGoogleResult(user) {
  const idToken = await user.getIdToken();
  const BACKEND = await getBackend();
  const res = await fetch(`${BACKEND}/api/google-auth`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
    body: JSON.stringify({})
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Google auth failed');
  if (data.isNew) { navigateTo('googleComplete'); return; }
  toast('Welcome back!', 'success');
}

async function resetPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return toast('Enter email', 'error');
  try { await auth.sendPasswordResetEmail(email); toast('Reset link sent!', 'success'); navigateTo('login'); }
  catch (e) { toast(e.message, 'error'); }
}

async function completeGoogleProfile() {
  const uname = document.getElementById('gcUser').value.trim();
  const phone = document.getElementById('gcPhone').value.trim();
  const ref = document.getElementById('gcRef').value.toUpperCase().trim();
  if (!uname || !phone) return toast('Fill all fields', 'error');
  if (!/^\d{10}$/.test(phone)) return toast('Enter 10-digit phone', 'error');
  const uid = currentUser.uid;
  let referredBy = null;
  if (ref) {
    const refSnap = await db.ref('users').orderByChild('myRefCode').equalTo(ref).once('value');
    if (refSnap.exists()) referredBy = Object.keys(refSnap.val())[0];
    else return toast('Invalid referral code', 'error');
  }
  const updateData = { username: uname.toLowerCase(), phone };
  if (referredBy) updateData.referredBy = referredBy;
  await db.ref('users/' + uid).update(updateData);
  toast('Profile complete!', 'success');
  navigateTo('home');
}
