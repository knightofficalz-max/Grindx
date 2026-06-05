// GrindX — admin/js/logs.js
// ═════ LOGS ═════
function renderLogs() {
  const q = (document.getElementById('logSearch')?.value || '').toLowerCase();
  const type = document.getElementById('logTypeFilter')?.value || '';
  let list = allLogs.filter(l =>
    (!q || (l.message||'').toLowerCase().includes(q)) &&
    (!type || l.type === type)
  );
  const { sliced, totalPages } = paginate(list, 'logs');
  const el = document.getElementById('logsContainer');
  if (!sliced.length) {
    el.innerHTML = '<div class="empty"><i class="fas fa-scroll"></i><p>No logs</p></div>';
  } else {
    const colors = { tournament:'#4ade80', user:'#60a5fa', wallet:'#fbbf24', system:'#a78bfa' };
    el.innerHTML = sliced.map(l => `
      <div class="log-item">
        <div class="log-dot" style="background:${colors[l.type]||'#71717a'}"></div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:500">${escapeHtml(l.message||'Action')}</div>
          <div style="font-size:11px;color:var(--txt3)">${l.type||'system'} · ${formatDate(l.timestamp)}</div>
        </div>
      </div>`).join('');
  }
  renderPagination('logs', totalPages);
}

async function clearLogs() {
  if (!confirm('Delete logs older than 30 days?')) return;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const snap = await db.ref('adminLogs').orderByChild('timestamp').endAt(cutoff).once('value');
  if (snap.exists()) {
    const updates = {};
    snap.forEach(l => updates['adminLogs/' + l.key] = null);
    await db.ref().update(updates);
    toast('Old logs cleared!', 'success');
  } else { toast('No old logs', 'success'); }
}

function addLog(type, message) {
  db.ref('adminLogs').push({ type, message, timestamp: Date.now(), adminUid: adminUser?.uid || 'system' });
}
