// GrindX — user/js/home.js
// ═══════════════ GAMES & MODES ═══════════════
async function loadGames() {
  const row = document.getElementById('gamesRow');
  row.innerHTML = '<div class="game-card loading"></div><div class="game-card loading"></div><div class="game-card loading"></div><div class="game-card loading"></div>';
  try {
    const snap = await db.ref('games').once('value');
    row.innerHTML = '';
    if (!snap.exists()) {
      row.innerHTML = '<div class="game-card empty"><i class="fas fa-gamepad"></i></div>';
      return;
    }
    snap.forEach(g => {
      const d = g.val();
      if (!d.active) return;
      const card = document.createElement('div');
      card.className = 'game-card';
      card.dataset.gameId = g.key;
      card.dataset.gameName = d.name;
      card.addEventListener('click', () => selectGame(g.key, d.name));
      const img = document.createElement('img');
      img.src = d.image || '';
      img.alt = d.name;
      img.loading = 'lazy';
      img.onerror = () => { card.innerHTML = '<i class="fas fa-gamepad" style="font-size:32px;color:var(--txt3)"></i>'; };
      card.appendChild(img);
      row.appendChild(card);
    });
  } catch (e) { row.innerHTML = '<div class="game-card empty">Error loading games</div>'; }
}

function selectGame(id, name) {
  currentGameId = id;
  document.getElementById('modeGameTitle').textContent = name;
  navigateTo('modes');
  loadModes(id);
}

async function loadModes(gameId) {
  const grid = document.getElementById('modesGrid');
  grid.innerHTML = '';
  try {
    const snap = await db.ref('modes').orderByChild('gameId').equalTo(gameId).once('value');
    if (!snap.exists()) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:span 3"><i class="fas fa-exclamation-circle"></i><p>No modes available</p></div>';
      return;
    }
    snap.forEach(m => {
      const d = m.val();
      if (!d.active) return;
      const card = document.createElement('div');
      card.className = 'mode-card';
      card.dataset.modeId = m.key;
      card.dataset.modeName = d.name;
      card.addEventListener('click', () => selectMode(m.key, d.name));
      const img = document.createElement('img');
      img.src = d.image || '';
      img.alt = d.name;
      img.loading = 'lazy';
      img.onerror = () => { img.src = 'data:image/svg+xml;base64,...'; };
      card.appendChild(img);
      grid.appendChild(card);
    });
  } catch (e) {}
}

function selectMode(id, name) {
  currentModeId = id;
  document.getElementById('tourPageTitle').textContent = name + ' Tournaments';
  navigateTo('game-tournaments');
  loadTournaments(currentGameId, id);
}

// ═══════════════ BANNERS & NOTES ═══════════════
async function loadBanners() {
  const snap = await db.ref('banners').orderByChild('order').once('value');
  banners = [];
  if (snap.exists()) snap.forEach(b => { const d = b.val(); if (d.active) banners.push(d); });
  const wrap = document.getElementById('bannerWrap');
  if (!banners.length) return;
  wrap.innerHTML = banners.map((b,i) => `<div class="banner-slide ${i===0?'active':''}"><img src="${escapeHtml(b.image)}" alt=""></div>`).join('');
  if (banners.length > 1) {
    let idx = 0;
    const dots = banners.map((_,i) => `<div class="banner-dot ${i===0?'active':''}"></div>`).join('');
    wrap.innerHTML += `<div class="banner-dots">${dots}</div>`;
    bannerTimer = setInterval(() => {
      idx = (idx + 1) % banners.length;
      wrap.querySelectorAll('.banner-slide').forEach((s, j) => s.classList.toggle('active', j === idx));
      wrap.querySelectorAll('.banner-dot').forEach((d, j) => d.classList.toggle('active', j === idx));
    }, 3500);
  }
}

async function loadNotes() {
  const snap = await db.ref('notes').once('value');
  notes = [];
  if (snap.exists()) snap.forEach(n => notes.push(n.val().text));
  if (!notes.length) { document.getElementById('notesTxt').textContent = 'Welcome to GRINDX!'; return; }
  let idx = 0;
  const showNote = (i) => { document.getElementById('notesTxt').textContent = notes[i]; };
  showNote(0);
  noteTimer = setInterval(() => { idx = (idx + 1) % notes.length; showNote(idx); }, 4000);
}

async function loadSiteStats() {
  const snap = await db.ref('siteStats').once('value');
  const s = snap.val() || {};
  document.getElementById('statPlayers').textContent = formatNum(s.players || 0);
  document.getElementById('statTournaments').textContent = formatNum(s.tournaments || 0);
  document.getElementById('statPrize').textContent = '₹' + formatNum(s.paidOut || 0);
}
