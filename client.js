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
  if(!isTerSab(date)) return [];
  const slots = [];
  for(let h=7; h<=18; h++){         // 07:00 até 18:30
    for(let m of [0,30]){
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
const info = document.getElementById('info');
const slotsCard = document.getElementById('slotsCard');
const headerSlots = document.getElementById('abrirSlots');
const elSlots = document.getElementById('slots');

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

let agendamentoCtx = null; // {dateStr,timeStr}
let totalAtual = 0;

// ----- UI INICIAL -----
(function initDate(){
  const hoje = new Date();
  if(!isTerSab(hoje)){
    const d = hoje.getDay();
    const delta = (2 - d + 7) % 7 || 2;
    hoje.setDate(hoje.getDate() + delta);
  }
  elData.value = toDateStr(hoje);
  info.textContent = `Selecione um dia e clique para ver horários`;
})();
elData.addEventListener('change', ()=> {
  info.textContent = `Exibindo horários de ${elData.value}`;
  // limpa lista ao trocar data
  elSlots.innerHTML = '';
  slotsCard.classList.remove('open');
});

headerSlots.addEventListener('click', async ()=>{
  await carregarSlots(); 
  slotsCard.classList.toggle('open');
});

btnCancelar.onclick = ()=> dlg.close();
btnTabela.onclick = ()=> dlgTabela.showModal();
fecharTabela.onclick = ()=> dlgTabela.close();

// ----- Render serviços + total dinâmico -----
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

// ----- Carregar horários do dia -----
async function carregarSlots(){
  elSlots.innerHTML = '';
  msg.textContent = '';

  const dateStr = elData.value;
  const data = new Date(dateStr + 'T00:00:00');
  const slots = geraSlotsDia(data);

  if(slots.length === 0){
    elSlots.innerHTML = `<li>Escolha uma data de terça a sábado.</li>`;
    return;
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
    if(b.status !== 'canceled') ocupados[b.time] = b;
  });

  for(const t of slots){
    const li = document.createElement('li');
    if(ocupados[t]){
      li.textContent = `${t} — OCUPADO`;
      li.classList.add('ocupado');
    } else {
      li.textContent = `${t} — LIVRE`;
      li.onclick = () => abrirConfirmacao(dateStr, t);
    }
    elSlots.appendChild(li);
  }
}

function abrirConfirmacao(dateStr, timeStr){
  const sel = servicosSelecionados();
  if(sel.length === 0){
    alert('Selecione pelo menos 1 serviço antes de escolher o horário.');
    return;
  }
  agendamentoCtx = {dateStr, timeStr, sel, total: calcularTotal(sel)};
  dlgTitulo.textContent = `Confirmar ${dateStr} às ${timeStr}`;
  resumo.innerHTML = `<b>Serviços:</b> ${sel.map(k=>SERVICES[k].label).join(', ')}<br><b>Total:</b> ${BRL.format(agendamentoCtx.total)}`;
  formAgendar.reset();
  msg.textContent = '';
  dlg.showModal();
}

// ----- Criar agendamento -----
formAgendar.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  if(!agendamentoCtx){ msg.textContent = 'Selecione data/horário.'; msg.className='erro'; return; }

  const nome = e.target.nome.value.trim();
  const telefone = e.target.telefone.value.trim();
  if(!telefone){ msg.textContent = 'Informe seu telefone (WhatsApp).'; msg.className='erro'; return; }

  try{
    await confirmarAgendamento({
      dateStr: agendamentoCtx.dateStr,
      timeStr: agendamentoCtx.timeStr,
      nome, telefone,
      services: agendamentoCtx.sel,
      total: agendamentoCtx.total
    });
    msg.textContent = 'Agendamento confirmado! ✅';
    msg.className = 'ok';
    setTimeout(()=>{ dlg.close(); carregarSlots(); }, 900);

    // (opcional) abrir WhatsApp do ADM:
    // const texto = encodeURIComponent(`Novo agendamento: ${nome} — ${agendamentoCtx.dateStr} ${agendamentoCtx.timeStr}\nServiços: ${agendamentoCtx.sel.map(k=>SERVICES[k].label).join(', ')}\nTotal: ${BRL.format(agendamentoCtx.total)}\nTel: ${telefone}`);
    // window.open('https://wa.me/5519988924763?text=' + texto, '_blank');

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
      services,                             // array: ["cabelo","barba",...]
      servicesLabels: services.map(k=>SERVICES[k].label),
      totalPrice: total,                    // número (em reais)
      createdAt: _fb.serverTimestamp()
    });
  });
}
