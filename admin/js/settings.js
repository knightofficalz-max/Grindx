// GrindX — admin/js/settings.js
// ═════ SETTINGS ═════
async function loadSettings() {
  const snap = await db.ref('settings').once('value');
  const s = snap.val() || {};
  document.getElementById('backendUrl').value = s.backendUrl || '';
  document.getElementById('maintToggle').checked = s.maintenance || false;
  document.getElementById('maintMsg').value = s.maintenanceMsg || '';
  document.getElementById('minDeposit').value = s.minDeposit || 10;
  document.getElementById('maxDeposit').value = s.maxDeposit || 50000;
  document.getElementById('minWithdraw').value = s.minWithdraw || 100;
  document.getElementById('maxWithdraw').value = s.maxWithdraw || 10000;
  document.getElementById('signupBonus').value = s.signupBonus || 0;
  document.getElementById('referralBonus').value = s.referralBonus || 50;
  document.getElementById('referredBonus').value = s.referredBonus || 25;
  document.getElementById('supportEmail').value = s.supportEmail || '';
  document.getElementById('supportWA').value = s.supportWhatsapp || '';
  const sl = s.socialLinks || {};
  document.getElementById('socInsta').value = sl.instagram || '';
  document.getElementById('socYT').value = sl.youtube || '';
  document.getElementById('socDiscord').value = sl.discord || '';
  document.getElementById('socTG').value = sl.telegram || '';
  document.getElementById('socTW').value = sl.twitter || '';
  const ss = await db.ref('siteStats').once('value');
  const st = ss.val() || {};
  document.getElementById('statPlayers').value = st.players || 0;
  document.getElementById('statTournaments').value = st.tournaments || 0;
  document.getElementById('statPaidOut').value = st.paidOut || 0;
  const ps = s.policies || {};
  document.getElementById('policyContent').value = ps[currentPolicyTab] || '';
}

async function saveSetting(type) {
  try {
    switch (type) {
      case 'backendUrl': {
        const url = document.getElementById('backendUrl').value.trim().replace(/\/$/, '');
        if (!url) return toast('Enter a valid URL', 'error');
        await db.ref('settings').update({ backendUrl: url });
        break;
      }
      case 'maintenance':
      case 'maintenanceMsg':
        await db.ref('settings').update({
          maintenance: document.getElementById('maintToggle').checked,
          maintenanceMsg: document.getElementById('maintMsg').value.trim()
        });
        break;
      case 'wallet':
        await db.ref('settings').update({
          minDeposit: parseFloat(document.getElementById('minDeposit').value)||10,
          maxDeposit: parseFloat(document.getElementById('maxDeposit').value)||50000,
          minWithdraw: parseFloat(document.getElementById('minWithdraw').value)||100,
          maxWithdraw: parseFloat(document.getElementById('maxWithdraw').value)||10000,
          signupBonus: parseFloat(document.getElementById('signupBonus').value)||0
        });
        break;
      case 'referral':
        await db.ref('settings').update({
          referralBonus: parseFloat(document.getElementById('referralBonus').value)||50,
          referredBonus: parseFloat(document.getElementById('referredBonus').value)||25
        });
        break;
      case 'support':
        await db.ref('settings').update({
          supportEmail: document.getElementById('supportEmail').value.trim(),
          supportWhatsapp: document.getElementById('supportWA').value.trim()
        });
        break;
      case 'social':
        await db.ref('settings/socialLinks').set({
          instagram: document.getElementById('socInsta').value.trim(),
          youtube: document.getElementById('socYT').value.trim(),
          discord: document.getElementById('socDiscord').value.trim(),
          telegram: document.getElementById('socTG').value.trim(),
          twitter: document.getElementById('socTW').value.trim()
        });
        break;
      case 'siteStats':
        await db.ref('siteStats').set({
          players: parseInt(document.getElementById('statPlayers').value)||0,
          tournaments: parseInt(document.getElementById('statTournaments').value)||0,
          paidOut: parseInt(document.getElementById('statPaidOut').value)||0
        });
        break;
    }
    toast('Saved!', 'success');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
}

function switchPolicyTab(tab) {
  currentPolicyTab = tab;
  document.querySelectorAll('#page-settings .tabs .tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  db.ref('settings/policies/' + tab).once('value').then(snap => {
    document.getElementById('policyContent').value = snap.val() || '';
  });
}

async function savePolicy() {
  const content = document.getElementById('policyContent').value;
  await db.ref('settings/policies/' + currentPolicyTab).set(content);
  toast(currentPolicyTab + ' policy saved!', 'success');
}
