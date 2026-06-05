// GrindX — admin/js/withdrawals.js
// ═════ WITHDRAWALS ═════
function filterWithdrawals(status, el) {
  wdFilterStatus = status || wdFilterStatus;
  if (el) {
    document.querySelectorAll('#wdTabs .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
  }
  let list = wdFilterStatus === 'all' ? allWithdrawals : allWithdrawals.filter(w => w.status === wdFilterStatus);
  const { sliced, totalPages } = paginate(list, 'withdrawals');
  const tb = document.getElementById('wdTbody');
  if (!sliced.length) {
    tb.innerHTML = '<tr><td colspan="7">No withdrawals</td></tr>';
  } else {
    const badges = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red' };
    tb.innerHTML = sliced.map(w => `
      <tr>
        <td style="font-size:11px;color:var(--txt3)">${escapeHtml(w.wId||w.id)}</td>
        <td>${escapeHtml(w.accountName||'—')}<br><span style="font-size:11px;color:var(--txt3)">${w.userId?.slice(0,10)||''}</span></td>
        <td style="font-weight:700;color:var(--acc)">₹${w.amount||0}</td>
        <td>${escapeHtml(w.upiId||'—')}</td>
        <td>${formatDate(w.createdAt)}</td>
        <td><span class="badge ${badges[w.status]||'badge-blue'}">${w.status||'—'}</span></td>
        <td>
          ${w.status==='pending' ? `
            <div style="display:flex;gap:5px">
              <button class="btn btn-success btn-xs" data-action="approveWd" data-id="${w.id}"><i class="fas fa-check"></i> Approve</button>
              <button class="btn btn-danger btn-xs" data-action="rejectWd" data-id="${w.id}"><i class="fas fa-times"></i> Reject</button>
            </div>` : '—'}
        </td>
      </tr>`).join('');
  }
  renderPagination('withdrawals', totalPages);
}

async function approveWd(id) {
  if (!confirm('Mark as approved/paid?')) return;
  const w = allWithdrawals.find(w => w.id === id);
  try {
    await db.ref('withdrawals/' + id).update({ status:'approved', processedAt:Date.now(), processedBy: adminUser.uid });
    await db.ref('notifications/' + w.userId + '/notif_' + Date.now()).set({
      title:'✅ Withdrawal Approved',
      message:`₹${w.amount} withdrawal to ${w.upiId} approved!`,
      type:'withdrawal', read:false, createdAt:Date.now()
    });
    addLog('wallet', `Withdrawal approved: ₹${w.amount}`);
    toast('Approved!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function rejectWd(id) {
  const reason = prompt('Rejection reason (shown to user):');
  if (!reason) return;
  const w = allWithdrawals.find(w => w.id === id);
  try {
    await db.ref('users/' + w.userId).transaction(u => {
      if (!u) return u;
      u.winningBal = (u.winningBal||0) + (w.amount||0);
      return u;
    });
    await db.ref('withdrawals/' + id).update({ status:'rejected', processedAt:Date.now(), rejectionReason: reason });
    await db.ref('notifications/' + w.userId + '/notif_' + Date.now()).set({
      title:'❌ Withdrawal Rejected',
      message:`₹${w.amount} rejected: ${reason}. Amount refunded.`,
      type:'withdrawal', read:false, createdAt:Date.now()
    });
    addLog('wallet', `Withdrawal rejected: ₹${w.amount} — ${reason}`);
    toast('Rejected & refunded!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}
