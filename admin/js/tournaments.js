// GrindX — admin/js/tournaments.js
// ═════ TOURNAMENTS ═════
function getTotalPrize(t) {
  if (t.prizes) return Object.values(t.prizes).reduce((s,v) => s + (v||0), 0);
  return t.prize || 0;
}

function renderTournaments() {
  const q = (document.getElementById('tourSearch')?.value || '').toLowerCase();
  const status = document.getElementById('tourStatusFilter')?.value || '';
  let list = allTours.filter(t =>
    (!q || (t.name||'').toLowerCase().includes(q)) &&
    (!status || t.status === status)
  );
  const { sliced, totalPages } = paginate(list, 'tours');
  const tb = document.getElementById('toursTbody');
  if (!sliced.length) {
    tb.innerHTML = '<div class="tour-empty"><i class="fas fa-trophy"></i><p>No tournaments found</p></div>';
  } else {
    const statusColor = { upcoming:'#facc15', live:'#4ade80', completed:'#60a5fa', cancelled:'#f87171' };
    const typeColor   = { Solo:'#a78bfa', Duo:'#34d399', Squad:'#fb923c' };
    tb.innerHTML = sliced.map(t => {
      const prize = getTotalPrize(t);
      const slotsLeft = (t.slots||0) - (t.joinedCount||0);
      const pct = t.slots ? Math.round((t.joinedCount||0)/t.slots*100) : 0;
      return `
      <div class="tour-card">
        <div class="tour-card-banner" style="background-image:url('${t.banner||''}')">
          ${t.banner ? '' : '<div class="tour-card-banner-placeholder"><i class="fas fa-trophy"></i></div>'}
          <div class="tour-card-badges">
            <span class="tour-badge" style="background:${typeColor[t.matchType]||'#a78bfa'}">${escapeHtml(t.matchType||'Solo')}</span>
            ${t.gameId ? `<span class="tour-badge" style="background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.2)">${escapeHtml(t.gameId)}</span>` : ''}
          </div>
          <div class="tour-card-status" style="background:${statusColor[t.status]||'#60a5fa'};color:#000">${(t.status||'upcoming').toUpperCase()}</div>
        </div>
        <div class="tour-card-body">
          <div class="tour-card-title">${escapeHtml(t.name||'—')}</div>
          <div class="tour-card-time"><i class="fas fa-clock"></i> ${formatDate(t.time)}</div>
          <div class="tour-card-stats">
            <div class="tour-stat">
              <div class="tour-stat-label">PRIZE POOL</div>
              <div class="tour-stat-val" style="color:var(--p)">₹${prize}</div>
            </div>
            <div class="tour-stat">
              <div class="tour-stat-label">ENTRY</div>
              <div class="tour-stat-val">${t.entryFee ? '₹'+t.entryFee : '<span style="color:#4ade80">FREE</span>'}</div>
            </div>
            ${t.perKill ? `<div class="tour-stat"><div class="tour-stat-label">PER KILL</div><div class="tour-stat-val">₹${t.perKill}</div></div>` : ''}
          </div>
          <div class="tour-slots-row">
            <span style="font-size:11px;color:var(--txt3)">${t.joinedCount||0}/${t.slots||0} joined</span>
            <span style="font-size:11px;color:${slotsLeft<=5?'#f87171':'var(--txt3)'}">${slotsLeft} left</span>
          </div>
          <div class="tour-progress"><div class="tour-progress-fill" style="width:${pct}%"></div></div>
          <div class="tour-card-actions">
            <button class="btn btn-outline btn-xs" data-action="editTournament" data-id="${t.id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-success btn-xs" data-action="openParticipants" data-id="${t.id}"><i class="fas fa-users"></i> Players</button>
            ${t.status==='upcoming'||t.status==='live' ? `<button class="btn btn-warn btn-xs" data-action="openResultModal" data-id="${t.id}"><i class="fas fa-flag-checkered"></i> Results</button>` : ''}
            ${t.status!=='cancelled'&&t.status!=='completed' ? `<button class="btn btn-danger btn-xs" data-action="openCancelTour" data-id="${t.id}"><i class="fas fa-ban"></i></button>` : ''}
          </div>
        </div>
      </div>`;
    }).join('');
  }
  renderPagination('tours', totalPages);
}

// ── Tournament Form ──
function resetTourForm() {
  ['tName','tSlots','tEntry','tBanner','tRules','tRoomId','tRoomPass','tPerKill'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('tTime').value = '';
  document.getElementById('tStatus').value = 'upcoming';
  document.getElementById('tPerKillToggle').checked = false;
  document.getElementById('perKillWrap').style.display = 'none';
  document.getElementById('prizeInputs').innerHTML = '';
  document.getElementById('prizeCount').textContent = '0';
  for (let i=1; i<=3; i++) addPrizeRow();
}

async function loadTourFormGames() {
  const snap = await db.ref('games').once('value');
  const gSel = document.getElementById('tGame');
  const mGSel = document.getElementById('modeGameId');
  gSel.innerHTML = '<option value="">Select Game</option>';
  if (mGSel) mGSel.innerHTML = '<option value="">Select Game</option>';
  if (snap.exists()) snap.forEach(g => {
    const d = g.val(); if (!d.active) return;
    gSel.innerHTML += `<option value="${g.key}">${escapeHtml(d.name)}</option>`;
    if (mGSel) mGSel.innerHTML += `<option value="${g.key}">${escapeHtml(d.name)}</option>`;
  });
  gSel.onchange = async function() {
    const snap2 = await db.ref('modes').orderByChild('gameId').equalTo(this.value).once('value');
    const modeSel = document.getElementById('tMode');
    modeSel.innerHTML = '<option value="">Select Mode</option>';
    if (snap2.exists()) snap2.forEach(m => {
      const d = m.val(); if (d.active) modeSel.innerHTML += `<option value="${m.key}">${escapeHtml(d.name)}</option>`;
    });
  };
}

function addPrizeRow() {
  const wrap = document.getElementById('prizeInputs');
  const count = wrap.children.length + 1;
  const div = document.createElement('div');
  div.className = 'prize-row-input';
  div.dataset.pos = count;
  const medals = {1:'🥇',2:'🥈',3:'🥉'};
  div.innerHTML = `<label>${medals[count]||'#'+count}</label><input type="number" placeholder="₹0" min="0" value="0" data-pos="${count}">`;
  wrap.appendChild(div);
  document.getElementById('prizeCount').textContent = count;
}

function removePrizeRow() {
  const wrap = document.getElementById('prizeInputs');
  if (wrap.children.length > 1) {
    wrap.removeChild(wrap.lastChild);
    document.getElementById('prizeCount').textContent = wrap.children.length;
  }
}

function togglePerKill() {
  document.getElementById('perKillWrap').style.display = document.getElementById('tPerKillToggle').checked ? 'block' : 'none';
}

async function saveTournament() {
  const name = document.getElementById('tName').value.trim();
  const gameId = document.getElementById('tGame').value;
  const modeId = document.getElementById('tMode').value;
  const matchType = document.getElementById('tMatchType').value;
  const slots = parseInt(document.getElementById('tSlots').value);
  const entry = parseFloat(document.getElementById('tEntry').value) || 0;
  const timeVal = document.getElementById('tTime').value;
  const banner = document.getElementById('tBanner').value.trim();
  const rules = document.getElementById('tRules').value.trim();
  const roomId = document.getElementById('tRoomId').value.trim();
  const roomPass = document.getElementById('tRoomPass').value.trim();
  const status = document.getElementById('tStatus').value;
  const perKill = document.getElementById('tPerKillToggle').checked ? (parseFloat(document.getElementById('tPerKill').value)||0) : 0;

  if (!name || !gameId || !slots || !timeVal) { toast('Fill all required fields', 'error'); return; }

  const prizes = {};
  document.querySelectorAll('#prizeInputs .prize-row-input input').forEach(inp => {
    const v = parseFloat(inp.value)||0;
    if (v > 0) prizes[inp.dataset.pos] = v;
  });

  const data = {
    name, gameId, modeId, matchType, slots, entryFee: entry,
    time: new Date(timeVal).getTime(), banner, rules, roomId, roomPass,
    status, prizes, perKill, joinedCount: 0, createdAt: Date.now()
  };

  const btn = document.getElementById('saveTourBtn');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving...';

  try {
    if (currentTourEdit) {
      await db.ref('tournaments/' + currentTourEdit).update({ ...data, joinedCount: undefined, createdAt: undefined });
      addLog('tournament', `Tournament updated: ${name}`);
      toast('Tournament updated!', 'success');
    } else {
      const ref = await db.ref('tournaments').push(data);
      addLog('tournament', `Tournament created: ${name} (ID: ${ref.key})`);
      toast('Tournament created!', 'success');
    }
    showPage('tournaments');
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  } finally {
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save Tournament';
  }
}

function editTournament(id) {
  const t = allTours.find(t => t.id === id);
  if (!t) return;
  currentTourEdit = id;
  document.getElementById('tourFormTitle').textContent = 'Edit Tournament';
  showPage('createTour');
  setTimeout(async () => {
    await loadTourFormGames();
    document.getElementById('tName').value = t.name||'';
    document.getElementById('tGame').value = t.gameId||'';
    document.getElementById('tGame').dispatchEvent(new Event('change'));
    setTimeout(() => { document.getElementById('tMode').value = t.modeId||''; }, 300);
    document.getElementById('tMatchType').value = t.matchType||'Solo';
    document.getElementById('tSlots').value = t.slots||'';
    document.getElementById('tEntry').value = t.entryFee||0;
    if (t.time) document.getElementById('tTime').value = new Date(t.time).toISOString().slice(0,16);
    document.getElementById('tBanner').value = t.banner||'';
    document.getElementById('tRules').value = t.rules||'';
    document.getElementById('tRoomId').value = t.roomId||'';
    document.getElementById('tRoomPass').value = t.roomPass||'';
    document.getElementById('tStatus').value = t.status||'upcoming';
    document.getElementById('prizeInputs').innerHTML = '';
    if (t.prizes) {
      Object.entries(t.prizes).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).forEach(([pos,amt]) => {
        addPrizeRow();
        const inputs = document.querySelectorAll('#prizeInputs .prize-row-input input');
        inputs[inputs.length-1].value = amt;
      });
    } else { for (let i=0;i<3;i++) addPrizeRow(); }
    if (t.perKill) {
      document.getElementById('tPerKillToggle').checked = true;
      document.getElementById('perKillWrap').style.display = 'block';
      document.getElementById('tPerKill').value = t.perKill;
    }
  }, 100);
}

// ── Participants ──
async function openParticipants(tourId) {
  const snap = await db.ref('tournaments/' + tourId + '/participants').once('value');
  const list = [];
  if (snap.exists()) snap.forEach(p => list.push({ uid: p.key, ...p.val() }));
  document.getElementById('partCount').textContent = list.length + ' participants';
  const tb = document.getElementById('partTbody');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="5">No participants yet</td></tr>';
  } else {
    tb.innerHTML = list.map((p,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${p.uid.slice(0,8)}...</td>
        <td>${escapeHtml(p.username||'—')}</td>
        <td>${escapeHtml(p.gameUid||'—')}</td>
        <td>${formatDate(p.joinedAt)}</td>
      </tr>`).join('');
  }
  openModal('participantsModal');
}

// ── Result Entry ──
async function openResultModal(tourId) {
  const t = allTours.find(t => t.id === tourId);
  if (!t) return;
  if (t.resultsSubmitted) { toast('Results already submitted', 'error'); return; }
  const snap = await db.ref('tournaments/' + tourId + '/participants').once('value');
  const participants = [];
  if (snap.exists()) snap.forEach(p => participants.push({ uid: p.key, ...p.val() }));
  if (!participants.length) { toast('No participants', 'error'); return; }
  document.getElementById('resultEntries').dataset.tourId = tourId;
  document.getElementById('resultEntries').innerHTML = participants.map(p => `
    <div class="result-entry">
      <div class="result-entry-hdr">
        <div style="font-size:18px">🎮</div>
        <div class="result-entry-name">${escapeHtml(p.username||p.uid.slice(0,10))} <span style="color:var(--txt3);font-size:11px">${escapeHtml(p.gameUid||'')}</span></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Position</label><input class="form-control" type="number" min="1" data-uid="${p.uid}" data-field="position"></div>
        <div class="form-group"><label class="form-label">Kills</label><input class="form-control" type="number" min="0" value="0" data-uid="${p.uid}" data-field="kills"></div>
      </div>
    </div>`).join('');
  openModal('resultModal');
}

async function submitResults() {
  const wrap = document.getElementById('resultEntries');
  const tourId = wrap.dataset.tourId;
  const t = allTours.find(t => t.id === tourId);
  if (!t) return;
  if (t.resultsSubmitted) { toast('Already submitted', 'error'); return; }

  const results = {};
  wrap.querySelectorAll('[data-field="position"]').forEach(inp => {
    const uid = inp.dataset.uid;
    if (!results[uid]) results[uid] = {};
    results[uid].position = parseInt(inp.value)||0;
    results[uid].username = '';
  });
  wrap.querySelectorAll('[data-field="kills"]').forEach(inp => {
    const uid = inp.dataset.uid;
    if (!results[uid]) results[uid] = {};
    results[uid].kills = parseInt(inp.value)||0;
  });

  const positions = Object.values(results).map(r=>r.position).filter(p=>p>0);
  const unique = new Set(positions);
  if (unique.size !== positions.length) { toast('Duplicate positions found', 'error'); return; }

  const prizes = t.prizes || {};
  const perKill = t.perKill || 0;

  const partSnap = await db.ref('tournaments/' + tourId + '/participants').once('value');
  if (partSnap.exists()) {
    partSnap.forEach(p => {
      if (results[p.key]) results[p.key].username = p.val().username || p.key.slice(0,8);
    });
  }

  for (const [uid, r] of Object.entries(results)) {
    const prizeAmt = prizes[r.position] || 0;
    const killAmt = r.kills * perKill;
    r.winning = prizeAmt + killAmt;
    results[uid] = r;

    if (r.winning > 0) {
      try {
        await db.ref('users/' + uid).transaction(u => {
          if (!u) return u;
          u.winningBal = (u.winningBal || 0) + r.winning;
          u.lifetimeEarnings = (u.lifetimeEarnings || 0) + r.winning;
          u.totalWon = (u.totalWon || 0) + 1;
          return u;
        });
        const prizeTxnId = 'txn_' + uid + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
        const prizeTxnData = {
          userId: uid, type: 'winning', amount: r.winning,
          description: `Prize: ${t.name} (Pos #${r.position}, ${r.kills} kills)`,
          status: 'success', tourId, timestamp: Date.now()
        };
        await db.ref('transactions/' + prizeTxnId).set(prizeTxnData);
        await db.ref('userTransactions/' + uid + '/' + prizeTxnId).set(prizeTxnData);
        await db.ref('notifications/' + uid + '/notif_' + Date.now()).set({
          title: '🏆 You Won!',
          message: `Position #${r.position} in ${t.name}. ₹${r.winning} credited.`,
          type: 'tournament', read: false, createdAt: Date.now()
        });
      } catch (e) { console.error('Failed to process winning for', uid, e); }
    }
  }

  await db.ref('tournaments/' + tourId).update({ results, status: 'completed', resultsSubmitted: true });
  addLog('tournament', `Results submitted for: ${t.name}`);
  closeModal('resultModal');
  toast('Results submitted & wallets credited!', 'success');
}

// ── Cancel Tournament ──
function openCancelTour(id) {
  document.getElementById('cancelTourId').value = id;
  openModal('cancelTourModal');
}

async function confirmCancelTour() {
  const id = document.getElementById('cancelTourId').value;
  const t = allTours.find(t => t.id === id);
  if (!t) return;

  try {
    const snap = await db.ref('tournaments/' + id + '/participants').once('value');
    if (snap.exists() && t.entryFee > 0) {
      const refunds = [];
      snap.forEach(p => refunds.push({ uid: p.key, ...p.val() }));
      for (const p of refunds) {
        await db.ref('users/' + p.uid).transaction(u => {
          if (!u) return u;
          u.depositBal = (u.depositBal||0) + (t.entryFee||0);
          return u;
        });
        await db.ref('notifications/' + p.uid + '/notif_' + Date.now()).set({
          title: '💸 Refund Issued',
          message: `Tournament "${t.name}" cancelled. ₹${t.entryFee} refunded.`,
          type: 'payment', read: false, createdAt: Date.now()
        });
      }
    }
    await db.ref('tournaments/' + id + '/status').set('cancelled');
    addLog('tournament', `Tournament cancelled: ${t.name} — ${t.joinedCount||0} refunds issued`);
    closeModal('cancelTourModal');
    toast('Tournament cancelled & fees refunded!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}