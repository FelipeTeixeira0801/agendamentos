// admin.js — login centrado no tema dark e checagem de admin
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

function setMsg(text, type){ msg.textContent = text || ""; msg.className = "feedback " + (type || ""); }
function setLoading(on){
  btnEntrar.disabled = on;
  btnEntrar.textContent = on ? "Entrando..." : "Entrar";
}

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
  setMsg("", "");
  setLoading(true);
  try{
    const email = emailEl.value.trim();
    const senha = passEl.value;
    const cred  = await signInWithEmailAndPassword(_fb.auth, email, senha);
    const user  = cred.user;

    // Checa se o UID consta na coleção admins
    const ref  = _fb.doc(_fb.db, "admins", user.uid);
    const snap = await _fb.getDoc(ref);

    if(!snap.exists()){
      await signOut(_fb.auth);
      setLoading(false);
      setMsg("Seu usuário não é administrador. Peça acesso ao proprietário (criar admins/{uid} no Firestore).", "erro");
      return;
    }

    setMsg("Login realizado com sucesso.", "ok");
    afterLogin(user);
  }catch(e){
    setLoading(false);
    setMsg(e?.message || "Erro ao entrar.", "erro");
  }
});

btnSair?.addEventListener("click", async ()=>{
  await signOut(_fb.auth);
});

onAuthStateChanged(_fb.auth, async (user)=>{
  if(user){
    // Se recarregar a página e já estiver logado, validamos admin novamente
    try{
      const ref  = _fb.doc(_fb.db, "admins", user.uid);
      const snap = await _fb.getDoc(ref);
      if(snap.exists()){
        afterLogin(user);
        return;
      }
    }catch{}
  }
  // estado não logado
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
