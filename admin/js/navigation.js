// GrindX — admin/js/navigation.js
// ═══════════════ GLOBALS ═══════════════
let adminUser = null;
let allUsers = [], allTours = [], allDeposits = [], allWithdrawals = [], allTxns = [], allLogs = [];
let currentTourEdit = null, currentPolicyTab = 'terms';
let revChart = null, usersChart = null;
let chartsInitialised = false;
let pageSizes = { tours:10, users:10, deposits:10, withdrawals:10, txn:15, logs:10 };
let currentPages = { tours:1, users:1, deposits:1, withdrawals:1, txn:1, logs:1 };
let wdFilterStatus = 'pending';

// ═════ EVENT DELEGATION ═════
document.addEventListener('click', e => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  e.preventDefault();

  switch (action) {
    case 'adminLogin': adminLogin(); break;
    case 'adminLogout': adminLogout(); break;
    case 'showPage': showPage(target.dataset.page); break;
    case 'toggleSidebar': toggleSidebar(); break;
    case 'closeModal': closeModal(target.dataset.modal); break;
    case 'openModal': openModal(target.dataset.modal); break;
    case 'addPrizeRow': addPrizeRow(); break;
    case 'removePrizeRow': removePrizeRow(); break;
    case 'togglePerKill': togglePerKill(); break;
    case 'saveTournament': saveTournament(); break;
    case 'deleteBanner': deleteBanner(target.dataset.id); break;
    case 'deleteNote': deleteNote(target.dataset.id); break;
    case 'deleteGame': deleteGame(target.dataset.id); break;
    case 'deleteMode': deleteMode(target.dataset.id); break;
    case 'deleteTutorial': deleteTutorial(target.dataset.id); break;
    case 'addGame': addGame(); break;
    case 'addMode': addMode(); break;
    case 'addBanner': addBanner(); break;
    case 'addNote': addNote(); break;
    case 'addTutorial': addTutorial(); break;
    case 'sendNotification': sendNotification(); break;
    case 'toggleNotifTarget': toggleNotifTarget(); break;
    case 'saveSetting': saveSetting(target.dataset.setting); break;
    case 'switchPolicyTab': switchPolicyTab(target.dataset.tab); break;
    case 'savePolicy': savePolicy(); break;
    case 'filterWithdrawals': filterWithdrawals(target.dataset.status, target); break;
    case 'clearLogs': clearLogs(); break;
    case 'approveWd': approveWd(target.dataset.id); break;
    case 'rejectWd': rejectWd(target.dataset.id); break;
    case 'confirmBan': confirmBan(); break;
    case 'unbanUser': unbanUser(target.dataset.id); break;
    case 'confirmCancelTour': confirmCancelTour(); break;
    case 'submitResults': submitResults(); break;
    case 'saveUserWallet': saveUserWallet(); break;
    case 'goToPage': goToPage(target.dataset.table, parseInt(target.dataset.page)); break;
    case 'editTournament': editTournament(target.dataset.id); break;
    case 'openParticipants': openParticipants(target.dataset.id); break;
    case 'openResultModal': openResultModal(target.dataset.id); break;
    case 'openCancelTour': openCancelTour(target.dataset.id); break;
    case 'viewUser': viewUser(target.dataset.id); break;
    case 'openEditUser': openEditUser(target.dataset.id); break;
    case 'openBanUser': openBanUser(target.dataset.id); break;
    case 'filter': filterTable(target.dataset.table); break;
  }
});

// Input event delegation for search fields
document.addEventListener('input', e => {
  const target = e.target.closest('[data-action="filter"]');
  if (target) filterTable(target.dataset.table);
});

// ═════ NAVIGATION ═════
const pageTitles = {
  dashboard:'Dashboard', tournaments:'Tournaments', createTour:'Create Tournament',
  users:'Users', deposits:'Deposits', manualDeposits:'Manual Deposits',
  withdrawals:'Withdrawals', transactions:'Transactions',
  notifications:'Notifications', banners:'Banners & Notes', games:'Games & Modes',
  tutorials:'Tutorials', settings:'Settings', logs:'Activity Logs'
};

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  document.querySelectorAll('.sb-item').forEach(i => {
    if (i.dataset.page === id) i.classList.add('active');
  });
  document.getElementById('pageTitleBar').textContent = pageTitles[id] || id;
  if (window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');

  // lazy load
  if (id === 'tournaments') renderTournaments();
  if (id === 'users') renderUsers();
  if (id === 'deposits') renderDeposits();
  if (id === 'manualDeposits') loadManualDeposits();
  if (id === 'withdrawals') filterWithdrawals(wdFilterStatus);
  if (id === 'transactions') renderTxns();
  if (id === 'banners') loadBanners();
  if (id === 'games') loadGamesAdmin();
  if (id === 'tutorials') loadTutorialsAdmin();
  if (id === 'settings') loadSettings();
  if (id === 'logs') renderLogs();
  if (id === 'notifications') loadSentNotifs();
  if (id === 'createTour') {
    currentTourEdit = null;
    document.getElementById('tourFormTitle').textContent = 'Create Tournament';
    resetTourForm();
    loadTourFormGames();
  }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (window.innerWidth < 768) sb.classList.toggle('open');
  else {
    sb.classList.toggle('hidden');
    document.getElementById('mainArea').classList.toggle('full');
  }
}

// ═════ MODALS ═════
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ═════ PAGINATION ═════
function paginate(array, table) {
  const page = currentPages[table] || 1;
  const size = pageSizes[table] || 10;
  const totalPages = Math.ceil(array.length / size) || 1;
  const start = (page - 1) * size;
  return { sliced: array.slice(start, start + size), page, totalPages };
}

function renderPagination(table, totalPages) {
  const el = document.getElementById(table + 'Pagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  const current = currentPages[table];
  let html = '';
  html += `<button data-action="goToPage" data-table="${table}" data-page="${current-1}" ${current===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<button data-action="goToPage" data-table="${table}" data-page="${i}" class="${i===current?'active':''}">${i}</button>`;
  }
  html += `<button data-action="goToPage" data-table="${table}" data-page="${current+1}" ${current===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
  el.innerHTML = html;
}

function goToPage(table, page) {
  currentPages[table] = page;
  switch (table) {
    case 'tours': renderTournaments(); break;
    case 'users': renderUsers(); break;
    case 'deposits': renderDeposits(); break;
    case 'withdrawals': filterWithdrawals(wdFilterStatus); break;
    case 'txn': renderTxns(); break;
    case 'logs': renderLogs(); break;
  }
}

// ═════ FILTERING ═════
function filterTable(table) {
  switch (table) {
    case 'tours': renderTournaments(); break;
    case 'users': renderUsers(); break;
    case 'deposits': renderDeposits(); break;
    case 'txn': renderTxns(); break;
    case 'logs': renderLogs(); break;
  }
  if (currentPages[table] !== 1) {
    currentPages[table] = 1;
  }
}
