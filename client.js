// client.js
import { fb as _fb } from "./firebase-init.js";

/* ===== Helpers e constantes ===== */
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmt2 = (n) => String(n).padStart(2, "0");

const SERVICES = {
  cabelo:       { label: "Cabelo",       price: 35 },
  barba:        { label: "Barba",        price: 30 },
  perfil:       { label: "Perfil",       price: 20 },
  sobrancelha:  { label: "Sobrancelha",  price: 15 },
  luzes:        { label: "Luzes",        price: 80 },
  relaxamento:  { label: "Relaxamento",  price: 50 },
  pigmentacao:  { label: "Pigmentação",  price: 40 },
  platinado:    { label: "Platinado",    price: 130 },
};

// Semana visível: Ter–Sáb
const WEEK_OFFSETS = [1,2,3,4,5];
const DOW_LABELS   = ["Ter","Qua","Qui","Sex","Sáb"];

function isTerSab(d){ return [2,3,4,5,6].includes(d.getDay()); }
function proximaTercaApartir(d){
  const x = new Date(d);
  if(isTerSab(x)) return x;
  const delta = (2 - x.getDay() + 7) % 7 || 2;
  x.setDate(x.getDate() + delta);
  return x;
}
function startOfWeek(d, weekStartsOn=1){ const x=new Date(d); x.setHours(0,0,0,0); const diff=(x.getDay()-weekStartsOn+7)%7; x.setDate(x.getDate()-diff); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function sameYMD(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function monthLabel(d){ return new Intl.DateTimeFormat("pt-BR",{month:"long",year:"numeric"}).format(d); }
function toDateStr(d){ return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`; }

function geraSlotsDia(date){
  if(!isTerSab(date)) return [];
  const slots=[];
  for(let h=8; h<=19; h++){
    for(const m of [0,30]){
      if(h===19 && m===30) continue; // sem 19:30
      slots.push(`${fmt2(h)}:${fmt2(m)}`);
    }
  }
  return slots;
}

/* ===== Elementos ===== */
const weekGrid    = document.getElementById("weekGrid");
const monthLbl    = document.getElementById("monthLabel");
const btnPrevWeek = document.getElementById("prevWeek");
const btnNextWeek = document.getElementById("nextWeek");
const btnHoje     = document.getElementById("btnHoje");

const elData     = document.getElementById("data");
const timeSelect = document.getElementById("timeSelect");
const timeToggle = document.getElementById("timeToggle");
const timeLabel  = document.getElementById("timeLabel");
const timeGrid   = document.getElementById("timeGrid");
const info       = document.getElementById("info");

const servicesWrap = document.getElementById("services");
const totalEl      = document.getElementById("total");

const dlg         = document.getElementById("dlg");
const dlgTitulo   = document.getElementById("dlgTitulo");
const resumo      = document.getElementById("resumo");
const formAgendar = document.getElementById("formAgendar");
const btnCancelar = document.getElementById("btnCancelar");
const msg         = document.getElementById("msg");

const dlgTabela   = document.getElementById("dlgTabela");
const btnTabela   = document.getElementById("btnTabela");
const fecharTabela= document.getElementById("fecharTabela");

/* ===== Estado ===== */
let selectedDate;
let currentWeekStart;
let unsubSlots = null;

function resetTimeLabel(){ timeLabel.textContent = "Selecionar horário"; }

/* ===== Init ===== */
(function init(){
  selectedDate     = proximaTercaApartir(new Date());
  currentWeekStart = startOfWeek(selectedDate,1);
  elData.value     = toDateStr(selectedDate);

  renderWeek();
  timeSelect.classList.add("open");
  timeToggle.setAttribute("aria-expanded","true");
  iniciarListenerDeSlots(elData.value);

  renderServices();
})();

/* ===== Semana ===== */
btnPrevWeek.onclick = ()=>{
  const idx = Math.max(0, Math.min(4, selectedDate.getDay()-2));
  currentWeekStart = addDays(currentWeekStart,-7);
  selectedDate     = addDays(currentWeekStart, WEEK_OFFSETS[idx]);
  elData.value     = toDateStr(selectedDate);
  resetTimeLabel();
  renderWeek();
  iniciarListenerDeSlots(elData.value);
};
btnNextWeek.onclick = ()=>{
  const idx = Math.max(0, Math.min(4, selectedDate.getDay()-2));
  currentWeekStart = addDays(currentWeekStart, 7);
  selectedDate     = addDays(currentWeekStart, WEEK_OFFSETS[idx]);
  elData.value     = toDateStr(selectedDate);
  resetTimeLabel();
  renderWeek();
  iniciarListenerDeSlots(elData.value);
};
btnHoje.onclick = ()=>{
  selectedDate     = proximaTercaApartir(new Date());
  currentWeekStart = startOfWeek(selectedDate,1);
  elData.value     = toDateStr(selectedDate);
  resetTimeLabel();
  renderWeek();
  iniciarListenerDeSlots(elData.value);
};

function renderWeek(){
  weekGrid.innerHTML = "";
  monthLbl.textContent = monthLabel(selectedDate);
  WEEK_OFFSETS.forEach((off, i)=>{
    const d = addDays(currentWeekStart, off);
    const btn = document.createElement("button");
    btn.className = "dayBtn";
    btn.type = "button";
    btn.dataset.date = toDateStr(d);
    btn.innerHTML = `
      <span class="dow">${DOW_LABELS[i]}</span>
      <span class="num">${d.getDate()}</span>
    `;
    btn.onclick = ()=>{
      selectedDate = d;
      elData.value = btn.dataset.date;
      resetTimeLabel();
      renderWeek();
      iniciarListenerDeSlots(elData.value);
    };
    if(sameYMD(d, selectedDate)) btn.classList.add("active");
    weekGrid.appendChild(btn);
  });
}

/* ===== Horários ===== */
timeToggle.addEventListener("click", ()=>{
  const isOpen = timeSelect.classList.toggle("open");
  timeToggle.setAttribute("aria-expanded", String(isOpen));
  if(isOpen) iniciarListenerDeSlots(elData.value);
});

/* ===== Serviços + total ===== */
function renderServices(){
  servicesWrap.innerHTML = "";
  Object.entries(SERVICES).forEach(([key, svc])=>{
    const div = document.createElement("label");
    div.className = "svcItem";
    div.innerHTML = `
      <input type="checkbox" name="servico" value="${key}" />
      <span style="flex:1">${svc.label}</span>
      <strong>${BRL.format(svc.price)}</strong>
    `;
    servicesWrap.appendChild(div);
  });
  servicesWrap.querySelectorAll('input[type="checkbox"]').forEach(chk=>{
    chk.addEventListener("change", atualizarTotal);
  });
  atualizarTotal();
}
function servicosSelecionados(){ return Array.from(document.querySelectorAll('input[name="servico"]:checked')).map(el=>el.value); }
function calcularTotal(sel){ return sel.reduce((sum,k)=> sum+(SERVICES[k]?.price||0), 0); }
function atualizarTotal(){ totalEl.textContent = `Total: ${BRL.format(calcularTotal(servicosSelecionados()))}`; }

/* ===== Firestore: slots livres em tempo real ===== */
function iniciarListenerDeSlots(dateStr){
  if(typeof unsubSlots==="function"){ unsubSlots(); unsubSlots=null; }
  renderSlots(dateStr, new Set());

  const d = new Date(dateStr+'T00:00:00');
  if(!isTerSab(d)){ info.textContent='Escolha uma data de terça a sábado.'; return; }

  const q = _fb.query(_fb.collection(_fb.db,'bookings'), _fb.where('date','==',dateStr));
  unsubSlots = _fb.onSnapshot(q, snap=>{
    const occupied = new Set();
    snap.forEach(doc=>{
      const b = doc.data();
      if(b.status!=='canceled') occupied.add(b.time);
    });
    renderSlots(dateStr, occupied);
  }, err=>{
    console.warn('onSnapshot falhou', err?.message||err);
    renderSlots(dateStr, new Set());
  });
}

function renderSlots(dateStr, occupied){
  timeGrid.innerHTML = '';
  const all = geraSlotsDia(new Date(dateStr+'T00:00:00'));
  const livres = all.filter(t=>!occupied.has(t));
  info.textContent = `Horários de ${dateStr}`;
  if(livres.length===0){
    const p = document.createElement('p');
    p.textContent = 'Sem horários disponíveis neste dia.';
    p.style.color = '#a8a8b3';
    p.style.gridColumn = '1 / -1';
    timeGrid.appendChild(p);
    return;
  }
  for(const t of livres){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'timeBtn';
    btn.textContent = t;
    btn.onclick = ()=> onEscolherHorario(dateStr, t);
    timeGrid.appendChild(btn);
  }
}

function onEscolherHorario(dateStr, timeStr){
  const sel = servicosSelecionados();
  if(sel.length===0){ alert('Selecione pelo menos 1 serviço antes de escolher o horário.'); return; }
  timeLabel.textContent = `Horário: ${timeStr}`;
  abrirConfirmacao(dateStr, timeStr, sel);
}

/* ===== Dialogs ===== */
btnCancelar.onclick = ()=> dlg.close();
btnTabela.onclick   = ()=> dlgTabela.showModal();
fecharTabela.onclick= ()=> dlgTabela.close();

/* modal com chips e total */
function abrirConfirmacao(dateStr, timeStr, sel){
  const total  = calcularTotal(sel);
  const labels = sel.map(k => SERVICES[k].label);
  dlgTitulo.textContent = `Confirmar ${dateStr} às ${timeStr}`;
  resumo.innerHTML = `
    <div class="sumRow">
      <span class="muted">Serviços</span>
      <div class="chips">${labels.map(l => `<span class="chip">${l}</span>`).join('')}</div>
    </div>
    <div class="sumRow">
      <span class="muted">Total</span>
      <b>${BRL.format(total)}</b>
    </div>
  `;
  formAgendar.reset();
  msg.textContent  = '';
  msg.className    = 'feedback';
  dlg.showModal();
}

/* ===== Criar agendamento (com Timestamp) ===== */
formAgendar.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  msg.className = 'feedback';

  const dateStr = elData.value;
  const timeStr = timeLabel.textContent.replace('Horário: ','').trim();
  if(!dateStr || !timeStr){ msg.textContent='Selecione data e horário.'; msg.className='feedback erro'; return; }

  const nome = e.target.nome.value.trim();
  const telefone = e.target.telefone.value.trim();
  if(!telefone){ msg.textContent='Informe seu telefone (WhatsApp).'; msg.className='feedback erro'; return; }

  const sel = servicosSelecionados();
  if(sel.length===0){ msg.textContent='Selecione ao menos 1 serviço.'; msg.className='feedback erro'; return; }

  try{
    await confirmarAgendamento({
      dateStr, timeStr, nome, telefone,
      services: sel, total: calcularTotal(sel)
    });
    msg.textContent = 'Agendamento confirmado! ✅';
    msg.className = 'feedback ok';
    setTimeout(()=>{ dlg.close(); }, 900);
  }catch(err){
    msg.textContent = (err && err.message) || 'Erro ao agendar.';
    msg.className = 'feedback erro';
  }
});

async function confirmarAgendamento({dateStr,timeStr,nome,telefone,services,total}){
  const id  = `${dateStr}-${timeStr.replace(':','')}`;
  const ref = _fb.doc(_fb.db,'bookings',id);

  await _fb.runTransaction(_fb.db, async tx=>{
    const snap = await tx.get(ref);
    if(snap.exists() && snap.data().status!=='canceled'){
      throw new Error('Esse horário já foi ocupado.');
    }
    // Timestamp do Firestore (exigido pelas regras)
    const startsAtLocal = new Date(`${dateStr}T${timeStr}:00`);
    const startsAt      = _fb.Timestamp.fromDate(startsAtLocal);
    const weekday       = startsAtLocal.getDay(); // 2..6 (Ter..Sáb)

    tx.set(ref,{
      date:dateStr, time:timeStr,
      startsAt, weekday,
      name:nome, phone:telefone,
      status:'confirmed',
      services,
      servicesLabels: services.map(k=>SERVICES[k].label),
      totalPrice: total,
      createdAt:_fb.serverTimestamp()
    });
  });
}
