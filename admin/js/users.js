// GrindX — admin/js/users.js
// ═════ USERS ═════
function renderUsers() {
  const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
  const st = document.getElementById('userStatusFilter')?.value || '';
  let list = allUsers.filter(u =>
    (!q || [u.name,u.email,u.username].some(s => (s||'').toLowerCase().includes(q))) &&
    (!st || u.status === st)
  );
  const { sliced, totalPages } = paginate(list, 'users');
  const tb = document.getElementById('usersTbody');
  if (!sliced.length) {
    tb.innerHTML = '<tr><td colspan="9">No users found</td></tr>';
  } else {
    tb.innerHTML = sliced.map(u => `
      <tr>
        <td><div class="flex-center"><div class="user-av">${u.profilePic ? `<img src="${escapeHtml(u.profilePic)}">` : (u.name||'?')[0].toUpperCase()}</div><div><div style="font-size:13px;font-weight:700">${escapeHtml(u.name||'—')}</div><div style="font-size:11px;color:var(--txt3)">${escapeHtml(u.email||'—')}</div></div></div></td>
        <td>@${escapeHtml(u.username||'—')}</td>
        <td>${escapeHtml(u.phone||'—')}</td>
        <td>₹${(u.depositBal||0).toFixed(0)}</td>
        <td style="color:var(--p)">₹${(u.winningBal||0).toFixed(0)}</td>
        <td>${u.referrals||0}</td>
        <td>${formatDate(u.createdAt)}</td>
        <td><span class="badge ${u.status==='banned'?'badge-red':'badge-green'}">${u.status||'active'}</span></td>
        <td>
          <div style="display:flex;gap:5px">
            <button class="btn btn-outline btn-xs" data-action="viewUser" data-id="${u.id}"><i class="fas fa-eye"></i></button>
            <button class="btn btn-warn btn-xs" data-action="openEditUser" data-id="${u.id}"><i class="fas fa-wallet"></i></button>
            ${u.status==='banned' ?
              `<button class="btn btn-success btn-xs" data-action="unbanUser" data-id="${u.id}"><i class="fas fa-check"></i></button>` :
              `<button class="btn btn-danger btn-xs" data-action="openBanUser" data-id="${u.id}"><i class="fas fa-ban"></i></button>`}
          </div>
        </td>
      </tr>`).join('');
  }
  renderPagination('users', totalPages);
}

function viewUser(id) {
  const u = allUsers.find(u => u.id === id);
  if (!u) return;
  const total = (u.depositBal||0)+(u.winningBal||0)+(u.bonusBal||0);
  document.getElementById('userDetailBody').innerHTML = `
    <div style="text-align:center;padding:16px 0 20px">
      <div class="user-av" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px">${u.profilePic?`<img src="${escapeHtml(u.profilePic)}">`:(u.name||'?')[0].toUpperCase()}</div>
      <div style="font-size:20px;font-weight:700">${escapeHtml(u.name||'—')}</div>
      <div style="font-size:12px;color:var(--txt3)">@${escapeHtml(u.username||'—')} · ${escapeHtml(u.email||'')}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
      <div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:700;font-family:Rajdhani">₹${(u.depositBal||0).toFixed(0)}</div><div style="font-size:11px;color:var(--txt3)">Main</div></div>
      <div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:700;font-family:Rajdhani;color:var(--p)">₹${(u.winningBal||0).toFixed(0)}</div><div style="font-size:11px;color:var(--txt3)">Winning</div></div>
      <div class="card" style="text-align:center;padding:12px"><div style="font-size:20px;font-weight:700;font-family:Rajdhani;color:var(--warn)">₹${(u.bonusBal||0).toFixed(0)}</div><div style="font-size:11px;color:var(--txt3)">Bonus</div></div>
    </div>
    <div class="card" style="font-size:13px">
      <div class="flex-between mb12"><span class="text-muted">Total Balance</span><b>₹${total.toFixed(2)}</b></div>
      <div class="flex-between mb12"><span class="text-muted">Phone</span><span>${escapeHtml(u.phone||'—')}</span></div>
      <div class="flex-between mb12"><span class="text-muted">Referral Code</span><span style="color:var(--p);font-weight:700">${escapeHtml(u.myRefCode||'—')}</span></div>
      <div class="flex-between mb12"><span class="text-muted">Matches Played</span><span>${u.totalMatches||0}</span></div>
      <div class="flex-between mb12"><span class="text-muted">Matches Won</span><span>${u.totalWon||0}</span></div>
      <div class="flex-between"><span class="text-muted">Joined</span><span>${formatDate(u.createdAt)}</span></div>
    </div>`;
  openModal('userDetailModal');
}

function openEditUser(id) {
  const u = allUsers.find(u => u.id === id);
  if (!u) return;
  document.getElementById('editUserId').value = id;
  document.getElementById('editDepBal').value = (u.depositBal||0).toFixed(2);
  document.getElementById('editWinBal').value = (u.winningBal||0).toFixed(2);
  document.getElementById('editBonusBal').value = (u.bonusBal||0).toFixed(2);
  document.getElementById('editUserNote').value = '';
  openModal('editUserModal');
}

async function saveUserWallet() {
  const id = document.getElementById('editUserId').value;
  const dep = parseFloat(document.getElementById('editDepBal').value)||0;
  const win = parseFloat(document.getElementById('editWinBal').value)||0;
  const bonus = parseFloat(document.getElementById('editBonusBal').value)||0;
  const note = document.getElementById('editUserNote').value.trim();
  try {
    await db.ref('users/' + id).update({ depositBal: dep, winningBal: win, bonusBal: bonus });
    const adjTxnId = 'txnadj_' + Date.now();
    const adjTxnData = {
      userId: id, type: 'bonus', amount: 0,
      description: 'Admin wallet adjustment' + (note ? ': ' + note : ''),
      status: 'success', timestamp: Date.now()
    };
    await db.ref('transactions/' + adjTxnId).set(adjTxnData);
    await db.ref('userTransactions/' + id + '/' + adjTxnId).set(adjTxnData);
    addLog('wallet', `Wallet adjusted for ${id} — Main:₹${dep} Win:₹${win} Bonus:₹${bonus}`);
    closeModal('editUserModal');
    toast('Wallet updated!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function openBanUser(id) {
  document.getElementById('banUserId').value = id;
  document.getElementById('banReason').value = '';
  openModal('banModal');
}

async function confirmBan() {
  const id = document.getElementById('banUserId').value;
  const reason = document.getElementById('banReason').value.trim();
  if (!reason) { toast('Enter ban reason', 'error'); return; }
  try {
    await db.ref('users/' + id).update({ status: 'banned', banReason: reason });
    addLog('user', `User banned: ${id} — Reason: ${reason}`);
    closeModal('banModal');
    toast('User banned!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function unbanUser(id) {
  if (!confirm('Unban this user?')) return;
  try {
    await db.ref('users/' + id).update({ status: 'active', banReason: '' });
    addLog('user', `User unbanned: ${id}`);
    toast('User unbanned!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}
