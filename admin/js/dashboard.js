// GrindX — admin/js/dashboard.js
// ═════ DATA LOADING ═════
function loadAllData() {
  // Users
  db.ref('users').on('value', snap => {
    allUsers = [];
    if (snap.exists()) snap.forEach(u => allUsers.push({ id: u.key, ...u.val() }));
    updateDashboardStats();
  });
  // Tournaments
  db.ref('tournaments').on('value', snap => {
    allTours = [];
    if (snap.exists()) snap.forEach(t => allTours.push({ id: t.key, ...t.val() }));
    allTours.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    updateDashboardStats();
  });
  // Withdrawals
  db.ref('withdrawals').on('value', snap => {
    allWithdrawals = [];
    if (snap.exists()) snap.forEach(w => allWithdrawals.push({ id: w.key, ...w.val() }));
    allWithdrawals.sort((a,b) => b.createdAt - a.createdAt);
    const pending = allWithdrawals.filter(w => w.status === 'pending').length;
    document.getElementById('dPendingWd').textContent = pending;
    const badge = document.getElementById('pendingWdBadge');
    badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none';
  });
  // Transactions & deposits
  db.ref('transactions').on('value', snap => {
    allTxns = []; allDeposits = [];
    if (snap.exists()) {
      snap.forEach(t => {
        const d = { id: t.key, ...t.val() };
        allTxns.push(d);
        if (d.type === 'deposit' && d.status === 'success') allDeposits.push(d);
      });
    }
    allTxns.sort((a,b) => b.timestamp - a.timestamp);
    allDeposits.sort((a,b) => b.timestamp - a.timestamp);
    const totalRev = allDeposits.reduce((s,d) => s + (d.amount||0), 0);
    document.getElementById('dRevenue').textContent = '₹' + totalRev.toFixed(0);
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayRev = allDeposits.filter(d => d.timestamp >= todayStart.getTime()).reduce((s,d) => s + (d.amount||0), 0);
    document.getElementById('dTodayRev').textContent = '₹' + todayRev.toFixed(0) + ' today';
    if (chartsInitialised) updateCharts();
  });
  // Logs
  db.ref('adminLogs').orderByChild('timestamp').limitToLast(100).on('value', snap => {
    allLogs = [];
    if (snap.exists()) snap.forEach(l => allLogs.push({ id: l.key, ...l.val() }));
    allLogs.reverse();
    renderRecentLogs();
  });
}

function updateDashboardStats() {
  document.getElementById('dTotalUsers').textContent = allUsers.length;
  const today = new Date(); today.setHours(0,0,0,0);
  const newToday = allUsers.filter(u => u.createdAt >= today.getTime()).length;
  document.getElementById('dNewUsers').textContent = newToday + ' today';
  document.getElementById('dTotalTours').textContent = allTours.length;
  const live = allTours.filter(t => t.status === 'live').length;
  document.getElementById('dLiveTours').textContent = live + ' live';
}

function renderRecentLogs() {
  const el = document.getElementById('recentLogs');
  const list = allLogs.slice(0, 8);
  if (!list.length) {
    el.innerHTML = '<div class="empty"><i class="fas fa-scroll"></i><p>No activity yet</p></div>';
    return;
  }
  const colors = { tournament:'#4ade80', user:'#60a5fa', wallet:'#fbbf24', system:'#a78bfa' };
  el.innerHTML = list.map(l => `
    <div class="log-item">
      <div class="log-dot" style="background:${colors[l.type]||'#71717a'}"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500">${escapeHtml(l.message||'Action')}</div>
        <div style="font-size:11px;color:var(--txt3)">${formatTimeAgo(l.timestamp)}</div>
      </div>
    </div>`).join('');
}

// ═════ CHARTS ═════
function initDashboard() {
  if (revChart) revChart.destroy();
  if (usersChart) usersChart.destroy();
  const ctx1 = document.getElementById('revChart').getContext('2d');
  const ctx2 = document.getElementById('usersChart').getContext('2d');
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#1f1f1f' }, ticks: { color: '#71717a', font: { size: 11 } } },
      y: { grid: { color: '#1f1f1f' }, ticks: { color: '#71717a', font: { size: 11 } } }
    }
  };
  revChart = new Chart(ctx1, {
    type: 'line',
    data: { labels: [], datasets: [{ data: [], borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,.08)', tension: .4, fill: true, pointBackgroundColor: '#4ade80', pointRadius: 4 }] },
    options: opts
  });
  usersChart = new Chart(ctx2, {
    type: 'bar',
    data: { labels: [], datasets: [{ data: [], backgroundColor: 'rgba(124,58,237,.5)', borderColor: '#7c3aed', borderWidth: 1, borderRadius: 4 }] },
    options: opts
  });
  chartsInitialised = true;
  updateCharts();
}

function updateCharts() {
  const days = 7, labels = [], revData = [], usersData = [];
  for (let i = days-1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
    const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
    labels.push(d.toLocaleDateString('en',{weekday:'short'}));
    revData.push(allDeposits.filter(t => t.timestamp >= d.getTime() && t.timestamp <= dEnd.getTime()).reduce((s,t) => s+(t.amount||0), 0));
    usersData.push(allUsers.filter(u => u.createdAt >= d.getTime() && u.createdAt <= dEnd.getTime()).length);
  }
  if (revChart) { revChart.data.labels = labels; revChart.data.datasets[0].data = revData; revChart.update(); }
  if (usersChart) { usersChart.data.labels = labels; usersChart.data.datasets[0].data = usersData; usersChart.update(); }
}
