// admin.js
import { fb as _fb } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form    = document.getElementById("formLogin");
const emailEl = document.getElementById("email");
const passEl  = document.getElementById("senha");
const btnEntrar  = document.getElementById("btnEntrar");
const btnMostrar = document.getElementById("btnMostrar");
const btnReset   = document.getElementById("btnReset");
const btnSair    = document.getElementById("btnSair");
const msg     = document.getElementById("msg");
const panel   = document.getElementById("panel");
const who     = document.getElementById("who");

function setMsg(t, k){ msg.textContent = t || ""; msg.className = "feedback " + (k||""); }
function setLoading(on){ btnEntrar.disabled = on; btnEntrar.textContent = on ? "Entrando..." : "Entrar"; }

btnMostrar.addEventListener("click", ()=>{
  const isPwd = passEl.type === "password";
  passEl.type = isPwd ? "text" : "password";
  btnMostrar.textContent = isPwd ? "Ocultar senha" : "Mostrar senha";
});

btnReset.addEventListener("click", async ()=>{
  const email = emailEl.value.trim();
  if(!email){ setMsg("Informe seu e-mail para enviar o link de redefinição.", "erro"); return; }
  try{
    await sendPasswordResetEmail(_fb.auth, email);
    setMsg("Enviamos um link de redefinição para o seu e-mail.", "ok");
  }catch(e){
    setMsg(e?.message || "Não foi possível enviar o link de redefinição.", "erro");
  }
});

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  setMsg("", ""); setLoading(true);
  try{
    const email = emailEl.value.trim();
    const senha = passEl.value;
    const cred  = await signInWithEmailAndPassword(_fb.auth, email, senha);
    const user  = cred.user;

    await checkAdmin(user); // pode lançar erro de permissão
    setMsg("Login realizado com sucesso.", "ok");
    afterLogin(user);
  }catch(e){
    console.error(e?.code, e?.message);
    if (e?.code === "permission-denied") {
      setMsg("Permissão negada ao ler /admins. Verifique: 1) App Check OFF em App Check → APIs → Cloud Firestore; 2) Regras publicadas; 3) Documento admins/{UID} existe.", "erro");
    } else if (e?.message === "NAO_ADMIN") {
      setMsg("Seu usuário não é administrador. Peça para criarem admins/{seu UID} no Firestore.", "erro");
    } else {
      setMsg(e?.message || "Erro ao entrar.", "erro");
    }
    setLoading(false);
  }
});

async function checkAdmin(user){
  const ref  = _fb.doc(_fb.db, "admins", user.uid);
  try{
    const snap = await _fb.getDoc(ref);
    if(!snap.exists()) throw new Error("NAO_ADMIN");
  }catch(err){
    throw err; // deixa subir pro handler acima
  }
}

btnSair?.addEventListener("click", async ()=>{ await signOut(_fb.auth); });

onAuthStateChanged(_fb.auth, async (user)=>{
  if(user){
    try{
      await checkAdmin(user);
      afterLogin(user);
      return;
    }catch{}
  }
  panel.classList.remove("on");
  form.style.display = "block";
  setLoading(false);
});

function afterLogin(user){
  who.textContent = `Logado como: ${user.email}`;
  panel.classList.add("on");
  form.style.display = "none";
  setLoading(false);
}
