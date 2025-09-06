// firebase-init.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction,
  serverTimestamp, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// App Check (opcional, deixe comentado até registrar a site key):
// import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-check.js";

const firebaseConfig = {
  apiKey: "AIzaSyByfdSzd0h0wYGMb7FJZx6zP49wQiUJOng",
  authDomain: "agendamentos-barbearia-3751c.firebaseapp.com",
  projectId: "agendamentos-barbearia-3751c",
  storageBucket: "agendamentos-barbearia-3751c.firebasestorage.app",
  messagingSenderId: "424272717220",
  appId: "1:424272717220:web:0dccca71524c361fbe8d31",
  measurementId: "G-TYB71WR997"
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// // Ative só depois de registrar a site key no App Check (aba Apps):
// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("SUA_SITE_KEY_AQUI"),
//   isTokenAutoRefreshEnabled: true
// });

export const fb = {
  app, auth, db,
  serverTimestamp, Timestamp,
  collection, query, where, getDocs, orderBy,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  runTransaction, onSnapshot
};
