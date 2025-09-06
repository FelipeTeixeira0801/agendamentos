// firebase-init.js
// Carregado via: <script type="module" src="./firebase-init.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction,
  serverTimestamp, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/** SEU CONFIG (copiado do Console > Configurações do projeto > Web (</>) ) */
const firebaseConfig = {
  apiKey: "AIzaSyByfdSzd0h0wYGMb7FJZx6zP49wQiUJOng",
  authDomain: "agendamentos-barbearia-3751c.firebaseapp.com",
  projectId: "agendamentos-barbearia-3751c",
  storageBucket: "agendamentos-barbearia-3751c.firebasestorage.app",
  messagingSenderId: "424272717220",
  appId: "1:424272717220:web:0dccca71524c361fbe8d31",
  measurementId: "G-TYB71WR997"
};

// Evita inicializar duas vezes
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Exporta tudo o que o client usa
export const fb = {
  app, auth, db,
  serverTimestamp, Timestamp,      // <<-- Timestamp incluído
  collection, query, where, getDocs, orderBy,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  runTransaction, onSnapshot
};
