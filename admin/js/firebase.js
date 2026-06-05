// GrindX — admin/js/firebase.js
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
const BACKEND = "https://grindx-backend-taupe.vercel.app";
