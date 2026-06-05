// GrindX — user/js/tournaments.js
// ═══════════════ TOURNAMENTS ═══════════════
async function loadTournaments(gameId, modeId) {
  const wrap = document.getElementById('toursListWrap');
  wrap.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';
  try {
    const snap = await db.ref('tournaments').once('value');
    allTours = [];
    if (snap.exists()) {
      snap.forEach(t => {
        const d = t.val();
        if (d.gameId === gameId && d.modeId === modeId && d.status === 'upcoming')
          allTours.push({ id: t.key, ...d });
      });
    }
    allTours.sort((a, b) => a.time - b.time);
    filteredTours = [...allTours];
    renderTours(filteredTours);
  } catch (e) { wrap.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load</p></div>'; }
}

function filterTours(type, el) {
  if (el) {
    document.querySelectorAll('#game-tournaments .ftab').forEach(f => f.classList.remove('active'));
    el.classList.add('active');
  }
  filteredTours = type === 'all' ? [...allTours] : allTours.filter(t => (t.matchType || '').toLowerCase() === type);
  renderTours(filteredTours);
}

function renderTours(list) {
  const wrap = document.getElementById('toursListWrap');
  if (!list.length) {
    wrap.innerHTML = '<div class="empty-state"><i class="fas fa-trophy"></i><p>No tournaments found</p></div>';
    return;
  }
  wrap.innerHTML = '';
  list.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tour-card';
    const prize = t.prizes ? Object.values(t.prizes).reduce((a, b) => a + (b || 0), 0) : (t.prize || 0);
    const slots = t.slots || 0, joined = t.joinedCount || 0;
    card.innerHTML = `<div class="tour-banner"><img src="${escapeHtml(t.banner||'')}" alt="${escapeHtml(t.name)}" onerror="this.parentElement.style.background='var(--card-lt)'"></div>
      <div class="tour-body">
        <div class="tour-title">${escapeHtml(t.name)}</div>
        <div class="tour-meta">
          <span class="tour-tag green"><i class="fas fa-gamepad"></i>${escapeHtml(t.matchType||'Solo')}</span>
          <span class="tour-tag purple"><i class="fas fa-clock"></i>${formatTime(t.time)}</span>
          <span class="tour-tag ${t.entryFee?'red':'green'}"><i class="fas fa-ticket"></i>${t.entryFee?'₹'+t.entryFee:'Free'}</span>
        </div>
        <div class="tour-footer">
          <div><div class="tour-prize">₹${prize}</div><div class="tour-slots">${joined}/${slots} joined</div></div>
          <button class="tour-join-btn ${joined>=slots?'full':''}" ${joined>=slots?'disabled':''}>${joined>=slots?'Full':'Join'}</button>
        </div>
      </div>`;
    card.addEventListener('click', () => viewTourDetails(t.id));
    wrap.appendChild(card);
  });
}

async function viewTourDetails(id) {
  const snap = await db.ref('tournaments/' + id).once('value');
  if (!snap.exists()) { toast('Tournament not found', 'error'); return; }
  currentTour = { id, ...snap.val() };
  renderTourDetails(currentTour);
  navigateTo('tournament-details');
}

async function renderTourDetails(t) {
  const wrap = document.getElementById('tourDetailInner');
  const now = Date.now();
  const roomVisible = t.time && (t.time - now) <= 10 * 60 * 1000;
  const isJoined = currentUser ? (await db.ref(`joinedTours/${currentUser.uid}/${t.id}`).once('value')).exists() : false;
  const slots = t.slots || 0, joined = t.joinedCount || 0, full = joined >= slots;
  let prizesHtml = '';
  if (t.prizes) {
    const sorted = Object.entries(t.prizes).filter(([,v]) => v > 0).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));
    prizesHtml = `<div class="prize-list">${sorted.map(([pos,amt]) => `<div class="prize-row"><div class="prize-pos">#${pos}</div><div class="prize-amt">₹${amt}</div></div>`).join('')}</div>`;
  }
  let roomHtml = '';
  if (isJoined && roomVisible && t.roomId) {
    roomHtml = `<div class="room-reveal"><i class="fas fa-door-open"></i><div>Room ID</div><div class="room-id">${escapeHtml(t.roomId)}</div>${t.roomPass ? `<div>Password</div><div class="room-pass">${escapeHtml(t.roomPass)}</div>` : ''}</div>`;
  }
  let resultHtml = '';
  if (t.status === 'completed' && t.results) {
    resultHtml = `<table class="result-table"><thead><tr><th>Player</th><th>Pos</th><th>Kills</th><th>Won</th></tr></thead><tbody>${Object.entries(t.results).map(([uid,r]) => `<tr><td>${escapeHtml(r.username||uid)}</td><td>${r.position||'—'}</td><td>${r.kills||0}</td><td style="color:var(--primary)">₹${r.winning||0}</td></tr>`).join('')}</tbody></table>`;
  }
  let joinHtml = '';
  if (t.status === 'upcoming') {
    if (isJoined) joinHtml = `<button class="btn btn-full" disabled><i class="fas fa-check"></i> Joined</button>`;
    else if (full) joinHtml = `<button class="btn btn-outline btn-full" disabled>Full</button>`;
    else joinHtml = `<button class="btn btn-primary btn-full" data-action="confirmJoinPrompt" data-tour-id="${t.id}" data-fee="${t.entryFee||0}">Join — ${t.entryFee ? '₹'+t.entryFee : 'Free'}</button>`;
  }
  wrap.innerHTML = `<div class="tour-detail-banner"><img src="${escapeHtml(t.banner||'')}" alt=""></div><div class="tour-detail-body"><h2>${escapeHtml(t.name)}</h2><div class="tour-meta">...</div>${prizesHtml}${roomHtml}${resultHtml}${joinHtml}</div>`;
  // Add listener for join button inside details
  const joinBtn = wrap.querySelector('[data-action="confirmJoinPrompt"]');
  if (joinBtn) {
    joinBtn.addEventListener('click', () => openJoinModal(joinBtn.dataset.tourId, joinBtn.dataset.fee));
  }
}

function openJoinModal(tourId, fee) {
  const total = (userData?.depositBal||0)+(userData?.winningBal||0)+(userData?.bonusBal||0);
  document.getElementById('joinFeeDisp').textContent = '₹'+fee;
  document.getElementById('joinBalDisp').textContent = '₹'+total.toFixed(0);
  document.getElementById('joinAfterDisp').textContent = '₹'+(total-fee).toFixed(0);
  document.getElementById('joinUid').value = userData?.gameUid || '';
  document.getElementById('joinConfirmBtn').dataset.tid = tourId;
  document.getElementById('joinConfirmBtn').dataset.fee = fee;
  document.getElementById('joinModal').classList.add('active');
}

async function confirmJoin() {
  const btn = document.getElementById('joinConfirmBtn');
  const tourId = btn.dataset.tid, fee = parseFloat(btn.dataset.fee||0);
  const gameUid = document.getElementById('joinUid').value.trim();
  if (!gameUid) { toast('Enter Game UID', 'error'); return; }
  if (!currentUser) return;
  const total = (userData?.depositBal||0)+(userData?.winningBal||0)+(userData?.bonusBal||0);
  if (total < fee) { toast('Insufficient balance', 'error'); document.getElementById('joinModal').classList.remove('active'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Joining...';
  try {
    const jSnap = await db.ref(`joinedTours/${currentUser.uid}/${tourId}`).once('value');
    if (jSnap.exists()) { toast('Already joined', 'error'); document.getElementById('joinModal').classList.remove('active'); return; }
    const tSnap = await db.ref('tournaments/' + tourId).once('value');
    const t = tSnap.val();
    if ((t.joinedCount||0) >= (t.slots||0)) { toast('Full', 'error'); document.getElementById('joinModal').classList.remove('active'); return; }
    await db.ref('users/' + currentUser.uid).transaction(u => {
      if (!u) return u;
      let rem = fee;
      const bonus = Math.min(u.bonusBal||0, rem);
      u.bonusBal = (u.bonusBal||0) - bonus; rem -= bonus;
      const dep = Math.min(u.depositBal||0, rem);
      u.depositBal = (u.depositBal||0) - dep; rem -= dep;
      u.winningBal = (u.winningBal||0) - rem;
      u.totalMatches = (u.totalMatches||0) + 1;
      return u;
    });
    await db.ref(`joinedTours/${currentUser.uid}/${tourId}`).set({ gameUid, joinedAt: Date.now() });
    await db.ref(`tournaments/${tourId}/participants/${currentUser.uid}`).set({ uid: currentUser.uid, username: userData?.username, gameUid, joinedAt: Date.now() });
    await db.ref(`tournaments/${tourId}/joinedCount`).transaction(c => (c||0)+1);
    toast('Joined!', 'success');
    document.getElementById('joinModal').classList.remove('active');
    await renderTourDetails({ id: tourId, ...t });
  } catch (e) { toast('Error: '+e.message, 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirm & Join'; }
}
