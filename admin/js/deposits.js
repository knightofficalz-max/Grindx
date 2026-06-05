// GrindX — admin/js/deposits.js
// ═════ DEPOSITS ═════
function renderDeposits() {
  const q = (document.getElementById('depSearch')?.value || '').toLowerCase();
  const st = document.getElementById('depStatusFilter')?.value || '';
  let list = allDeposits.filter(d =>
    (!q || (d.userId||'').toLowerCase().includes(q) || (d.orderId||'').toLowerCase().includes(q)) &&
    (!st || d.status === st)
  );
  const { sliced, totalPages } = paginate(list, 'deposits');
  const tb = document.getElementById('depTbody');
  if (!sliced.length) {
    tb.innerHTML = '<tr><td colspan="5">No deposits</td></tr>';
  } else {
    const badges = { success:'badge-green', pending:'badge-yellow', failed:'badge-red' };
    tb.innerHTML = sliced.map(d => `
      <tr>
        <td style="font-size:11px;color:var(--txt3)">${escapeHtml(d.orderId||d.id)}</td>
        <td>${d.userId?.slice(0,12)||'—'}</td>
        <td style="font-weight:700;color:var(--p)">₹${d.amount||0}</td>
        <td><span class="badge ${badges[d.status]||'badge-blue'}">${d.status||'—'}</span></td>
        <td style="font-size:12px;color:var(--txt3)">${formatDate(d.timestamp)}</td>
      </tr>`).join('');
  }
  renderPagination('deposits', totalPages);
}
