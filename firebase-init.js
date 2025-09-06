// firebase-init.js
// Inclua nos HTMLs com: <script type="module" src="./firebase-init.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction,
  serverTimestamp, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
// (Opcional) Analytics — não é necessário para login/Firestore
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyByfdSzd0h0wYGMb7FJZx6zP49wQiUJOng",
  authDomain: "agendamentos-barbearia-3751c.firebaseapp.com",
  projectId: "agendamentos-barbearia-3751c",
  storageBucket: "agendamentos-barbearia-3751c.firebasestorage.app",
  messagingSenderId: "424272717220",
  appId: "1:424272717220:web:0dccca71524c361fbe8d31",
  measurementId: "G-TYB71WR997"
};

// Evita múltiplas inicializações
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // opcional
const auth = getAuth(app);
const db   = getFirestore(app);

// Expõe para client.js e admin.js
window._fb = {
  app, auth, db,
  // Auth
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  // Firestore
  doc, getDoc, setDoc, runTransaction, serverTimestamp,
  collection, query, where, getDocs, orderBy, onSnapshot, updateDoc, deleteDoc
};
