// client.js
import { fb as _fb } from "./firebase-init.js";

const BRL = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const fmt2 = n => String(n).padStart(2,'0');

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

function isTerSab(date){
  const d = date.getDay(); // 0 dom .. 6 sáb
  return [2,3,4,5,6].includes(d);
}
function geraSlotsDia(date){
  // Terça (2) até Sábado (6), 08:00 até 19:00 (19:30 NÃO entra)
  if(!isTerSab(date)) return [];
  const slots = [];
  for(let h=8; h<=19; h++){
    for(let m of [0,30]){
      if(h===19 && m===30) continue; // último marcável: 19:00
      slots.push(`${fmt2(h)}:${fmt2(m)}`);
    }
  }
  return slots;
}
function toDateStr(d){
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
}

// ----- ELEMENTOS -----
const elData = document.getElementById('data');
const timeSelect = document.getElementById('timeSelect');
const timeToggle = document.getElementById('timeToggle');
const timeLabel = document.getElementById('timeLabel');
const timeGrid = document.getElementById('timeGrid');
const info = document.getElementById('info');

const servicesWrap = document.getElementById('services');
const totalEl = document.getElementById('total');

const dlg = document.getElementById('dlg');
const dlgTitulo = document.getElementById('dlgTitulo');
const resumo = document.getElementById('resumo');
const formAgendar = document.getElementById('formAgendar');
const btnCancelar = document.getElementById('btnCancelar');
const msg = document.getElementById('msg');

const dlgTabela = document.getElementById('dlgTabela');
const btnTabela = document.getElementById('btnTabela');
const fecharTabela = document.getElementById('fecharTabela');

let agendamentoCtx = { dateStr: null, timeStr: null };
let totalAtual = 0;

// ----- UI INICIAL -----
(function initDate(){
  const hoje = new Date();
  if(!isTerSab(hoje)){
    const d = hoje.getDay();
    const delta = (2 - d + 7) % 7 || 2; // próxima terça
    hoje.setDate(hoje.getDate() + delta);
  }
  elData.value = toDateStr(hoje);
  timeLabel.textContent = 'Selecionar horário';
  info.textContent = 'Escolha uma data para ver os horários.';
})();
elData.addEventListener('change', ()=>{
  timeLabel.textContent = 'Selecionar horário';
  agendamentoCtx = { dateStr: null, timeStr: null };
  carregarSlots(); // recarrega grade
  timeSelect.classList.add('open'); // abre ao trocar a data
  timeToggle.setAttribute('aria-expanded','true');
});

timeToggle.addEventListener('click', ()=>{
  const isOpen = timeSelect.classList.toggle('open');
  timeToggle.setAttribute('aria-expanded', String(isOpen));
  if(isOpen) carregarSlots();
});

btnCancelar.onclick = ()=> dlg.close();
btnTabela.onclick = ()=> dlgTabela.showModal();
fecharTabela.onclick = ()=> dlgTabela.close();

// ----- Serviços + total -----
function renderServices(){
  servicesWrap.innerHTML = '';
  Object.entries(SERVICES).forEach(([key, svc])=>{
    const id = `svc_${key}`;
    const div = document.createElement('label');
    div.className = 'svcItem';
    div.innerHTML = `
      <input type="checkbox" name="servico" value="${key}" id="${id}" />
      <span style="flex:1">${svc.label}</span>
      <strong>${BRL.format(svc.price)}</strong>
    `;
    servicesWrap.appendChild(div);
  });
  servicesWrap.querySelectorAll('input[type=checkbox]').forEach(chk=>{
    chk.addEventListener('change', atualizarTotal);
  });
  atualizarTotal();
}
renderServices();

function servicosSelecionados(){
  return Array.from(document.querySelectorAll('input[name=servico]:checked'))
              .map(el => el.value);
}
function calcularTotal(sel){
  return sel.reduce((sum, k)=> sum + (SERVICES[k]?.price || 0), 0);
}
function atualizarTotal(){
  const sel = servicosSelecionados();
  totalAtual = calcularTotal(sel);
  totalEl.textContent = `Total: ${BRL.format(totalAtual)}`;
}

// ----- Carregar horários do dia (gera grade de botões) -----
async function carregarSlots(){
  timeGrid.innerHTML = '';
  msg.textContent = '';

  const dateStr = elData.value;
  const data = new Date(dateStr + 'T00:00:00');
  const slots = geraSlotsDia(data);

  if(slots.length === 0){
    info.textContent = 'Escolha uma data de terça a sábado.';
    return;
  } else {
    info.textContent = `Horários de ${dateStr}`;
  }

  const q = _fb.query(
    _fb.collection(_fb.db,'bookings'),
    _fb.where('date','==',dateStr),
    _fb.orderBy('time','asc')
  );
  const snap = await _fb.getDocs(q);
  const ocupados = {};
  snap.forEach(d => {
    const b = d.data();
    if(b.status !== 'canceled') ocupados[b.time] = true;
  });

  for(const t of slots){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'timeBtn';
    btn.textContent = t;

    if(ocupados[t]){
      btn.classList.add('disabled');
      btn.disabled = true;
    } else {
      btn.onclick = ()=> onEscolherHorario(dateStr, t);
    }

    timeGrid.appendChild(btn);
  }
}

function onEscolherHorario(dateStr, timeStr){
  const sel = servicosSelecionad
