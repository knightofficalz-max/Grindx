// GrindX — user/js/navigation.js
// ═══════════════ STATE ═══════════════
let currentUser = null, userData = null;
let allTxs = [], allMatches = [];
let banners = [], notes = [];
let currentGameId = null, currentModeId = null;
let allTours = [], filteredTours = [];
let currentTour = null;
let lbType = 'winning', lbPeriod = 'lifetime';
let otpTimer = null;
let ldSpinning = false, ldPrizes = [];
let bannerTimer = null, noteTimer = null;

// ═══════════════ EVENT DELEGATION ═══════════════
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const screen = target.dataset.screen;
  const modal = target.dataset.modal;
  switch (action) {
    case 'nav': if (screen) navigateTo(screen); break;
    case 'closeModal': if (modal) document.getElementById(modal).classList.remove('active'); break;
    case 'openModal': if (modal) document.getElementById(modal).classList.add('active'); break;
    case 'togglePass':
      const passEl = document.getElementById(target.dataset.target);
      if (passEl) {
        const isText = passEl.type === 'text';
        passEl.type = isText ? 'password' : 'text';
        target.innerHTML = isText ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
      }
      break;
    case 'switchAuthTab':
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      target.classList.add('active');
      const tab = target.dataset.tab;
      document.querySelectorAll('[data-auth-form]').forEach(f => f.style.display = 'none');
      document.querySelector(`[data-auth-form="${tab}"]`).style.display = 'block';
      break;
    case 'doLogin': doLogin(); break;
    case 'doSignup': doSignup(); break;
    case 'doGoogleLogin': doGoogleLogin(); break;
    case 'resetPassword': resetPassword(); break;
    case 'completeGoogleProfile': completeGoogleProfile(); break;
    case 'openAddMoneyModal': openAddMoneyModal(); break;
    case 'openWithdrawModal': openWithdrawModal(); break;
    case 'setAmt': document.getElementById('addAmt').value = target.dataset.amount; break;
    case 'processPayment': processPayment(); break;
    case 'processWithdrawal': processWithdrawal(); break;
    case 'filterTours': filterTours(target.dataset.filter, target); break;
    case 'filterTxns': filterTxns(target.dataset.filter, target); break;
    case 'switchLB': lbType = target.dataset.type; document.querySelectorAll('#leaderboard .lb-tabs:first-of-type .lb-tab').forEach(t => t.classList.remove('active')); target.classList.add('active'); loadLeaderboard(); break;
    case 'switchLBPeriod': lbPeriod = target.dataset.period; document.querySelectorAll('#lbPeriodTabs .lb-tab').forEach(t => t.classList.remove('active')); target.classList.add('active'); loadLeaderboard(); break;
    case 'showMatches': showMatches(target.dataset.filter, target); break;
    case 'copyRefCode': copyRefCode(); break;
    case 'shareRef': shareRef(target.dataset.platform); break;
    case 'spinWheel': spinWheel(); break;
    case 'closeLdResult': document.getElementById('ldResult').style.display = 'none'; break;
    case 'openWA': openWA(); break;
    case 'openEmail': openEmail(); break;
    case 'submitDispute': submitDispute(); break;
    case 'openPolicy': openPolicy(target.dataset.policy); break;
    case 'saveProfile': saveProfile(); break;
    case 'markAllRead': markAllRead(); break;
    case 'doLogout': if (confirm('Logout?')) auth.signOut(); break;
    case 'confirmJoin': confirmJoin(); break;
  }
});

// ═══════════════ NAVIGATION ═══════════════
function navigateTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
  document.getElementById('bottomNav').style.display = ['home', 'wallet', 'leaderboard', 'earn', 'profile'].includes(id) ? 'flex' : 'none';
  document.querySelectorAll('.bn-item').forEach(b => b.classList.remove('active'));
  const bn = document.querySelector(`.bn-item[data-screen="${id}"]`);
  if (bn) bn.classList.add('active');
  // Clear timers
  if (bannerTimer) { clearInterval(bannerTimer); bannerTimer = null; }
  if (noteTimer) { clearInterval(noteTimer); noteTimer = null; }
  if (otpTimer) { clearInterval(otpTimer); otpTimer = null; }
  // Lazy load
  if (id === 'home') { loadGames(); loadBanners(); loadNotes(); loadSiteStats(); }
  if (id === 'leaderboard') loadLeaderboard();
  if (id === 'notifications') loadNotifPage();
  if (id === 'my-matches') loadMyMatches();
  if (id === 'referral') loadReferralPage();
  if (id === 'announcements') loadAnnouncements();
  if (id === 'tutorials') loadTutorials();
  if (id === 'followUs') loadFollowUs();
  if (id === 'promos') loadPromos();
  if (id === 'faq') loadFaq();
  if (id === 'support') loadSupport();
  if (id === 'editProfile') fillEditProfile();
  if (id === 'luckyDraw') initLuckyDraw();
  window.history.pushState({ screen: id }, '');
}
window.addEventListener('popstate', e => { if (e.state?.screen) navigateTo(e.state.screen); });
