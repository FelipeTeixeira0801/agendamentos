import "./firebase-init.js";
const _fb = window._fb;
// client.js
const fmt2 = n => String(n).padStart(2,'0');

function isTerSab(date){
  const d = date.getDay(); // 0 dom .. 6 sáb
  return [2,3,4,5,6].includes(d);
}
function geraSlotsDia(date){
  if(!isTerSab(date)) return [];
  const slots = [];
  for(let h=7; h<=18; h++){         // último início 18:30 → termina 19:00
    for(let m of [0,30]){
      slots.push(`${fmt2(h)}:${fmt2(m)}`);
    }
  }
  return slots;
}
function toDateStr(d){
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
}

// ----- UI -----
const elData = document.getElementById('data');
const elInfo = document.getElementById('info');
const elSlots = document.getElementById('slots');
const dlg = document.getElementById('dlg');
const formAgendar = document.getElementById('formAgendar');
const btnCancelar = document.getElementById('btnCancelar');
const msg = document.getElementById('msg');
let agendamentoCtx = null;

btnCancelar.onclick = () => dlg.close();

// data inicial = hoje (ou próxima terça)
(function initDate(){
  const hoje = new Date();
  if(!isTerSab(hoje)){
    const d = hoje.getDay();
    const delta = (2 - d + 7) % 7 || 2; // próxima terça
    hoje.setDate(hoje.getDate() + delta);
  }
  elData.value = toDateStr(hoje);
})();
elData.addEventListener('change', () => carregaSlots());
carregaSlots();

// ----- Ler ocupação do dia -----
async function carregaSlots(){
  elSlots.innerHTML = '';
  msg.textContent = '';

  const dateStr = elData.value;
  const data = new Date(dateStr + 'T00:00:00');
  const slots = geraSlotsDia(data);

  if(slots.length === 0){
    elInfo.innerHTML = 'Funcionamos de <b>terça a sábado</b>, 07:00–19:00.';
    return;
  } else {
    elInfo.textContent = `Exibindo horários de ${dateStr}`;
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
      li.onclick = () => {
        agendamentoCtx = {dateStr, timeStr: t};
        document.getElementById('dlgTitulo').textContent = `Confirmar ${dateStr} às ${t}`;
        formAgendar.reset();
        msg.textContent = '';
        dlg.showModal();
      };
    }
    elSlots.appendChild(li);
  }
}

// ----- Criar agendamento (trava anti-conflito) -----
formAgendar.addEventListener('submit', async (e)=>{
  e.preventDefault();
  msg.textContent = '';
  const nome = e.target.nome.value.trim();
  const telefone = e.target.telefone.value.trim();

  if(!agendamentoCtx){ msg.textContent = 'Selecione um horário.'; return; }

  try{
    await confirmarAgendamento({
      dateStr: agendamentoCtx.dateStr,
      timeStr: agendamentoCtx.timeStr,
      nome, telefone
    });
    msg.textContent = 'Agendamento confirmado! ✅';
    msg.className = 'ok';
    setTimeout(()=>{ dlg.close(); carregaSlots(); }, 800);

    // (opcional) abrir WhatsApp:
    // const texto = encodeURIComponent(`Novo agendamento: ${nome} — ${agendamentoCtx.dateStr} ${agendamentoCtx.timeStr} (${telefone||'sem telefone'})`);
    // window.open('https://wa.me/5519988924763?text=' + texto, '_blank');

  }catch(err){
    msg.textContent = (err && err.message) || 'Erro ao agendar.';
    msg.className = 'erro';
  }
});

async function confirmarAgendamento({dateStr,timeStr,nome,telefone}){
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
      phone: telefone || '',
      status: 'confirmed',
      createdAt: _fb.serverTimestamp()
    });
  });
}
