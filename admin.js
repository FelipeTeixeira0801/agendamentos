// admin.js — login com mensagens visíveis e debug
import { fb as _fb } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const $ = (s)=>document.querySelector(s);

// UI
const loginCard = $("#loginCard");
const panel = $("#panel");
const msg = $("#msg");
const who = $("#who");

const form = $("#formLogin");
const emailEl = $("#email");
const passEl  = $("#senha");
const btnEntrar = $("#btnEntrar");
const btnMostrar = $("#btnMostrar");
const btnReset = $("#btnReset");
const btnSair = $("#btnSair");

// lista/painel
const admDate = $("#admDate");
const prevDay = $("#prevDay");
const nextDay = $("#nextDay");
const btnHoje = $("#btnHoje");
const list = $("#list");
const listaMsg = $("#listaMsg");
const statusFilter = $("#statusFilter");

let unsub = null;
let cacheRows = [];

function setMsg(t,k){ if(!msg) return; msg.textContent=t||""; msg.className="feedback "+(k||""); }
function setLoading(on){ if(!btnEntrar) return; btnEntrar.disabled=on; btnEntrar.textContent=on?"Entrando...":"Entrar"; }

// DEBUG global
window.__admDEBUG = true;
function log(...a){ if(window.__admDEBUG) console.log("[ADM]", ...a); }

// Protege a página: se algo quebrar, mostramos
window.addEventListener("unhandledrejection", (e)=>{ setMsg(e?.reason?.message || "Erro inesperado.", "erro"); });
window.addEventListener("error", (e)=>{ setMsg(e?.message || "Erro de script.", "erro"); });

// Botões do login
btnMostrar?.addEventListener("click", ()=>{
  if (!passEl) return;
  const isPwd = passEl.type==="password";
  passEl.type = isPwd ? "text" : "password";
  btnMostrar.textContent = isPwd ? "Ocultar senha" : "Mostrar senha";
});
btnReset?.addEventListener("click", async ()=>{
  const email = emailEl?.value?.trim();
  if(!email){ setMsg("Informe seu e-mail para enviar o link.", "erro"); return; }
  try{ await sendPasswordResetEmail(_fb.auth, email); setMsg("Link enviado.", "ok"); }
  catch(e){ setMsg(describeError(e), "erro"); }
});

// Submit
form?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  setMsg(""); setLoading(true);
  try{
    const email = emailEl?.value?.trim();
    const senha = passEl?.value || "";
    if (!email || !senha) { setMsg("Preencha e-mail e senha.", "erro"); setLoading(false); return; }
    log("signInWithEmailAndPassword", email);
    const cred = await signInWithEmailAndPassword(_fb.auth, email, senha);
    afterLogin(cred.user);
  }catch(e){
    console.error(e);
    setMsg(describeError(e), "erro");
  }
  setLoading(false);
});

btnSair?.addEventListener("click", async ()=>{ await signOut(_fb.auth); });

// Auth state
onAuthStateChanged(_fb.auth, (user)=>{
  log("auth state:", user?.uid);
  if(user){ afterLogin(user); return; }
  if (unsub) { unsub(); unsub = null; }
  panel.style.display="none";
  loginCard.style.display="block";
  setLoading(false);
});

// Painel
function afterLogin(user){
  who.textContent = `Logado como: ${user.email}`;
  loginCard.style.display="none";
  panel.style.display="block";

  admDate.value = toISODate(new Date());
  prevDay.onclick = ()=> moveDay(-1);
  nextDay.onclick = ()=> moveDay(+1);
  btnHoje.onclick = ()=> { admDate.value = toISODate(new Date()); updateQuery(); };
  admDate.onchange = updateQuery;
  statusFilter.onchange = render;

  updateQuery();
}

function moveDay(delta){
  const d = new Date(admDate.value);
  d.setDate(d.getDate()+delta);
  admDate.value = toISODate(d);
  updateQuery();
}
function toISODate(d){ return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }

function updateQuery(){
  if (unsub) { unsub(); unsub = null; }
  const dateStr = admDate.value;
  log("loading bookings for", dateStr);

  const q = _fb.query(
    _fb.collection(_fb.db, "bookings"),
    _fb.where("date","==", dateStr)
  );

  unsub = _fb.onSnapshot(q, (snap)=>{
    cacheRows = [];
    snap.forEach(doc => cacheRows.push({ id: doc.id, ...doc.data() }));
    render();
  }, (err)=>{
    console.error("onSnapshot error", err);
    list.innerHTML = "";
    listaMsg.textContent = "Não foi possível carregar os agendamentos (verifique App Check/Regras).";
  });
}

function render(){
  const f = statusFilter.value;
  let rows = cacheRows.slice();
  rows.sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  if (f!=="all") rows = rows.filter(r => r.status===f);

  if (!rows.length){
    list.innerHTML = "";
    listaMsg.textContent = "Sem agendamentos para este filtro.";
    return;
  }
  listaMsg.textContent = "";
  list.innerHTML = "";

  for (const r of rows){
    const it = document.createElement("div");
    it.className = "rowItem";
    const services = Array.isArray(r.servicesLabels)? r.servicesLabels.join(", ") : (Array.isArray(r.services)? r.services.join(", ") : "");
    const statusClass = r.status==="confirmed"?"confirmed":(r.status==="canceled"?"canceled":"pending");

    const top = document.createElement("div");
    top.className = "top";
    top.innerHTML = `
      <div>
        <div class="name">${esc(r.name||"-")} <span class="muted">• ${esc(r.phone||"-")}</span></div>
        <div class="muted">${r.date||""} às ${r.time||""} ${services?`• ${esc(services)}`:""}</div>
      </div>
      <div class="chips">
        <span class="chip ${statusClass}">${r.status||"?"}</span>
        <span class="chip">Total: R$ ${(Number(r.totalPrice||0)).toFixed(2).replace(".",",")}</span>
      </div>
    `;

    const act = document.createElement("div");
    act.className = "actions";
    act.append(
      btn("Confirmar","btn btnPrimary", ()=> updateStatus(r.id,"confirmed")),
      btn("Cancelar","btn btnDanger",  ()=> updateStatus(r.id,"canceled"))
    );

    it.append(top, act);
    list.appendChild(it);
  }
}
function btn(t, c, h){ const b=document.createElement("button"); b.textContent=t; b.className=c; b.onclick=h; return b; }
function esc(s){ return String(s??"").replace(/[&<>"]/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m])); }

async function updateStatus(id, status){
  try{ await _fb.updateDoc(_fb.doc(_fb.db,"bookings", id), { status }); }
  catch(e){ alert(describeError(e)); }
}

function describeError(e){
  const code = e?.code || "";
  if (code.includes("operation-not-allowed")) return "Método E-mail/Senha não está habilitado no Firebase.";
  if (code.includes("invalid-email")) return "E-mail inválido.";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) return "E-mail ou senha incorretos.";
  if (code.includes("user-disabled")) return "Usuário desabilitado.";
  if (code.includes("too-many-requests")) return "Muitas tentativas. Tente novamente em instantes.";
  if (code.includes("unauthorized-domain")) return "Domínio não autorizado nas configurações do Firebase Auth.";
  return e?.message || "Erro.";
}
