// client.js — Cliente (status "pending" até o ADM confirmar)
import { fb as _fb } from "./firebase-init.js";

const $ = (s)=>document.querySelector(s);

// elementos
const weekGrid   = $("#weekGrid");
const monthLabel = $("#monthLabel");
const prevWeekBtn= $("#prevWeek");
const nextWeekBtn= $("#nextWeek");
const btnHoje    = $("#btnHoje");
const servicesBox= $("#services");
const totalSpan  = $("#total");
const timeGrid   = $("#timeGrid");
const infoP      = $("#info");
const inputData  = $("#data");

// ---------- util ----------
const fmt = (n) => n.toLocaleString("pt-BR", {style:"currency",currency:"BRL"});
const toISODate = (d)=> new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const addDays = (d, n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const startOfWeek = (d)=>{ const x=new Date(d); const day=x.getDay(); const diff=(day+6)%7; x.setDate(x.getDate()-diff); return x; }; // segunda

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

function proximoDiaValido(d){
  let x = new Date(d);
  for (let i=0;i<7;i++){ if (DIAS_VALIDOS.includes(x.getDay())) return x; x=addDays(x,1); }
  return new Date(d);
}

let selectedDate = proximoDiaValido(new Date());
let baseWeek     = startOfWeek(selectedDate);

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
      inputData.value = toISODate(selectedDate);
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
  while (h<19 || (h===19 && m===0)){ // 08:00 até 19:00
    slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    m+=30; if (m===60){ m=0; h+=1; }
  }
  return slots;
}

async function lerHorariosConfirmados(dateStr){
  // Lê apenas agendamentos CONFIRMADOS para bloquear o horário
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
    console.warn("Sem Firestore (seguindo com UI):", _e?.code);
    return new Set(); // fallback: não bloqueia nada
  }
}

async function renderHorarios(){
  const dateStr = toISODate(selectedDate);
  infoP.textContent = `Horários de ${dateStr}`;
  timeGrid.innerHTML = "";

  const ocupados = await lerHorariosConfirmados(dateStr);
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
const dlg        = document.getElementById("dlg");
const formAgendar= document.getElementById("formAgendar");
const resumo     = document.getElementById("resumo");
const titulo     = document.getElementById("dlgTitulo");
const msg        = document.getElementById("msg");
document.getElementById("btnCancelar")?.addEventListener("click", ()=> dlg.close());

function chipsServicos(labels){
  return `<div class="chips">${labels.map(l=>`<span class="chip">${l}</span>`).join("")}</div>`;
}

function abrirDialogo(hhmm){
  const ids = selecionados();
  if (ids.length===0){ alert("Selecione pelo menos 1 serviço antes."); return; }

  const labels = SERVICOS.filter(s=>ids.includes(s.id)).map(s=>s.nome);
  const total  = SERVICOS.filter(s=>ids.includes(s.id)).reduce((a,b)=>a+b.preco,0);
  const dateStr= toISODate(selectedDate);

  titulo.textContent = `Confirmar ${dateStr} às ${hhmm}`;
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
    const startLocal = new Date(dateStr+"T00:00:00");
    startLocal.setHours(H, M, 0, 0);

    const data = {
      date: dateStr,
      time: hhmm,
      startsAt: _fb.Timestamp.fromDate(startLocal),
      weekday: selectedDate.getDay(), // 0..6
      name: nome,
      phone: telefone,
      status: "pending", // <<<<< pendente até ADM confirmar
      services: ids,
      servicesLabels: SERVICOS.filter(s=>ids.includes(s.id)).map(s=>s.nome),
      totalPrice: total,
      createdAt: _fb.serverTimestamp()
    };
    const docId = `${data.date}-${hhmm.replace(":","")}`;

    try{
      // evita colisão: se já existir doc para esse horário, mostra aviso
      const ref  = _fb.doc(_fb.db,"bookings",docId);
      const snap = await _fb.getDoc(ref);
      if (snap.exists()){
        const cur = snap.data();
        if (cur?.status === "confirmed"){
          msg.textContent = "Este horário já foi confirmado por outro cliente. Escolha outro.";
        } else {
          msg.textContent = "Este horário já foi solicitado. Aguarde confirmação do ADM ou escolha outro.";
        }
        msg.className = "feedback erro";
        return;
      }

      await _fb.setDoc(ref, data, { merge:false });
      msg.textContent = "Solicitação enviada! Vamos confirmar pelo WhatsApp.";
      msg.className = "feedback ok";
      setTimeout(()=>{ dlg.close(); renderHorarios(); }, 800);
    }catch(e){
      console.error(e?.code, e?.message);
      msg.textContent = e?.message || "Erro ao salvar (verifique conexão/regras).";
      msg.className = "feedback erro";
    }
  };
}

// ---------- navegação semana ----------
prevWeekBtn.addEventListener("click", ()=>{
  baseWeek = addDays(baseWeek,-7);
  selectedDate = proximoDiaValido(baseWeek);
  inputData.value = toISODate(selectedDate);
  renderSemana(); renderHorarios();
});
nextWeekBtn.addEventListener("click", ()=>{
  baseWeek = addDays(baseWeek, 7);
  selectedDate = proximoDiaValido(baseWeek);
  inputData.value = toISODate(selectedDate);
  renderSemana(); renderHorarios();
});
btnHoje.addEventListener("click", ()=>{
  selectedDate = proximoDiaValido(new Date());
  baseWeek = startOfWeek(selectedDate);
  inputData.value = toISODate(selectedDate);
  renderSemana(); renderHorarios();
});

// ---------- inicialização ----------
(function init(){
  inputData.value = toISODate(selectedDate);
  renderServicos();
  renderSemana();
  renderHorarios();
})();
