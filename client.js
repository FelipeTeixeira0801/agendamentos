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

function isTerSab(date){ return [2,3,4,5,6].includes(date.getDay()); }
function geraSlotsDia(date){
  // Terça a sábado, de 08:00 a 19:00, intervalos de 30 min (último: 19:00)
  if(!isTerSab(date)) return [];
  const slots = [];
  for(let h=8; h<=19; h++){
    for(let m of [0,30]){
      if(h===19 && m===30) continue; // não inclui 19:30
      slots.push(`${fmt2(h)}:${fmt2(m)}`);
    }
  }
  return slots;
}
function toDateStr(d){ return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`; }

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

// ----- UI INICIAL -----
(function initDate(){
  const hoje = new Date();
  if(!isTerSab(hoje)){
    const d = hoje.getDay();
    const delta = (2 - d + 7) % 7 || 2; // próxima terça
    hoje.setDate(hoje.getDate() + delta);
  }
  elData.value = toDateStr(hoje);
  // abre horários ao carregar
  timeSelect.classList.add('open');
  timeToggle.setAttribute('aria-expanded','true');
  carregarSlots();
})();
elData.addEventListener('change', ()=>{
  timeLabel.textContent = 'Selecionar horário';
  agendamentoCtx = { dateStr: null, timeStr: null };
  timeSelect.classList.add('open');
  timeToggle.setAttribute('aria-expanded','true');
  carregarSlots();
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
  totalEl.textContent = `Total: ${BRL.format(calcularTotal(sel))}`;
}

// ----- Carregar horários do dia -----
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

  let ocupados = {};
  try{
    const q = _fb.query(
      _fb.collection(_fb.db,'bookings'),
      _fb.where('date','==',dateStr),
      _fb.orderBy('time','asc')
    );
    const snap = await _fb.getDocs(q);
    snap.forEach(d => {
      const b = d.data();
      if(b.status !== 'canceled') ocupados[b.time] = true;
    });
  }catch(e){
    console.warn('Falha ao consultar Firestore. Exibindo horários sem marcação de ocupados.', e?.message || e);
  }

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
  const sel = servicosSelecionados();
  if(sel.length === 0){
    alert('Selecione pelo menos 1 serviço antes de escolher o horário.');
    return;
  }
  agendamentoCtx = { dateStr, timeStr };
  timeLabel.textContent = `Horário: ${timeStr}`;
  abrirConfirmacao(dateStr, timeStr, sel);
}

function abrirConfirmacao(dateStr, timeStr, sel){
  const total = calcularTotal(sel);
  dlgTitulo.textContent = `Confirmar ${dateStr} às ${timeStr}`;
  resumo.innerHTML = `<b>Serviços:</b> ${sel.map(k=>SERVICES[k].label).join(', ')}<br><b>Total:</b> ${BRL.format(total)}`;
  formAgendar.reset();
  msg.textContent = '';
  dlg.showModal();
}

// ----- Criar agendamento -----
formAgendar.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  const { dateStr, timeStr } = agendamentoCtx || {};
  if(!dateStr || !timeStr){ msg.textContent = 'Selecione data e horário.'; msg.className='erro'; return; }

  const nome = e.target.nome.value.trim();
  const telefone = e.target.telefone.value.trim();
  if(!telefone){ msg.textContent = 'Informe seu telefone (WhatsApp).'; msg.className='erro'; return; }

  const sel = servicosSelecionados();
  if(sel.length === 0){ msg.textContent = 'Selecione ao menos 1 serviço.'; msg.className='erro'; return; }

  try{
    await confirmarAgendamento({
      dateStr, timeStr, nome, telefone,
      services: sel, total: calcularTotal(sel)
    });
    msg.textContent = 'Agendamento confirmado! ✅';
    msg.className = 'ok';
    setTimeout(()=>{ dlg.close(); carregarSlots(); }, 900);
  }catch(err){
    msg.textContent = (err && err.message) || 'Erro ao agendar.';
    msg.className = 'erro';
  }
});

async function confirmarAgendamento({dateStr,timeStr,nome,telefone,services,total}){
  const id = `${dateStr}-${timeStr.replace(':','')}`;
  const ref = _fb.doc(_fb.db,'bookings',id);

  await _fb.runTransaction(_fb.db, async (tx)=>{
    const snap = await tx.get(ref);
    if(snap.exists() && snap.data().status !== 'canceled'){
      throw new Error('Esse horário já foi ocupado.');
    }
    const startsAt = new Date(`${dateStr}T${timeStr}:00`);
    tx.set(ref, {
      date: dateStr,
      time: timeStr,
      startsAt: startsAt.toISOString(),
      name: nome,
      phone: telefone,
      status: 'confirmed',
      services,
      servicesLabels: services.map(k=>SERVICES[k].label),
      totalPrice: total,
      createdAt: _fb.serverTimestamp()
    });
  });
}
