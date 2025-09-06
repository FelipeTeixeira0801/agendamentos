// firebase-init.js
// Este arquivo inicializa o Firebase e EXPORTA "fb".
// Use em outros arquivos: import { fb } from "./firebase-init.js";

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction,
  serverTimestamp, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// ⚠️ SEU CONFIG (do console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyByfdSzd0h0wYGMb7FJZx6zP49wQiUJOng",
  authDomain: "agendamentos-barbearia-3751c.firebaseapp.com",
  projectId: "agendamentos-barbearia-3751c",
  storageBucket: "agendamentos-barbearia-3751c.firebasestorage.app",
  messagingSenderId: "424272717220",
  appId: "1:424272717220:web:0dccca71524c361fbe8d31",
  measurementId: "G-TYB71WR997"
};

// Evita inicializar 2x
const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Monta um helper único para o resto do site
export const fb = {
  app, auth, db,
  // Auth
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  // Firestore
  doc, getDoc, setDoc, runTransaction, serverTimestamp,
  collection, query, where, getDocs, orderBy, onSnapshot, updateDoc, deleteDoc
};

// (opcional) também deixa global para quem já usava window._fb
window._fb = fb;
