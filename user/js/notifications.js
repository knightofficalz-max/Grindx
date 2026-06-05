// GrindX — user/js/notifications.js
// ═══════════════ NOTIFICATIONS ═══════════════
async function loadNotifPage() {
  if (!currentUser) return;
  const snap = await db.ref('notifications/' + currentUser.uid).orderByChild('createdAt').once('value');
  const list = [];
  if (snap.exists()) snap.forEach(n => list.push({ id: n.key, ...n.val() }));
  list.reverse();
  const el = document.getElementById('notifList');
  if (!list.length) { el.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>No notifications</p></div>'; return; }
  el.innerHTML = list.map(n => `<div class="notif-item ${n.read?'':'unread'}" data-action="markRead" data-id="${n.id}"><div class="notif-ico" style="background:var(--card-lt)">${getNotifIcon(n.type)}</div><div class="notif-body"><div class="notif-title">${escapeHtml(n.title)}</div><div class="notif-msg">${escapeHtml(n.message)}</div><div class="notif-time">${formatTimeAgo(n.createdAt)}</div></div></div>`).join('');
}

function getNotifIcon(type) { const m = { payment:'<i class="fas fa-credit-card"></i>', tournament:'<i class="fas fa-gamepad"></i>', bonus:'<i class="fas fa-gift"></i>', referral:'<i class="fas fa-users"></i>', withdrawal:'<i class="fas fa-arrow-up"></i>', system:'<i class="fas fa-bell"></i>' }; return m[type] || '<i class="fas fa-bell"></i>'; }

function markRead(id) { if (currentUser) db.ref(`notifications/${currentUser.uid}/${id}/read`).set(true); }

function markAllRead() {
  if (!currentUser) return;
  db.ref('notifications/' + currentUser.uid).once('value').then(snap => {
    if (!snap.exists()) return;
    const upd = {};
    snap.forEach(n => upd[n.key + '/read'] = true);
    db.ref('notifications/' + currentUser.uid).update(upd);
  });
}

// ═══════════════ NOTIFICATION BADGE ═══════════════
function loadNotifBadge(uid) {
  db.ref('notifications/' + uid).on('value', snap => {
    let unread = 0;
    if (snap.exists()) snap.forEach(n => { if (!n.val().read) unread++; });
    document.querySelectorAll('.notif-badge').forEach(b => {
      b.textContent = unread > 9 ? '9+' : unread;
      b.style.display = unread > 0 ? 'flex' : 'none';
    });
  });
}
