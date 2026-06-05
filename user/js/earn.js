// GrindX — user/js/earn.js
// ═══════════════ REFERRAL ═══════════════
async function loadReferralPage() {
  const snap = await db.ref('settings').once('value');
  const s = snap.val() || {};
  document.getElementById('refEarnAmt').textContent = '₹'+(s.referralBonus||50);
  document.getElementById('refFriendAmt').textContent = '₹'+(s.referredBonus||25);
}

function copyRefCode() {
  const code = userData?.myRefCode || '';
  if (!code) return;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(() => toast('Copied!', 'success')).catch(() => fallbackCopy(code));
  } else {
    fallbackCopy(code);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Copied!', 'success'); } catch(e) { toast('Copy failed', 'error'); }
  document.body.removeChild(ta);
}

function shareRef(platform) {
  const code = userData?.myRefCode || '';
  const msg = `Join GRINDX and win real money! Use my referral code ${code} and get bonus on first deposit.`;
  const url = encodeURIComponent(msg);
  const links = {
    whatsapp: `https://wa.me/?text=${url}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${url}`,
    twitter: `https://twitter.com/intent/tweet?text=${url}`
  };
  if (platform === 'copy') { fallbackCopy(msg + ' ' + window.location.origin); return; }
  window.open(links[platform], '_blank', 'noopener,noreferrer');
}

// ═══════════════ LUCKY DRAW ═══════════════
async function initLuckyDraw() {
  const snap = await db.ref('luckyDrawPrizes').once('value');
  ldPrizes = [];
  if (snap.exists()) snap.forEach(p => ldPrizes.push(p.val()));
  else ldPrizes = [
    { label: '₹5', type: 'cash', value: 5 }, { label: '₹10', type: 'cash', value: 10 },
    { label: '₹2', type: 'cash', value: 2 }, { label: 'Try Again', type: 'none', value: 0 },
    { label: '₹20', type: 'cash', value: 20 }, { label: '₹1', type: 'cash', value: 1 },
    { label: '₹50', type: 'cash', value: 50 }, { label: 'Try Again', type: 'none', value: 0 }
  ];
  drawLdWheel();
  checkLdCooldown();
  loadLdHistory();
}

function drawLdWheel() {
  const canvas = document.getElementById('ldCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 130, cy = 130, r = 126, n = ldPrizes.length, arc = (2 * Math.PI) / n;
  const colors = ['#22c55e', '#6d28d9', '#f87171', '#fbbf24', '#60a5fa', '#a78bfa', '#34d399', '#fb923c'];
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, i * arc, (i + 1) * arc);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(i * arc + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Poppins';
    ctx.fillText(ldPrizes[i].label, r - 10, 5);
    ctx.restore();
  }
}

async function checkLdCooldown() {
  if (!currentUser) return;
  const snap = await db.ref(`ldCooldown/${currentUser.uid}`).once('value');
  const btn = document.getElementById('ldSpinBtn');
  if (!snap.exists()) { btn.disabled = false; return; }
  const last = snap.val() || 0, now = Date.now(), diff = 24*60*60*1000 - (now - last);
  if (diff > 0) {
    btn.disabled = true;
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    document.getElementById('ldCooldownTxt').textContent = `Next spin in: ${h}h ${m}m ${s}s`;
    setTimeout(checkLdCooldown, 1000);
  } else {
    btn.disabled = false;
    document.getElementById('ldCooldownTxt').textContent = '1 free spin per 24 hours';
  }
}

async function spinWheel() {
  if (ldSpinning || !currentUser) return;
  ldSpinning = true;
  const btn = document.getElementById('ldSpinBtn');
  btn.disabled = true;
  const idx = Math.floor(Math.random() * ldPrizes.length);
  const prize = ldPrizes[idx];
  const n = ldPrizes.length, arc = 360 / n;
  const targetAngle = 3600 - (idx * arc + arc / 2) + Math.floor(Math.random() * arc);
  document.getElementById('ldCanvas').style.transform = `rotate(${targetAngle}deg)`;
  setTimeout(async () => {
    ldSpinning = false;
    await db.ref(`ldCooldown/${currentUser.uid}`).set(Date.now());
    if (prize.type === 'cash' && prize.value > 0) {
      await db.ref('users/' + currentUser.uid + '/bonusBal').transaction(b => (b||0) + prize.value);
      await db.ref(`ldHistory/${currentUser.uid}/spin_${Date.now()}`).set({ label: prize.label, value: prize.value, type: prize.type, timestamp: Date.now() });
    } else {
      await db.ref(`ldHistory/${currentUser.uid}/spin_${Date.now()}`).set({ label: prize.label, value: 0, type: 'none', timestamp: Date.now() });
    }
    showLdResult(prize.type === 'cash' ? '🎉' : '😢', prize.type === 'cash' ? 'You Won!' : 'Better Luck Next Time!', prize.type === 'cash' ? `₹${prize.value} added!` : 'Try again in 24h');
    loadLdHistory();
  }, 5200);
}

function showLdResult(icon, title, msg) {
  document.getElementById('ldResultIcon').textContent = icon;
  document.getElementById('ldResultTitle').textContent = title;
  document.getElementById('ldResultMsg').textContent = msg;
  document.getElementById('ldResult').style.display = 'flex';
}

async function loadLdHistory() {
  if (!currentUser) return;
  const snap = await db.ref('ldHistory/' + currentUser.uid).orderByChild('timestamp').limitToLast(5).once('value');
  const el = document.getElementById('ldHistory');
  if (!snap.exists()) { el.innerHTML = '<div class="empty-state"><p>No spins yet</p></div>'; return; }
  const list = [];
  snap.forEach(h => list.push(h.val()));
  list.reverse();
  el.innerHTML = list.map(h => `<div class="txn-item"><div class="txn-ico ${h.type==='cash'?'credit':'debit'}">${h.type==='cash'?'<i class="fas fa-dice"></i>':'<i class="fas fa-face-frown"></i>'}</div><div class="txn-info"><div class="txn-desc">${h.label}</div><div class="txn-time">${formatTimeAgo(h.timestamp)}</div></div><div class="txn-amt ${h.type==='cash'?'credit':'debit'}">${h.value?'+₹'+h.value:'—'}</div></div>`).join('');
}
