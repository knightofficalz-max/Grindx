// GrindX — user/js/support.js
// ═══════════════ ANNOUNCEMENTS, TUTORIALS, FOLLOW, FAQ, SUPPORT, PROMOS ═══════════════
async function loadAnnouncements() {
  const snap = await db.ref('notes').once('value');
  const el = document.getElementById('annList');
  if (!snap.exists()) { el.innerHTML = '<div class="empty-state"><i class="fas fa-bullhorn"></i><p>No announcements</p></div>'; return; }
  const list = [];
  snap.forEach(n => list.push({ id: n.key, ...n.val() }));
  el.innerHTML = list.reverse().map(n => `<div class="ann-item"><div class="ann-txt">${escapeHtml(n.text||n.message||'')}</div><div class="ann-time">${formatTimeAgo(n.createdAt||Date.now())}</div></div>`).join('');
}

async function loadTutorials() {
  const snap = await db.ref('tutorials').once('value');
  const el = document.getElementById('tutList');
  if (!snap.exists()) { el.innerHTML = '<div class="empty-state"><i class="fas fa-play-circle"></i><p>No tutorials</p></div>'; return; }
  el.innerHTML = '';
  snap.forEach(t => {
    const d = t.val();
    const card = document.createElement('div');
    card.className = 'card mb12';
    card.style.cursor = 'pointer';
    card.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><div style="width:80px;height:50px;border-radius:var(--r-xs);overflow:hidden;flex-shrink:0;background:var(--card-lt)">${d.image?`<img src="${escapeHtml(d.image)}" style="width:100%;height:100%;object-fit:cover">`:'<i class="fas fa-play" style="font-size:20px;color:var(--txt3);display:flex;height:100%;align-items:center;justify-content:center"></i>'}</div><div><div style="font-size:14px;font-weight:700;margin-bottom:4px">${escapeHtml(d.title)}</div><div style="font-size:12px;color:var(--txt3)">${escapeHtml(d.description||'')}</div></div></div>`;
    card.onclick = () => window.open(d.link, '_blank', 'noopener,noreferrer');
    el.appendChild(card);
  });
}

async function loadFollowUs() {
  const snap = await db.ref('settings/socialLinks').once('value');
  const el = document.getElementById('followList');
  const links = snap.val() || {};
  const platforms = [
    { key: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#e1306c' },
    { key: 'youtube', label: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000' },
    { key: 'discord', label: 'Discord', icon: 'fab fa-discord', color: '#5865f2' },
    { key: 'twitter', label: 'X (Twitter)', icon: 'fab fa-x-twitter', color: '#fff' },
    { key: 'telegram', label: 'Telegram', icon: 'fab fa-telegram', color: '#2ca5e0' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25d366' }
  ];
  el.innerHTML = platforms.map(p => links[p.key] ? `<a href="${links[p.key]}" target="_blank" rel="noopener" class="support-card mb12"><div class="pm-icon" style="background:rgba(255,255,255,.05);color:${p.color}"><i class="${p.icon}" style="font-size:20px"></i></div><div class="pm-label">${p.label}</div><i class="fas fa-external-link pm-arrow"></i></a>` : '').filter(Boolean).join('') || '<div class="empty-state"><i class="fas fa-share-nodes"></i><p>No social links</p></div>';
}

async function loadFaq() {
  const snap = await db.ref('faq').once('value');
  const el = document.getElementById('faqList');
  if (!snap.exists()) { el.innerHTML = '<div class="empty-state"><i class="fas fa-circle-question"></i><p>No FAQs</p></div>'; return; }
  el.innerHTML = '';
  snap.forEach(f => {
    const d = f.val();
    const item = document.createElement('div');
    item.className = 'ann-item mb12';
    item.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:14px;font-weight:700">${escapeHtml(d.q)}</div><i class="fas fa-chevron-down" style="color:var(--txt3)"></i></div><div class="faq-ans" style="display:none;font-size:13px;color:var(--txt2);margin-top:10px">${escapeHtml(d.a)}</div>`;
    item.onclick = function() { const ans = this.querySelector('.faq-ans'), ico = this.querySelector('i'); const open = ans.style.display === 'block'; ans.style.display = open ? 'none' : 'block'; ico.style.transform = open ? '' : 'rotate(180deg)'; };
    el.appendChild(item);
  });
}

async function loadSupport() {
  const snap = await db.ref('settings').once('value');
  const s = snap.val() || {};
  document.getElementById('supportEmail').textContent = s.supportEmail || 'support@grindx.in';
}

function openWA() {
  db.ref('settings/supportWhatsapp').once('value').then(snap => {
    const n = snap.val() || '';
    if (n) window.open(`https://wa.me/${n.replace(/\D/g,'')}?text=Hi, I need help with GRINDX.`, '_blank', 'noopener,noreferrer');
    else toast('WhatsApp not configured', 'error');
  });
}

function openEmail() {
  db.ref('settings/supportEmail').once('value').then(snap => {
    const e = snap.val() || 'support@grindx.in';
    window.location.href = `mailto:${e}?subject=GRINDX Support`;
  });
}

async function submitDispute() {
  const msg = document.getElementById('dispMsg').value.trim();
  if (!msg) return toast('Describe your issue', 'error');
  if (!currentUser) return toast('Login required', 'error');
  const tourId = document.getElementById('dispTourId').value.trim();
  await db.ref('disputes/' + Date.now()).set({ userId: currentUser.uid, username: userData?.username, tourId, message: msg, status: 'open', createdAt: Date.now() });
  await db.ref(`notifications/${currentUser.uid}/notif_${Date.now()}`).set({ title: 'Issue Reported', message: 'Your dispute has been submitted.', type: 'system', read: false, createdAt: Date.now() });
  document.getElementById('dispMsg').value = '';
  document.getElementById('dispTourId').value = '';
  toast('Issue submitted!', 'success');
}

async function loadPromos() {
  const snap = await db.ref('promotions').once('value');
  const el = document.getElementById('promoList');
  if (!snap.exists()) { el.innerHTML = '<div class="empty-state"><i class="fas fa-tag"></i><p>No active promotions</p></div>'; return; }
  el.innerHTML = '';
  snap.forEach(p => {
    const d = p.val();
    if (!d.active) return;
    const card = document.createElement('div');
    card.className = 'ann-item';
    card.innerHTML = `${d.image ? `<img src="${escapeHtml(d.image)}" style="width:100%;border-radius:var(--r-xs);margin-bottom:10px">` : ''}<div class="ann-txt">${escapeHtml(d.text||'')}</div>`;
    el.appendChild(card);
  });
}

// ═══════════════ LEGAL ═══════════════
async function openPolicy(type) {
  const titles = { terms: 'Terms & Conditions', privacy: 'Privacy Policy', refund: 'Refund Policy' };
  document.getElementById('policyTitle').textContent = titles[type] || 'Policy';
  const snap = await db.ref('settings/policies/' + type).once('value');
  document.getElementById('policyContent').innerHTML = snap.val() || '<i>Not available</i>';
  navigateTo('policyView');
}
