// admin.js — Painel do ADM (listar, confirmar, cancelar, editar)
import { fb as _fb } from "./firebase-init.js";
import {
  signInWithEmailAndPassword, onAuthStateChanged,
  sendPasswordResetEmail, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const $ = (s)=>document.querySelector(s);
const loginCard = $("#loginCard");
const panel = $("#panel");
const msg = $("#msg");
const who = $("#who");

const form = $("#formLogin");
const emailEl = $("#email");
const passEl = $("#senha");
const btnEntrar = $("#btnEntrar");
const btnMostrar = $("#btnMostrar");
const btnReset = $("#btnReset");
const btnSair = $("#btnSair");

const admDate = $("#admDate");
const prevDay = $("#prevDay");
const nextDay = $("#nextDay");
const btnHoje = $("#btnHoje");
const list = $("#list");
const listaMsg = $("#listaMsg");
const statusFilter = $("#statusFilter");

// Edit dialog
const dlgEdit = $("#dlgEdit");
const formEdit = $("#formEdit");
const edNome = $("#edNome");
const edFone = $("#edFone");
const edData = $("#edData");
const edHora = $("#edHora");
const edStatus = $("#edStatus");
const edTotal = $("#edTotal");
const edMsg = $("#edMsg");
$("#edCancelar").onclick = ()=> dlgEdit.close();

let unsub = null;     // onSnapshot unsubscribe
let editing = null;   // dados do item em edição

function setMsg(t,k){ msg.textContent=t||""; msg.className="feedback "+(k||""); }
function setLoading(on){ btnEntrar.disabled=on; btnEntrar.textContent=on?"Entrando...":"Entrar"; }

// login events
btnMostrar.addEventListener("click", ()=>{
  const isPwd = passEl.type==="password";
  passEl.type = isPwd ? "text":"password";
  btnMostrar.textContent = isPwd ? "Ocultar senha" : "Mostrar senha";
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
    afterLogin(cred.user);
  }catch(e){ setMsg(e?.message || "Erro ao entrar.", "erro"); }
  setLoading(false);
});
btnSair?.addEventListener("click", async ()=>{ await signOut(_fb.auth); });

// auth state
onAuthStateChanged(_fb.auth, (user)=>{
  if(user){ afterLogin(user); return; }
  if (unsub) { unsub(); unsub = null; }
  panel.style.display="none";
  loginCard.style.display="block";
  setLoading(false);
});

// ---- painel ----
function afterLogin(user){
  who.textContent = `Logado como: ${user.email}`;
  loginCard.style.display="none";
  panel.style.display="block";

  // data focada = hoje
  const today = new Date();
  admDate.value = toISODate(today);

  // listeners
  prevDay.onclick = ()=> { changeDay(-1); };
  nextDay.onclick = ()=> { changeDay(1); };
  btnHoje.onclick = ()=> { admDate.value = toISODate(new Date()); updateQuery(); };
  admDate.addEventListener("change", updateQuery);
  statusFilter.addEventListener("change", render);

  // primeira carga
  updateQuery();
}

function changeDay(delta){
  const d = new Date(admDate.value);
  d.setDate(d.getDate()+delta);
  admDate.value = toISODate(d);
  updateQuery();
}

function toISODate(d){ return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); }

function updateQuery(){
  if (unsub) { unsub(); unsub = null; }
  const dateStr = admDate.value;
  const q = _fb.query(
    _fb.collection(_fb.db, "bookings"),
    _fb.where("date","==", dateStr),
    _fb.orderBy("time","asc")
  );
  unsub = _fb.onSnapshot(q, (snap)=>{
    const rows = [];
    snap.forEach(doc => rows.push({ id: doc.id, ...doc.data() }));
    window.__rows = rows; // debug
    render();
  }, (err)=>{
    console.error(err?.code, err?.message);
    list.innerHTML = "";
    listaMsg.textContent = "Não foi possível carregar os agendamentos (verifique App Check/Regras).";
  });
}

function render(){
  const rows = (window.__rows || []).slice();
  const f = statusFilter.value;
  const filtered = f==="all" ? rows : rows.filter(r => r.status===f);

  if (!filtered.length){
    list.innerHTML = "";
    listaMsg.textContent = "Sem agendamentos para este filtro.";
    return;
  }
  listaMsg.textContent = "";
  list.innerHTML = "";

  for (const r of filtered){
    const it = document.createElement("div");
    it.className = "rowItem";

    const statusClass = r.status==="confirmed"?"confirmed":(r.status==="canceled"?"canceled":"pending");
    const services = Array.isArray(r.servicesLabels)? r.servicesLabels.join(", ") : (Array.isArray(r.services)? r.services.join(", ") : "");

    const top = document.createElement("div");
    top.className = "top";
    top.innerHTML = `
      <div>
        <div class="name">${escapeHtml(r.name||"-")} <span class="muted">• ${escapeHtml(r.phone||"-")}</span></div>
        <div class="muted">${r.date||""} às ${r.time||""} ${services?`• ${escapeHtml(services)}`:""}</div>
      </div>
      <div class="chips">
        <span class="chip ${statusClass}">${r.status||"?"}</span>
        <span class="chip">Total: R$ ${(Number(r.totalPrice||0)).toFixed(2).replace(".",",")}</span>
      </div>
    `;

    const act = document.createElement("div");
    act.className = "actions";
    const bConfirm = btn("Confirmar","btn btnPrimary", ()=> confirmRow(r));
    const bCancel  = btn("Cancelar","btn btnDanger",  ()=> cancelRow(r));
    const bEdit    = btn("Editar",  "btn",            ()=> openEdit(r));
    act.append(bConfirm,bCancel,bEdit);

    it.append(top, act);
    list.appendChild(it);
  }
}
function btn(label, cls, on){ const b=document.createElement("button"); b.textContent=label; b.className=cls; b.onclick=on; return b; }
function escapeHtml(s){ return String(s??"").replace(/[&<>"]/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m])); }

// ---- ações ----
async function confirmRow(r){
  try{
    await _fb.updateDoc(_fb.doc(_fb.db,"bookings", r.id), { status: "confirmed" });
  }catch(e){
    alert("Falha ao confirmar: "+(e?.message||""));
  }
}
async function cancelRow(r){
  if (!confirm("Cancelar este agendamento?")) return;
  try{
    await _fb.updateDoc(_fb.doc(_fb.db,"bookings", r.id), { status: "canceled" });
  }catch(e){
    alert("Falha ao cancelar: "+(e?.message||""));
  }
}

// ---- edição / remarcação ----
function fillHours(selectEl){
  selectEl.innerHTML = "";
  let h=8,m=0;
  while (h<19 || (h===19 && m===0)){
    const t = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
    const o = document.createElement("option");
    o.value=t; o.textContent=t;
    selectEl.appendChild(o);
    m+=30; if (m===60){ m=0; h+=1; }
  }
}
fillHours(edHora);

function openEdit(r){
  editing = r;
  edNome.value = r.name||"";
  edFone.value = r.phone||"";
  edData.value = r.date;
  edHora.value = r.time;
  edStatus.value = r.status||"pending";
  edTotal.value = Number(r.totalPrice||0);
  edMsg.textContent = "";
  dlgEdit.showModal();
}

formEdit.addEventListener("submit", async (e)=>{
  e.preventDefault();
  if(!editing) return;

  const newData = edData.value;
  const newTime = edHora.value;
  const newId   = `${newData}-${newTime.replace(":","")}`;
  const newStarts = fromDateTime(newData,newTime);

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
      // remarcação: cria doc novo se não estiver tomado por confirmado
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
    edMsg.textContent = e?.message || "Não foi possível salvar.";
    edMsg.className = "feedback erro";
  }
});

function fromDateTime(dateStr, timeStr){
  const [H,M] = timeStr.split(":").map(Number);
  const d = new Date(dateStr+"T00:00:00");
  d.setHours(H,M,0,0);
  return d;
}
