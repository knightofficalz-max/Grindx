// GrindX — user/js/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyDZ_yzyejcKkHx_6NB1gaEYfCB2fxyoeJM",
  authDomain: "grindx-officalz.firebaseapp.com",
  databaseURL: "https://grindx-officalz-default-rtdb.firebaseio.com",
  projectId: "grindx-officalz",
  storageBucket: "grindx-officalz.firebasestorage.app",
  messagingSenderId: "686976018871",
  appId: "1:686976018871:web:fe06a9ca83dbd241142032"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ─── Dynamic Backend URL (set by admin in Settings) ───────────────────────────
let _backendUrl = null;
let _backendResolvers = [];
let _backendFetched = false;

db.ref('settings/backendUrl').once('value').then(snap => {
  _backendUrl = (snap.val() || '').replace(/\/$/, '');
  _backendFetched = true;
  _backendResolvers.forEach(r => r(_backendUrl));
  _backendResolvers = [];
}).catch(() => {
  _backendFetched = true;
  _backendResolvers.forEach(r => r(''));
  _backendResolvers = [];
});

function getBackend() {
  if (_backendFetched) return Promise.resolve(_backendUrl);
  return new Promise(r => _backendResolvers.push(r));
}
