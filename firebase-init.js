// firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction, 
  serverTimestamp, collection, query, where, getDocs, orderBy, 
  onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔧 COLE SEU CONFIG AQUI (do Firebase Console)
const firebaseConfig = {
  apiKey: "SUA_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Deixa acessível aos outros arquivos
window._fb = {
  app, auth, db,
  signInWithEmailAndPassword, onAuthStateChanged, signOut,
  doc, getDoc, setDoc, runTransaction, serverTimestamp,
  collection, query, where, getDocs, orderBy, onSnapshot, updateDoc, deleteDoc
};
