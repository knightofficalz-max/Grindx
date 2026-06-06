// GrindX — admin/js/manualdeposits.js
let allManualDeps = [];

function loadManualDeposits() {
  db.ref('manualDeposits').orderByChild('timestamp').on('value', snap => {
    allManualDeps = [];
    if (snap.exists()) snap.forEach(d => allManualDeps.push({ id: d.key, ...d.val() }));
    allManualDeps.reverse();
    renderManualDeps();
  });
}

function renderManualDeps() {
  const q   = (document.getElementById('manualDepSearch')?.value || '').toLowerCase();
  const st  = document.getElementById('manualDepStatusFilter')?.value || '';
  let list  = allManualDeps.filter(d =>
    (!q || (d.txnRef||'').toLowerCase().includes(q) || (d.userId||'').toLowerCase().includes(q) || (d.utr||'').toLowerCase().includes(q)) &&
    (!st || d.status === st)
  );
  const tb = document.getElementById('manualDepTbody');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--txt3)">No manual deposits</td></tr>';
    return;
  }
  const statusColor = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red' };
  tb.innerHTML = list.map(d => `
    <tr>
      <td style="font-size:11px;font-family:monospace">${escapeHtml(d.txnRef||d.id)}</td>
      <td style="font-size:12px">${escapeHtml(d.userId||'—')}</td>
      <td style="font-weight:700;color:var(--p)">₹${d.amount||0}</td>
      <td style="font-size:12px;font-family:monospace">${escapeHtml(d.utr||'—')}</td>
      <td><span class="badge ${statusColor[d.status]||'badge-blue'}">${d.status||'pending'}</span></td>
      <td style="font-size:11px;color:var(--txt3)">${formatDate(d.timestamp)}</td>
      <td>
        ${d.status === 'pending' ? `
          <div style="display:flex;gap:5px">
            <button class="btn btn-success btn-xs" onclick="approveManualDep('${d.id}','${d.userId}',${d.amount})"><i class="fas fa-check"></i> Approve</button>
            <button class="btn btn-danger btn-xs" onclick="rejectManualDep('${d.id}')"><i class="fas fa-times"></i></button>
          </div>` : '—'}
      </td>
    </tr>`).join('');
}

async function approveManualDep(id, userId, amount) {
  if (!confirm(`Approve ₹${amount} deposit for ${userId}?`)) return;
  try {
    // Credit deposit balance
    const uSnap = await db.ref('users/' + userId).once('value');
    if (!uSnap.exists()) return toast('User not found', 'error');
    const u = uSnap.val();
    await db.ref('users/' + userId).update({ depositBal: (u.depositBal||0) + parseFloat(amount) });

    // Dual-write transaction
    const txnId = 'txn_manual_' + Date.now();
    const txnData = { userId, type: 'deposit', amount: parseFloat(amount), description: 'Manual UPI Deposit (Approved)', status: 'success', manualDepId: id, timestamp: Date.now() };
    await db.ref('transactions/' + txnId).set(txnData);
    await db.ref('userTransactions/' + userId + '/' + txnId).set(txnData);

    // Update deposit status
    await db.ref('manualDeposits/' + id).update({ status: 'approved', approvedAt: Date.now(), approvedBy: adminUser?.uid });

    // Notification to user
    await db.ref('notifications/' + userId + '/notif_' + Date.now()).set({
      title: '💰 Deposit Approved',
      message: `Your deposit of ₹${amount} has been approved and credited.`,
      type: 'payment', read: false, createdAt: Date.now()
    });

    addLog('wallet', `Manual deposit ₹${amount} approved for ${userId}`);
    toast('Deposit approved & credited!', 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}

async function rejectManualDep(id) {
  if (!confirm('Reject this deposit request?')) return;
  try {
    await db.ref('manualDeposits/' + id).update({ status: 'rejected', rejectedAt: Date.now() });
    addLog('wallet', `Manual deposit ${id} rejected`);
    toast('Deposit rejected', 'success');
  } catch(e) { toast('Error: ' + e.message, 'error'); }
}
