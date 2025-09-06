// firebase-init.js
// Carregado via: <script type="module" src="./firebase-init.js"></script>

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction,
  serverTimestamp, collection, query, where, getDocs, orderBy,
  onSnapshot, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * 🔧 COLE AQUI O SEU CONFIG (copiado do Console do Firebase)
 * Exemplo de formato:
 * const firebaseConfig = {
 *   apiKey: "AIz...suachave...",
 *   authDomain: "seu-projeto.firebaseapp.com",
 *   projectId: "seu-projeto",
 *   storageBucket: "seu-projeto.appspot.com",
 *   messagingSenderId: "1234567890",
 *   appId: "1:1234567890:web:abcdef123456"
 * };
 */
const firebaseConfig = {
  apiKey: "COLE_SUA_API_KEY_AQUI",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "XXXXXXXXXXXX",
  appId: "1:XXXXXXXXXXXX:web:YYYYYYYYYYYYYY"
};

// Ajuda de diagnóstico para o erro auth/api-key-not-valid
if (!firebaseConfig?.apiKey || firebaseConfig.apiKey.includes("COLE_SUA_API_KEY_AQUI")) {
  console.error(
    "Firebase: faltando firebaseConfig válido em firebase-init.js (ex.: auth/api-key-not-valid). " +
    "Pegue o bloco correto em: Configurações do projeto → Seus apps → Web (</>) → Configuração do SDK."
  );
}

// Evita inicializar duas vezes se a página importar este arquivo mais de uma vez
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Logs úteis (veja n
