// GrindX — admin/js/transactions.js
// ═════ TRANSACTIONS ═════
function renderTxns() {
  const q = (document.getElementById('txnSearch')?.value || '').toLowerCase();
  const type = document.getElementById('txnTypeFilter')?.value || '';
  let list = allTxns.filter(t =>
    (!q || (t.userId||'').toLowerCase().includes(q) || (t.description||'').toLowerCase().includes(q)) &&
    (!type || t.type === type)
  );
  const { sliced, totalPages } = paginate(list, 'txn');
  const tb = document.getElementById('txnTbody');
  if (!sliced.length) {
    tb.innerHTML = '<tr><td colspan="6">No transactions</td></tr>';
  } else {
    const typeIcons = { deposit:'💳', withdrawal:'💸', tournament:'🎮', winning:'🏆', bonus:'🎁', referral:'👥' };
    tb.innerHTML = sliced.map(t => {
      const isCredit = ['deposit','winning','bonus','referral'].includes(t.type);
      return `
        <tr>
          <td>${typeIcons[t.type]||'💰'} <span class="badge ${isCredit?'badge-green':'badge-red'}">${t.type}</span></td>
          <td>${t.userId?.slice(0,12)||'—'}</td>
          <td style="font-weight:700;${isCredit?'color:var(--p)':'color:var(--acc)'}">${isCredit?'+':'-'}₹${Math.abs(t.amount||0)}</td>
          <td>${escapeHtml(t.description||'—')}</td>
          <td><span class="badge ${t.status==='success'?'badge-green':'badge-yellow'}">${t.status||'—'}</span></td>
          <td>${formatDate(t.timestamp)}</td>
        </tr>`;
    }).join('');
  }
  renderPagination('txn', totalPages);
}
