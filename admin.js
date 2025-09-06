// admin.js — ENTRA SEM CHECAR /admins
import { fb as _fb } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const form = document.getElementById("formLogin");
const emailEl = document.getElementById("email");
const passEl  = document.getElementById("senha");
const btnEntrar = document.getElementById("btnEntrar");
const btnMostrar= document.getElementById("btnMostrar");
const btnReset  = document.getElementById("btnReset");
const btnSair   = document.getElementById("btnSair");
const msg   = document.getElementById("msg");
const panel = document.getElementById("panel");
const who   = document.getElementById("who");

function setMsg(t,k){ msg.textContent=t||""; msg.className="feedback "+(k||""); }
function setLoading(on){ btnEntrar.disabled=on; btnEntrar.textContent=on?"Entrando...":"Entrar"; }

btnMostrar.addEventListener("click", ()=>{
  const s = passEl.type==="password"; passEl.type = s?"text":"password";
  btnMostrar.textContent = s?"Ocultar senha":"Mostrar senha";
});
btnReset.addEventListener("click", async ()=>{
  const email = emailEl.value.trim();
  if(!email){ setMsg("Informe seu e-mail para enviar o link.", "erro"); return; }
  try{ await sendPasswordResetEmail(_fb.auth, email); setMsg("Link enviado.", "ok"); }
  catch(e){ setMsg(e?.message || "Falhou ao enviar o link.", "erro"); }
});

form.addEventListener("submit", async (e)=>{
  e.preventDefault(); setMsg(""); setLoading(true);
  try{
    const cred = await signInWithEmailAndPassword(_fb.auth, emailEl.value.trim(), passEl.value);
    afterLogin(cred.user); // << sem checar admins/{uid}
  }catch(e){ setMsg(e?.message || "Erro ao entrar.", "erro"); }
  setLoading(false);
});
btnSair?.addEventListener("click", async ()=>{ await signOut(_fb.auth); });

onAuthStateChanged(_fb.auth, (user)=>{
  if(user){ afterLogin(user); return; }
  panel.classList.remove("on"); form.style.display="block"; setLoading(false);
});

function afterLogin(user){
  who.textContent = `Logado como: ${user.email}`;
  panel.classList.add("on"); form.style.display="none"; setLoading(false);
}
