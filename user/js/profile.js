// GrindX — user/js/profile.js
// ═══════════════ PROFILE EDIT ═══════════════
function fillEditProfile() {
  if (!userData) return;
  document.getElementById('editName').value = userData.name || '';
  document.getElementById('editUsername').value = userData.username || '';
  document.getElementById('editPhone').value = userData.phone || '';
  document.getElementById('editPic').value = userData.profilePic || '';
}

async function saveProfile() {
  const name = document.getElementById('editName').value.trim();
  const uname = document.getElementById('editUsername').value.trim();
  const phone = document.getElementById('editPhone').value.trim();
  const pic = document.getElementById('editPic').value.trim();
  if (!name || !uname) return toast('Name and username required', 'error');
  await db.ref('users/' + currentUser.uid).update({ name, username: uname.toLowerCase(), phone, profilePic: pic });
  toast('Profile updated!', 'success');
  navigateTo('profile');
}

// ═══════════════ MY MATCHES ═══════════════
async function loadMyMatches() {
  if (!currentUser) return;
  const snap = await db.ref('joinedTours/' + currentUser.uid).once('value');
  allMatches = [];
  if (snap.exists()) {
    const tIds = Object.keys(snap.val());
    await Promise.all(tIds.map(async id => {
      const tSnap = await db.ref('tournaments/' + id).once('value');
      if (tSnap.exists()) allMatches.push({ id, ...tSnap.val() });
    }));
  }
  allMatches.sort((a,b) => (b.time||0) - (a.time||0));
  showMatches('all');
}

function showMatches(filter, el) {
  if (el) {
    document.querySelectorAll('#my-matches .ftab').forEach(f => f.classList.remove('active'));
    el.classList.add('active');
  }
  const list = filter === 'all' ? allMatches : allMatches.filter(m => m.status === filter);
  const wrap = document.getElementById('matchesList');
  if (!list.length) { wrap.innerHTML = '<div class="empty-state"><i class="fas fa-gamepad"></i><p>No matches</p></div>'; return; }
  wrap.innerHTML = list.map(m => `<div class="match-card"><div class="match-hdr"><span>${escapeHtml(m.name||'Match')}</span><span class="match-badge ${m.status}">${m.status}</span></div><div><i class="fas fa-clock"></i> ${formatTime(m.time)} <i class="fas fa-ticket"></i> ${m.entryFee?'₹'+m.entryFee:'Free'}</div></div>`).join('');
}
