// client.js — robusto: renderiza mesmo sem acesso ao Firestore
import { fb as _fb } from "./firebase-init.js";

const el = (sel) => document.querySelector(sel);
const weekGrid = el("#weekGrid");
const monthLabel = el("#monthLabel");
const prevWeekBtn = el("#prevWeek");
const nextWeekBtn = el("#nextWeek");
const btnHoje     = el("#btnHoje");
const servicesBox = el("#services");
const totalSpan   = el("#total");
const timeGrid    = el("#timeGrid");
const infoP       = el("#info");
const inputData   = el("#data");

// ---------- serviços ----------
const SERVICOS = [
  { id:"cabelo",       nome:"Cabelo",       preco:35 },
  { id:"barba",        nome:"Barba",        preco:30 },
  { id:"perfil",       nome:"Perfil",       preco:20 },
  { id:"sobrancelha",  nome:"Sobrancelha",  preco:15 },
  { id:"luzes",        nome:"Luzes",        preco:80 },
  { id:"relaxamento",  nome:"Relaxamento",  preco:50 },
  { id:"pigmentacao",  nome:"Pigmentação",  preco:40 },
  { id:"platinado",    nome:"Platinado",    preco:130 },
];
const fmt = (n) => n.toLocaleString("pt-BR", { style:"currency", currency:"BRL" });

function renderServicos(){
  servicesBox.innerHTML = "";
  for (const s of SERVICOS){
    const id = `svc_${s.id}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.innerHTML = `
      <input id="${id}" type="checkbox" value="${s.id}" />
      <span>${s.nome}</span>
      <strong>${fmt(s.preco)}</strong>
    `;
    servicesBox.appendChild(label);
  }
  servicesBox.addEventListener("change", recalcTotal);
  recalcTotal();
}
function selecionados(){
  return Array.from(servicesBox.querySelectorAll("input[type=checkbox]:checked"))
              .map(ch => ch.value);
}
function recalcTotal(){
  const set = new Set(selecionados());
  const total = SERVICOS.filter(s => set.has(s.id)).reduce((a,b)=>a+b.preco,0);
  totalSpan.textContent = `Total: ${fmt(total)}`;
}

// ---------- datas (terça a sábado) ----------
const DIAS_VALIDOS = [2,3,4,5,6]; // Tue..Sat
function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d){ const x=new Date(d); const day=x.getDay(); const diff=(day+6)%7; x.setDate(x.getDate()-diff); return x; } // segunda
function proximoDiaValido(d){
  let x = new Date(d);
  for(let i=0;i<7;i++){ if (DIAS_VALIDOS.includes(x.getDay())) return x; x=addDays(x,1); }
  return new Date(d);
}
let selectedDate = proximoDiaValido(new Date());
let baseWeek = startOfWeek(selectedDate);

function nomeMes(dt){
  return dt.toLocaleDateString("pt-BR",{ month:"long", year:"numeric"});
}
function semanaAtualDias(){
  const dias=[];
  for(let i=0;i<7;i++){
    const d = addDays(baseWeek, i);
    if (DIAS_VALIDOS.includes(d.getDay())) dias.push(d);
  }
  return dias;
}
function renderSemana(){
  const dias = semanaAtualDias();
  monthLabel.textContent = nomeMes(selectedDate);
  weekGrid.innerHTML = "";
  for (const d of dias){
    const b = document.createElement("button");
    b.className = "dayBtn";
    const dow = d.toLocaleDateString("pt-BR",{ weekday:"short" });
    const num = d.getDate();
    b.innerHTML = `<span class="dow">${dow}</span><span class="num">${num}</span>`;
    if (d.toDateString() === selectedDate.toDateString()) b.classList.add("active");
    b.addEventListener("click", ()=>{
      selectedDate = new Date(d);
      inputData.value = selectedDate.toISOString().slice(0,10);
      renderSemana();
      renderHorarios();
    });
    weekGrid.appendChild(b);
  }
}

// ---------- horários ----------
function geraSlots(){
  const slots=[];
  let h=8, m=0;
  while (h<19 || (h===19 && m===0)){
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m+=30; if (m===60){ m=0; h+=1; }
  }
  return slots; // até 19:00
}
async function lerHorariosOcupados(dateStr){
  // fallback amigável: se falhar Firestore, retorna vazio (nenhum bloqueio)
  try{
    const q = _fb.query(
      _fb.collection(_fb.db, "bookings"),
      _fb.where("date","==", dateStr),
      _fb.where("status","==","confirmed")
    );
    const snap = await _fb.getDocs(q);
    const set = new Set();
    snap.forEach(doc => {
      const t = doc.data()?.time;
      if (t) set.add(t);
    });
    return set;
  }catch(_e){
    console.warn("Sem Firestore (ok para render):", _e?.code);
    return new Set();
  }
}
async function renderHorarios(){
  const dateStr = selectedDate.toISOString().slice(0,10);
  infoP.textContent = `Horários de ${dateStr}`;
  timeGrid.innerHTML = "";

  const ocupados = await lerHorariosOcupados(dateStr);
  const slots = geraSlots().filter(t => !ocupados.has(t));

  if (!slots.length){
    timeGrid.innerHTML = `<div class="sub" style="grid-column:1/-1">Sem horários livres neste dia.</div>`;
    return;
  }
  for (const t of slots){
    const btn = document.createElement("button");
    btn.className = "timeBtn";
    btn.type = "button";
    btn.textContent = t;
    btn.addEventListener("click", ()=>abrirDialogo(t));
    timeGrid.appendChild(btn);
  }
}

// ---------- diálogo de confirmação ----------
const dlg = document.getElementById("dlg");
const formAgendar = document.getElementById("formAgendar");
const resumo = document.getElementById("resumo");
const titulo = document.getElementById("dlgTitulo");
const msg = document.getElementById("msg");
el("#btnCancelar")?.addEventListener("click", ()=> dlg.close());

function chipsServicos(labels){
  return `<div class="chips">${labels.map(l=>`<span class="chip">${l}</span>`).join("")}</div>`;
}

function abrirDialogo(hhmm){
  const ids = selecionados();
  if (ids.length===0){ alert("Selecione pelo menos 1 serviço antes."); return; }

  const labels = SERVICOS.filter(s=>ids.includes(s.id)).map(s=>s.nome);
  const total = SERVICOS.filter(s=>ids.includes(s.id)).reduce((a,b)=>a+b.preco,0);

  titulo.textContent = `Confirmar ${inputData.value || selectedDate.toISOString().slice(0,10)} às ${hhmm}`;
  resumo.innerHTML = `
    <div class="sumRow"><span class="muted">Serviços:</span> <strong>${labels.join(", ")}</strong></div>
    <div class="sumRow"><span class="muted">Total:</span> <strong>${fmt(total)}</strong></div>
    ${chipsServicos(labels)}
  `;
  msg.textContent = "";
  dlg.showModal();

  formAgendar.onsubmit = async (e)=>{
    e.preventDefault();
    msg.textContent = "Enviando...";
    const nome = formAgendar.nome.value.trim();
    const telefone = formAgendar.telefone.value.trim();
    if (!nome || !telefone){ msg.textContent = "Preencha nome e telefone."; msg.className = "feedback erro"; return; }

    // monta dados
    const [H,M] = hhmm.split(":").map(Number);
    const date = new Date(selectedDate);
    date.setHours(H, M, 0, 0);

    const data = {
      date: selectedDate.toISOString().slice(0,10),
      time: hhmm,
      startsAt: _fb.Timestamp.fromDate(date),
      weekday: selectedDate.getDay(), // 0..6
      name: nome,
      phone: telefone,
      status: "confirmed",
      services: ids,
      servicesLabels: labels,
      totalPrice: SERVICOS.filter(s=>ids.includes(s.id)).reduce((a,b)=>a+b.preco,0),
      createdAt: _fb.serverTimestamp()
    };
    const docId = `${data.date}-${hhmm.replace(":","")}`;

    try{
      await _fb.setDoc(_fb.doc(_fb.db,"bookings",docId), data, { merge:false });
      msg.textContent = "Agendado com sucesso!";
      msg.className = "feedback ok";
      setTimeout(()=>{ dlg.close(); renderHorarios(); }, 700);
    }catch(e){
      console.error(e?.code, e?.message);
      msg.textContent = e?.message || "Erro ao salvar (verifique regras/App Check).";
      msg.className = "feedback erro";
    }
  };
}

// ---------- navegação de semana ----------
prevWeekBtn.addEventListener("click", ()=>{ baseWeek = addDays(baseWeek,-7); selectedDate = proximoDiaValido(baseWeek); inputData.value = selectedDate.toISOString().slice(0,10); renderSemana(); renderHorarios(); });
nextWeekBtn.addEventListener("click", ()=>{ baseWeek = addDays(baseWeek, 7); selectedDate = proximoDiaValido(baseWeek); inputData.value = selectedDate.toISOString().slice(0,10); renderSemana(); renderHorarios(); });
btnHoje.addEventListener("click", ()=>{ selectedDate = proximoDiaValido(new Date()); baseWeek = startOfWeek(selectedDate); inputData.value = selectedDate.toISOString().slice(0,10); renderSemana(); renderHorarios(); });

// ---------- inicialização ----------
(function init(){
  inputData.value = selectedDate.toISOString().slice(0,10);
  renderServicos();
  renderSemana();
  renderHorarios();
})();
