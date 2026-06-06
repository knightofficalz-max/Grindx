// GrindX — user/js/wallet.js
// ═══════════════ WALLET & TRANSACTIONS ═══════════════
function openAddMoneyModal() { document.getElementById('addAmt').value = ''; document.getElementById('addMoneyModal').classList.add('active'); }
function openWithdrawModal() { document.getElementById('wdAmt').value = ''; document.getElementById('wdUpi').value = ''; document.getElementById('wdName').value = ''; document.getElementById('availWithdraw').textContent = '₹' + (userData?.winningBal || 0).toFixed(0); document.getElementById('withdrawModal').classList.add('active'); }

async function processPayment() {
  if (!currentUser) return toast('Login required', 'error');
  const amt = parseFloat(document.getElementById('addAmt').value);
  if (!amt || amt < 10) return toast('Minimum deposit is ₹10', 'error');

  // Check payment mode from settings
  const settSnap = await db.ref('settings').once('value');
  const sett = settSnap.val() || {};
  const mode = sett.paymentMode || 'gateway';

  if (mode === 'manual') {
    showManualUpiModal(amt, sett);
    return;
  }
  if (mode === 'both') {
    showPaymentChoiceModal(amt, sett);
    return;
  }

  // Gateway flow
  await processGatewayPayment(amt);
}

function showManualUpiModal(amt, sett) {
  const upiId   = sett.manualUpiId || '';
  const upiName = sett.manualUpiName || 'GrindX';
  const txnRef  = 'GX' + currentUser.uid.slice(0,6).toUpperCase() + '_' + Date.now();
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${amt}&cu=INR&tn=${txnRef}`;
  const qrUrl   = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;

  const modal = document.getElementById('addMoneyModal');
  modal.querySelector('.modal-body').innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:13px;color:var(--txt2);margin-bottom:12px">Scan & pay ₹${amt} to complete deposit</div>
      <img src="${qrUrl}" style="width:180px;height:180px;border-radius:10px;border:2px solid var(--p);margin-bottom:12px">
      <div style="font-size:13px;font-weight:700;margin-bottom:4px">${upiId}</div>
      <div style="font-size:11px;color:var(--txt3);margin-bottom:14px">Ref: ${txnRef}</div>
      <a href="${upiLink}" class="btn btn-primary" style="display:block;margin-bottom:10px;text-decoration:none">
        <i class="fas fa-mobile-alt"></i> Open UPI App
      </a>
      <div style="font-size:11px;color:var(--txt3);margin-bottom:12px">After payment, enter UTR/Transaction ID below</div>
      <input class="form-control" id="manualUtrInput" placeholder="Enter UTR / Transaction ID" style="margin-bottom:10px">
      <button class="btn btn-success" style="width:100%" onclick="submitManualDeposit('${txnRef}',${amt})">
        <i class="fas fa-check"></i> Submit for Verification
      </button>
    </div>
  `;
}

async function submitManualDeposit(txnRef, amt) {
  const utr = document.getElementById('manualUtrInput')?.value.trim();
  if (!utr) return toast('Enter UTR / Transaction ID', 'error');
  try {
    await db.ref('manualDeposits/' + txnRef).set({
      userId: currentUser.uid,
      amount: amt,
      utr,
      txnRef,
      status: 'pending',
      timestamp: Date.now()
    });
    document.getElementById('addMoneyModal').classList.remove('active');
    toast('Submitted! Admin will verify within 30 mins.', 'success');
  } catch(e) { toast(e.message, 'error'); }
}

function showPaymentChoiceModal(amt, sett) {
  const modal = document.getElementById('addMoneyModal');
  modal.querySelector('.modal-body').innerHTML = `
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:14px;font-weight:700;margin-bottom:16px">Choose Payment Method</div>
      <button class="btn btn-primary" style="width:100%;margin-bottom:10px" onclick="processGatewayPayment(${amt})">
        <i class="fas fa-bolt"></i> Pay via Gateway (Instant)
      </button>
      <button class="btn btn-outline" style="width:100%" onclick="showManualUpiModal(${amt}, ${JSON.stringify(sett).replace(/"/g,'&quot;')})">
        <i class="fas fa-qrcode"></i> Pay via UPI QR (Manual)
      </button>
    </div>
  `;
}

async function processGatewayPayment(amt) {
  const btn = document.querySelector('[data-action="processPayment"]');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>'; }
  try {
    const BACKEND = await getBackend();
    const res = await fetch(`${BACKEND}/api/zapupi-order`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.uid, amount: amt, userEmail: currentUser.email, userName: userData?.name })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Payment failed');
    if (data.paymentUrl) window.location.href = data.paymentUrl;
    else toast('Payment link generated. Check your UPI app.', 'success');
  } catch (e) {
    toast(e.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-lock"></i> Proceed to Payment'; }
  }
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
