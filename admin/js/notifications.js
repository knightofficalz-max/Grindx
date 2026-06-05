// GrindX — admin/js/notifications.js
// ═════ NOTIFICATIONS ═════
function toggleNotifTarget() {
  const val = document.getElementById('notifTarget').value;
  document.getElementById('notifUserWrap').style.display = val === 'user' ? 'block' : 'none';
}

function updateNotifPreview() {
  document.getElementById('npTitle').textContent = document.getElementById('notifTitle').value || 'Notification Title';
  document.getElementById('npBody').textContent = document.getElementById('notifMsg').value || 'Your message will appear here...';
}
document.getElementById('notifTitle').addEventListener('input', updateNotifPreview);
document.getElementById('notifMsg').addEventListener('input', updateNotifPreview);

async function sendNotification() {
  const target = document.getElementById('notifTarget').value;
  const title = document.getElementById('notifTitle').value.trim();
  const msg = document.getElementById('notifMsg').value.trim();
  const type = document.getElementById('notifType').value;
  if (!title || !msg) { toast('Fill title and message', 'error'); return; }

  try {
    const notifData = { title, message: msg, type, read: false, createdAt: Date.now(), sentBy: adminUser.uid };

    if (target === 'all') {
      const snap = await db.ref('users').once('value');
      const updates = {};
      if (snap.exists()) snap.forEach(u => {
        updates[`notifications/${u.key}/notif_${Date.now()}_${Math.random().toString(36).slice(2,6)}`] = notifData;
      });
      await db.ref().update(updates);
      toast(`Notification sent to ${Object.keys(updates).length} users!`, 'success');
    } else {
      const userId = document.getElementById('notifUserId').value.trim();
      if (!userId) { toast('Enter user ID', 'error'); return; }
      let uid = userId;
      if (!uid.includes('-') && uid.length < 20) {
        const snap = await db.ref('users').orderByChild('username').equalTo(uid).once('value');
        if (snap.exists()) uid = Object.keys(snap.val())[0];
      }
      await db.ref(`notifications/${uid}/notif_${Date.now()}`).set(notifData);
      toast('Notification sent!', 'success');
    }
    await db.ref('sentNotifications/' + Date.now()).set({ target, title, message: msg, type, sentBy: adminUser.uid, sentAt: Date.now() });
    addLog('system', `Push notification sent: "${title}" → ${target}`);
    document.getElementById('notifTitle').value = '';
    document.getElementById('notifMsg').value = '';
    updateNotifPreview();
    loadSentNotifs();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function loadSentNotifs() {
  const snap = await db.ref('sentNotifications').orderByKey().limitToLast(10).once('value');
  const el = document.getElementById('sentNotifs');
  if (!snap.exists()) {
    el.innerHTML = '<div class="empty"><i class="fas fa-bell-slash"></i><p>No notifications sent</p></div>';
    return;
  }
  const list = []; snap.forEach(n => list.push(n.val())); list.reverse();
  el.innerHTML = list.map(n => `
    <div class="log-item">
      <div class="log-dot" style="background:var(--p)"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${escapeHtml(n.title)}</div>
        <div style="font-size:11px;color:var(--txt3)">${n.target==='all'?'All users':'Specific user'} · ${formatDate(n.sentAt)}</div>
      </div>
    </div>`).join('');
}
