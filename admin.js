// admin.js — Lista por horário (08:00–19:00), botões Editar/Confirmar/Cancelar
import { fb as _fb } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const $ = (s)=>document.querySelector(s);

// LOGIN UI
const loginCard = $("#loginCard");
const panel = $("#panel");
const msg = $("#msg");
const who = $("#who");
const form = $("#formLogin");
const emailEl = $("#email");
const passEl  = $("#senha");
const btnMostrar = $("#btnMostrar");
const btnReset   = $("#btnReset");
const btnSair    = $("#btnSair");

// PAINEL UI
const admDate = $("#admDate");
const prevDay = $("#prevDay");
const nextDay = $("#nextDay");
const btnHoje = $("#btnHoje");
const list = $("#list");
const listaMsg = $("#listaMsg");
const statusFilter = $("#statusFilter");

// EDIT UI
const dlgEdit = $("#dlgEdit");
const formEdit = $("#formEdit");
const edNome = $("#edNome");
const edFone = $("#edFone");
const edData = $("#edData");
const edHora = $("#edHora");
const edStatus = $("#edStatus");
const edTotal = $("#edTotal");
$("#edCancelar").onclick = ()=> dlgEdit.close();

let unsub = null;
let bookingsToday = [];   // docs do dia
let editing = null;

function setMsg(t,k){ if(!msg) return; msg.textContent=t||""; msg.className="feedback "+(k||""); }

// ---- LOGIN ----
btnMostrar?.addEventListener("click", ()=>{
  passEl.type = passEl.type==="password" ? "text" : "password";
  btnMostrar.textContent = passEl.type==="password" ? "Mostrar" : "Ocultar";
});
btnReset?.addEventListener("click", async ()=>{
  const email = emailEl.value.trim();
  if(!email){ setMsg("Informe seu e-mail para enviar o link.", "erro"); return; }
  try{ await sendPasswordResetEmail(_fb.auth, email); setMsg("Link enviado.", "ok"); }
  catch(e){ setMsg(describeAuthError(e), "erro"); }
});
form?.addEventListener("submit", async (e)=>{
  e.preventDefault(); setMsg("");
  try{
    const cred = await signInWithEmailAndPassword(_fb.auth, emailEl.value.trim(), passEl.value);
    afterLogin(cred.user);
  }catch(e){ setMsg(describeAuthError(e), "erro"); }
});
btnSair?.addEventListener("click", async ()=>{ await signOut(_fb.auth); });

onAuthStateChanged(_fb.auth, (user)=>{
  if(user){ afterLogin(user); return; }
  if (unsub) { unsub(); unsub = null; }
  panel.style.display="none"; loginCard.style.display="block";
});

function describeAuthError(e){
  const c=e?.code||"";
  if(c.includes("invalid-email")) return "E-mail inválido.";
  if(c.includes("invalid-credential")||c.includes("wrong-password")) return "E-mail ou senha incorretos.";
  if(c.includes("operation-not-allowed")) return "Ative o método E-mail/Senha no Firebase.";
  if(c.includes("unauthorized-domain")) return "Autorize o domínio github.io no Firebase Auth.";
  return e?.message || "Erro ao entrar.";
}

// ---- PAINEL ----
function afterLogin(user){
  who.textContent = `Logado como: ${user.email}`;
  loginCard.style.display="none"; panel.style.display="block";

  admDate.value = toISODate(new Date());
  prevDay.onclick = ()=> moveDay(-1);
  nextDay.onclick = ()=> moveDay(+1);
  btnHoje.onclick = ()=> { admDate.value = toISODate(new Date()); updateQuery(); };
  admDate.onchange = updateQuery;
  statusFilter.onchange = render;

  fillHoursSelect(edHora);
  updateQuery();
}

function moveDay(delta){
  const d = new Date(admDate.value); d.setDate(d.getDate()+delta);
  admDate.value = toISODate(d); updateQuery();
}
function toISODate(d){ return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }

function updateQuery(){
  if (unsub) { unsub(); unsub = null; }
  const dateStr = admDate.value;

  const q = _fb.query(
    _fb.collection(_fb.db, "bookings"),
    _fb.where("date","==", dateStr)
  );
  unsub = _fb.onSnapshot(q, (snap)=>{
    bookingsToday = [];
    snap.forEach(doc => bookingsToday.push({ id: doc.id, ...doc.data() }));
    render();
  }, (err)=>{
    console.error(err);
    list.innerHTML = ""; listaMsg.textContent = "Não foi possível carregar (App Check/Regras?).";
  });
}

// ---- RENDER LISTA POR HORÁRIO ----
function slots(){
  const out=[]; let h=8,m=0;
  while (h<19 || (h===19 && m===0)){
    out.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m+=30; if(m===60){m=0;h++;}
  }
  return out;
}

function render(){
  const f = statusFilter.value; // filtro de status
  const map = new Map(bookingsToday.map(b=>[b.time,b]));

  list.innerHTML = "";
  let count=0;
  for (const t of slots()){
    const r = map.get(t);
    if (r && f!=="all" && r.status!==f) continue; // respeita filtro

    const row = document.createElement("div");
    row.className = "gridRow";

    // colunas
    const cHora = el("div","colHora", t);
    const cNome = el("div","colNome", r ? r.name||"" : "");
    const cContato = el("div","colContato", r ? r.phone||"" : "");
    const cStatus = el("div","colStatus status",
      r ? statusLabel(r.status) : "");

    const actions = document.createElement("div");
    actions.className = "actions";

    if (r){ // só mostra botões quando há agendamento
      actions.append(
        smallBtn("Editar","btn btnSm", ()=> openEdit(r)),
        smallBtn("Confirmar","btn btnSm btnPrimary", ()=> updateStatus(r.id,"confirmed")),
        smallBtn("Cancelar","btn btnSm", ()=> updateStatus(r.id,"canceled")),
      );
      count++;
    }

    row.append(cHora,cNome,cContato,cStatus,actions);
    list.appendChild(row);
  }

  listaMsg.textContent = count===0 ? "Sem agendamentos para este filtro." : "";
}

function statusLabel(s){
  if (s==="confirmed") return `<span class="st-confirmed">Confirmado</span>`;
  if (s==="canceled")  return `<span class="st-canceled">Cancelado</span>`;
  return `<span class="st-pending">Pendente</span>`;
}

function smallBtn(text, cls, on){
  const b=document.createElement("button"); b.textContent=text; b.className=cls; b.onclick=on; return b;
}
function el(tag, cls, html){
  const d=document.createElement(tag); d.className=cls; d.innerHTML=html; return d;
}

// ---- AÇÕES ----
async function updateStatus(id, status){
  try{ await _fb.updateDoc(_fb.doc(_fb.db,"bookings", id), { status }); }
  catch(e){ alert(e?.message || "Não foi possível atualizar."); }
}

// ---- EDITAR ----
function fillHoursSelect(sel){
  sel.innerHTML="";
  for (const t of slots()){
    const o=document.createElement("option"); o.value=t; o.textContent=t; sel.appendChild(o);
  }
}

function openEdit(r){
  editing = r;
  edNome.value = r.name||"";
  edFone.value = r.phone||"";
  edData.value = r.date;
  edHora.value = r.time;
  edStatus.value = r.status||"pending";
  edTotal.value = Number(r.totalPrice||0);
  $("#edMsg").textContent="";
  dlgEdit.showModal();
}

formEdit.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!editing) return;

  const newData = edData.value;
  const newTime = edHora.value;
  const newId   = `${newData}-${newTime.replace(":","")}`;
  const newStarts = makeDate(newData,newTime);

  const updates = {
    name: edNome.value.trim(),
    phone: edFone.value.trim(),
    date: newData,
    time: newTime,
    startsAt: _fb.Timestamp.fromDate(newStarts),
    status: edStatus.value,
    totalPrice: Number(edTotal.value||0)
  };

  try{
    if (newId === editing.id){
      await _fb.updateDoc(_fb.doc(_fb.db,"bookings", editing.id), updates);
    } else {
      await _fb.runTransaction(_fb.db, async (tx)=>{
        const oldRef = _fb.doc(_fb.db,"bookings", editing.id);
        const newRef = _fb.doc(_fb.db,"bookings", newId);
        const newSnap = await tx.get(newRef);
        if (newSnap.exists() && newSnap.data()?.status === "confirmed"){
          throw new Error("Horário já confirmado por outro cliente.");
        }
        tx.set(newRef, { ...(editing||{}), ...updates }, { merge:false });
        tx.delete(oldRef);
      });
    }
    dlgEdit.close();
  }catch(e){
    const m = $("#edMsg"); m.textContent = e?.message || "Não foi possível salvar."; m.className="feedback erro";
  }
});

function makeDate(dateStr, timeStr){
  const [H,M] = timeStr.split(":").map(Number);
  const d = new Date(dateStr+"T00:00:00"); d.setHours(H,M,0,0); return d;
}
