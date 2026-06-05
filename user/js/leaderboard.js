// GrindX — user/js/leaderboard.js
// ═══════════════ LEADERBOARD ═══════════════
async function loadLeaderboard() {
  const wrap = document.getElementById('lbList');
  wrap.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
  const snap = await db.ref('users').once('value');
  const list = [];
  if (snap.exists()) snap.forEach(u => list.push({ id: u.key, ...u.val() }));
  const field = lbType === 'winning' ? 'lifetimeEarnings' : 'referralEarnings';
  list.sort((a,b) => (b[field]||0) - (a[field]||0));
  const top20 = list.slice(0,20);
  if (!top20.length) { wrap.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>No data yet</p></div>'; return; }
  wrap.innerHTML = top20.map((u,i) => {
    const rankIcon = i===0?'<i class="fas fa-crown"></i>':i===1?'<i class="fas fa-medal"></i>':i===2?'<i class="fas fa-medal"></i>':'#'+(i+1);
    return `<div class="lb-row"><div class="lb-rank ${i<3?['gold','silver','bronze'][i]:''}">${rankIcon}</div><div class="lb-av">${u.profilePic?`<img src="${escapeHtml(u.profilePic)}">`:(u.name||'?')[0].toUpperCase()}</div><div class="lb-info"><div class="lb-name">${escapeHtml(u.name||u.username||'Player')}</div><div class="lb-sub">@${escapeHtml(u.username||'—')}</div></div><div class="lb-val">₹${(u[field]||0).toFixed(0)}</div></div>`;
  }).join('');
}
