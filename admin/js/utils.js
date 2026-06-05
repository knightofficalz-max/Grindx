// GrindX — admin/js/utils.js
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  }[s]));
}
function toast(msg, type = 'info') {
  const colors = { success:'#4ade80', error:'#f87171', info:'#60a5fa', warning:'#fbbf24' };
  Toastify({ text:msg, duration:3000, gravity:'top', position:'right', style:{ background:colors[type]||colors.info, color:'#000', fontWeight:'600', borderRadius:'10px', fontSize:'13px', padding:'11px 18px' } }).showToast();
}
function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-IN',{ day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true });
}
function formatTimeAgo(ts) {
  if (!ts) return '';
  const d = Date.now() - ts, m = 60000, h = 3600000, dy = 86400000;
  if (d < m) return 'just now';
  if (d < h) return Math.floor(d / m) + 'm ago';
  if (d < dy) return Math.floor(d / h) + 'h ago';
  return Math.floor(d / dy) + 'd ago';
}
