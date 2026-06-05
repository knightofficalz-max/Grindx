// GrindX — admin/js/content.js
// ═════ BANNERS & NOTES ═════
async function addBanner() {
  const url = document.getElementById('bannerUrl').value.trim();
  const order = parseInt(document.getElementById('bannerOrder').value) || 1;
  const active = document.getElementById('bannerActive').checked;
  if (!url) { toast('Enter image URL', 'error'); return; }
  await db.ref('banners').push({ image: url, order, active, createdAt: Date.now() });
  document.getElementById('bannerUrl').value = '';
  addLog('system', 'Banner added');
  toast('Banner added!', 'success');
  loadBanners();
}

async function addNote() {
  const text = document.getElementById('noteText').value.trim();
  if (!text) { toast('Enter note text', 'error'); return; }
  await db.ref('notes').push({ text, createdAt: Date.now() });
  document.getElementById('noteText').value = '';
  addLog('system', 'Note added');
  toast('Note added!', 'success');
  loadBanners();
}

async function loadBanners() {
  const bSnap = await db.ref('banners').orderByChild('order').once('value');
  const tb = document.getElementById('bannersTbody');
  if (!bSnap.exists()) {
    tb.innerHTML = '<tr><td colspan="5">No banners</td></tr>';
  } else {
    const rows = [];
    bSnap.forEach(b => rows.push({ id: b.key, ...b.val() }));
    tb.innerHTML = rows.map(b => `
      <tr>
        <td><img src="${escapeHtml(b.image)}" style="width:80px;height:40px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'"></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis"><a href="${escapeHtml(b.image)}" target="_blank" style="color:var(--info)">${escapeHtml(b.image)}</a></td>
        <td>${b.order||1}</td>
        <td><span class="badge ${b.active?'badge-green':'badge-red'}">${b.active?'Active':'Hidden'}</span></td>
        <td><button class="btn btn-danger btn-xs" data-action="deleteBanner" data-id="${b.id}"><i class="fas fa-trash"></i></button></td>
      </tr>`).join('');
  }

  const nSnap = await db.ref('notes').once('value');
  const nl = document.getElementById('notesList');
  if (!nSnap.exists()) {
    nl.innerHTML = '<div style="padding:16px;color:var(--txt3);font-size:13px">No notes</div>';
  } else {
    const notes = [];
    nSnap.forEach(n => notes.push({ id: n.key, ...n.val() }));
    nl.innerHTML = notes.reverse().map(n => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border)">
        <div style="flex:1;font-size:13px">${escapeHtml(n.text||'—')}</div>
        <span style="font-size:11px;color:var(--txt3)">${formatDate(n.createdAt)}</span>
        <button class="btn btn-danger btn-xs" data-action="deleteNote" data-id="${n.id}"><i class="fas fa-trash"></i></button>
      </div>`).join('');
  }
}

async function deleteBanner(id) { if(confirm('Delete banner?')){ await db.ref('banners/'+id).remove(); toast('Deleted','success'); loadBanners(); } }
async function deleteNote(id)   { if(confirm('Delete note?')){ await db.ref('notes/'+id).remove(); toast('Deleted','success'); loadBanners(); } }

// ═════ GAMES & MODES ═════
async function addGame() {
  const name = document.getElementById('gameName').value.trim();
  const image = document.getElementById('gameImage').value.trim();
  const active = document.getElementById('gameActive').checked;
  if (!name) { toast('Enter game name', 'error'); return; }
  await db.ref('games').push({ name, image, active, createdAt: Date.now() });
  document.getElementById('gameName').value = '';
  document.getElementById('gameImage').value = '';
  toast('Game added!', 'success');
  loadGamesAdmin();
}

async function addMode() {
  const gameId = document.getElementById('modeGameId').value;
  const name = document.getElementById('modeName').value.trim();
  const image = document.getElementById('modeImage').value.trim();
  const type = document.getElementById('modeType').value;
  const active = document.getElementById('modeActive').checked;
  if (!gameId || !name || !image) { toast('Game, name and image required', 'error'); return; }
  await db.ref('modes').push({ gameId, name, image, type, active, createdAt: Date.now() });
  document.getElementById('modeName').value = '';
  document.getElementById('modeImage').value = '';
  toast('Mode added!', 'success');
  loadGamesAdmin();
}

async function loadGamesAdmin() {
  const gSnap = await db.ref('games').once('value');
  const mSnap = await db.ref('modes').once('value');
  const gl = document.getElementById('gamesList');
  const ml = document.getElementById('modesList');
  const mGSel = document.getElementById('modeGameId');

  if (!gSnap.exists()) {
    gl.innerHTML = '<div style="padding:16px;color:var(--txt3)">No games</div>';
  } else {
    const games = [];
    gSnap.forEach(g => games.push({ id: g.key, ...g.val() }));
    if (mGSel) {
      mGSel.innerHTML = '<option value="">Select Game</option>';
      games.forEach(g => mGSel.innerHTML += `<option value="${g.id}">${escapeHtml(g.name)}</option>`);
    }
    gl.innerHTML = games.map(g => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
        ${g.image?`<img src="${escapeHtml(g.image)}" style="width:36px;height:36px;border-radius:6px;object-fit:cover">`:'<div style="width:36px;height:36px;background:var(--card-lt);border-radius:6px;display:flex;align-items:center;justify-content:center">🎮</div>'}
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${escapeHtml(g.name)}</div><span class="badge ${g.active?'badge-green':'badge-red'}" style="font-size:10px">${g.active?'Active':'Hidden'}</span></div>
        <button class="btn btn-danger btn-xs" data-action="deleteGame" data-id="${g.id}"><i class="fas fa-trash"></i></button>
      </div>`).join('');
  }

  if (!mSnap.exists()) {
    ml.innerHTML = '<div style="padding:16px;color:var(--txt3)">No modes</div>';
  } else {
    const modes = [];
    mSnap.forEach(m => modes.push({ id: m.key, ...m.val() }));
    ml.innerHTML = modes.map(m => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
        <img src="${escapeHtml(m.image||'')}" style="width:36px;height:36px;border-radius:6px;object-fit:cover" onerror="this.style.display='none'">
        <div style="flex:1"><div style="font-size:13px;font-weight:700">${escapeHtml(m.name)}</div><div style="font-size:11px;color:var(--txt3)">${m.gameId||'—'} · ${m.type||'—'}</div></div>
        <span class="badge ${m.active?'badge-green':'badge-red'}" style="font-size:10px">${m.active?'Active':'Hidden'}</span>
        <button class="btn btn-danger btn-xs" data-action="deleteMode" data-id="${m.id}"><i class="fas fa-trash"></i></button>
      </div>`).join('');
  }
}

async function deleteGame(id) { if(confirm('Delete game?')){ await db.ref('games/'+id).remove(); toast('Deleted','success'); loadGamesAdmin(); } }
async function deleteMode(id) { if(confirm('Delete mode?')){ await db.ref('modes/'+id).remove(); toast('Deleted','success'); loadGamesAdmin(); } }

// ═════ TUTORIALS ═════
async function addTutorial() {
  const title = document.getElementById('tutTitle').value.trim();
  const desc = document.getElementById('tutDesc').value.trim();
  const image = document.getElementById('tutImage').value.trim();
  const link = document.getElementById('tutLink').value.trim();
  if (!title || !link) { toast('Title and link required', 'error'); return; }
  await db.ref('tutorials').push({ title, description: desc, image, link, createdAt: Date.now() });
  document.getElementById('tutTitle').value = '';
  document.getElementById('tutDesc').value = '';
  document.getElementById('tutImage').value = '';
  document.getElementById('tutLink').value = '';
  toast('Tutorial added!', 'success');
  loadTutorialsAdmin();
}

async function loadTutorialsAdmin() {
  const snap = await db.ref('tutorials').once('value');
  const el = document.getElementById('tutList');
  if (!snap.exists()) {
    el.innerHTML = '<div style="padding:16px;color:var(--txt3)">No tutorials</div>';
    return;
  }
  const list = []; snap.forEach(t => list.push({ id: t.key, ...t.val() }));
  el.innerHTML = list.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
      ${t.image?`<img src="${escapeHtml(t.image)}" style="width:56px;height:36px;object-fit:cover;border-radius:6px">`:'<div style="width:56px;height:36px;background:var(--card-lt);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--txt3)">▶</div>'}
      <div style="flex:1"><div style="font-size:13px;font-weight:700">${escapeHtml(t.title)}</div><div style="font-size:11px;color:var(--txt3)">${escapeHtml(t.description||'—')}</div></div>
      <a href="${escapeHtml(t.link)}" target="_blank" class="btn btn-outline btn-xs"><i class="fas fa-external-link"></i></a>
      <button class="btn btn-danger btn-xs" data-action="deleteTutorial" data-id="${t.id}"><i class="fas fa-trash"></i></button>
    </div>`).join('');
}

async function deleteTutorial(id) { if(confirm('Delete tutorial?')){ await db.ref('tutorials/'+id).remove(); toast('Deleted','success'); loadTutorialsAdmin(); } }
