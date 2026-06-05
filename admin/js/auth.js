// GrindX — admin/js/auth.js
// ═════ ADMIN AUTH ═════
auth.onAuthStateChanged(async user => {
  if (!user) { showAuth(); return; }
  const snap = await db.ref('users/' + user.uid).once('value');
  if (!snap.exists() || !snap.val().isAdmin) {
    await auth.signOut();
    showAuth();
    toast('Not authorized as admin', 'error');
    return;
  }
  adminUser = user;
  document.getElementById('sbAv').textContent = user.email[0].toUpperCase();
  document.getElementById('sbName').textContent = user.email;
  showAdmin();
  loadAllData();
  if (!chartsInitialised) {
    initDashboard();
    chartsInitialised = true;
  }
});

function showAuth() {
  document.getElementById('authWrap').style.display = 'flex';
  document.getElementById('adminApp').style.display = 'none';
}
function showAdmin() {
  document.getElementById('authWrap').style.display = 'none';
  document.getElementById('adminApp').style.display = 'block';
}

async function adminLogin() {
  const email = document.getElementById('aEmail').value.trim();
  const pass = document.getElementById('aPass').value;
  if (!email || !pass) {
    document.getElementById('loginErr').textContent = 'Enter email and password';
    document.getElementById('loginErr').style.display = 'block';
    return;
  }
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Logging in...';
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    document.getElementById('loginErr').textContent = e.message;
    document.getElementById('loginErr').style.display = 'block';
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Login';
  }
}

function adminLogout() {
  if (confirm('Logout from admin panel?')) auth.signOut();
}
