// GrindX — user/js/wallet.js
// ═══════════════ WALLET & TRANSACTIONS ═══════════════
function openAddMoneyModal() { document.getElementById('addAmt').value = ''; document.getElementById('addMoneyModal').classList.add('active'); }
function openWithdrawModal() { document.getElementById('wdAmt').value = ''; document.getElementById('wdUpi').value = ''; document.getElementById('wdName').value = ''; document.getElementById('availWithdraw').textContent = '₹' + (userData?.winningBal || 0).toFixed(0); document.getElementById('withdrawModal').classList.add('active'); }

async function processPayment() {
  if (!currentUser) return toast('Login required', 'error');
  const amt = parseFloat(document.getElementById('addAmt').value);
  if (!amt || amt < 10) return toast('Minimum deposit is ₹10', 'error');
  const btn = document.querySelector('[data-action="processPayment"]');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>';
  try {
    const BACKEND = await getBackend();
    const res = await fetch(`${BACKEND}/api/zapupi-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid, amount: amt, userEmail: currentUser.email, userName: userData?.name })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Payment failed');
    if (data.paymentUrl) {
      window.location.href = data.paymentUrl;
    } else if (data.upiLink) {
      window.location.href = data.upiLink;
    } else {
      toast('Payment link generated. Check your UPI app.', 'success');
    }
  } catch (e) { toast(e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Proceed to Payment'; }
}

async function processWithdrawal() {
  const amt = parseFloat(document.getElementById('wdAmt').value);
  const upi = document.getElementById('wdUpi').value.trim();
  const name = document.getElementById('wdName').value.trim();
  if (!amt || !upi || !name) return toast('Fill all fields', 'error');
  if ((userData?.winningBal || 0) < amt) return toast('Insufficient winning balance', 'error');
  try {
    const BACKEND = await getBackend();
    const res = await fetch(`${BACKEND}/api/withdraw`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid, amount: amt, upiId: upi, accountName: name })
    });
    const d = await res.json();
    if (!d.success) throw new Error(d.error);
    document.getElementById('withdrawModal').classList.remove('active');
    toast('Withdrawal requested! Processed in 24h', 'success');
  } catch (e) { toast(e.message, 'error'); }
}

function loadTransactions(uid) {
  db.ref('userTransactions/' + uid).on('value', snap => {
    allTxs = [];
    if (snap.exists()) snap.forEach(t => allTxs.push({ id: t.key, ...t.val() }));
    allTxs.sort((a, b) => b.timestamp - a.timestamp);
    filterTxns('all');
  });
}

function filterTxns(type, el) {
  if (el) {
    document.querySelectorAll('#wallet .ftab').forEach(f => f.classList.remove('active'));
    el.classList.add('active');
  }
  const list = type === 'all' ? allTxs : allTxs.filter(t => t.type === type);
  const elList = document.getElementById('txnList');
  if (!list.length) { elList.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions</p></div>'; return; }
  elList.innerHTML = list.slice(0, 50).map(t => {
    const isCredit = ['deposit','winning','bonus','referral'].includes(t.type);
    return `<div class="txn-item"><div class="txn-ico ${isCredit?'credit':'debit'}">${isCredit?'<i class="fas fa-plus"></i>':'<i class="fas fa-minus"></i>'}</div><div class="txn-info"><div class="txn-desc">${escapeHtml(t.description||t.type)}</div><div class="txn-time">${formatTimeAgo(t.timestamp)}</div></div><div class="txn-amt ${isCredit?'credit':'debit'}">${isCredit?'+':'-'}₹${Math.abs(t.amount)}</div></div>`;
  }).join('');
}
