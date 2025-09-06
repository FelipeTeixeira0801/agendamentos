import "./firebase-init.js";     // garante que o init foi carregado
const _fb = window._fb;          // cria um atalho local para o objeto
// admin.js
const fmt2 = n => String(n).padStart(2,'0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${fmt2(d.getMonth()+1)}-${fmt2(d.getDate())}`;
};

const boxLogin = document.getElementById('boxLogin');
const formLogin = document.getElementById('formLogin');
const loginMsg = document.getElementById('loginMsg');

const boxPainel = document.getElementById('boxPainel');
const btnSair = document.getElementById('btnSair');
const fltData = document.getElementById('fltData');
const fltStatus = document.getElementById('fltStatus');
const btnAtualizar = document.getElementById('btnAtualizar');
const tbl = document.getElementById('tbl');
const msg = document.getElementById('msg');
const adminUid = document.getElementById('adminUid');

let unsub = null;

fltData.value = todayStr();

formLogin?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  loginMsg.textContent = '';
  try{
    await _fb.signInWithEmailAndPassword(_fb.auth, e.target.email.value, e.target.senha.value);
  }catch(err){
    loginMsg.textContent = (err && err.message) || 'Erro ao entrar.';
    loginMsg.className = 'erro';
  }
});

btnSair.onclick = ()=> _fb.signOut(_fb.auth);
btnAtualizar.onclick = ()=> montarPainel();

_fb.onAuthStateChanged(_fb.auth, (user)=>{
  const logado = !!user;
  boxLogin.style.display = logado ? 'none' : '';
  boxPainel.style.display = logado ? '' : 'none';
  btnSair.style.display = logado ? '' : 'none';
  if(logado){
    adminUid.textContent = `UID: ${user.uid}`;
    montarPainel();
  } else {
    adminUid.textContent = '';
    limparTabela();
    if(typeof unsub === 'function'){ unsub(); unsub = null; }
  }
});

function limparTabela(){ tbl.innerHTML = ''; }

function desenharLinha(id, b){
  const tr = document.createElement('tr');
  const td = s => { const e=document.createElement('td'); e.innerHTML=s; return e; };

  tr.appendChild(td(b.date));
  tr.appendChild(td(b.time));
  tr.appendChild(td(b.name || '-'));
  tr.appendChild(td(b.phone || '-'));
  tr.appendChild(td(`<span class="pill">${b.status}</span>`));

  const actions = document.createElement('td');

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancelar';
  btnCancel.onclick = async ()=>{
    try{
      await _fb.updateDoc(_fb.doc(_fb.db,'bookings',id), { status: 'canceled' });
      msg.textContent = 'Agendamento cancelado.';
      msg.className = 'ok';
    }catch(err){
      msg.textContent = 'Erro ao cancelar.';
      msg.className = 'erro';
    }
  };
  btnCancel.disabled = (b.status === 'canceled');

  const btnAlterar = document.createElement('button');
  btnAlterar.textContent = 'Alterar horário';
  btnAlterar.style.marginLeft = '6px';
  btnAlterar.onclick = ()=> alterarHorario(id, b);

  actions.appendChild(btnCancel);
  actions.appendChild(btnAlterar);
  tr.appendChild(actions);

  tbl.appendChild(tr);
}

async function alterarHorario(oldId, b){
  const novo = prompt(`Novo horário (formato HH:MM, ex 09:30) para ${b.date}`, b.time);
  if(!novo) return;

  const newId = `${b.date}-${novo.replace(':','')}`;
  const oldRef = _fb.doc(_fb.db,'bookings',oldId);
  const newRef = _fb.doc(_fb.db,'bookings',newId);

  try{
    await _fb.runTransaction(_fb.db, async (tx)=>{
      const newSnap = await tx.get(newRef);
      if(newSnap.exists() && newSnap.data().status !== 'canceled'){
        throw new Error('Novo horário indisponível.');
      }
      tx.set(newRef, { ...b, time: novo, status: 'confirmed', createdAt: _fb.serverTimestamp() });
      tx.update(oldRef, { status: 'canceled' });
    });
    msg.textContent = 'Horário alterado com sucesso.';
    msg.className = 'ok';
  }catch(err){
    msg.textContent = err.message || 'Erro ao alterar.';
    msg.className = 'erro';
  }
}

function montarPainel(){
  if(typeof unsub === 'function'){ unsub(); unsub = null; }
  limparTabela(); msg.textContent = '';

  const filtros = [];
  const d = fltData.value;
  if(d) filtros.push(_fb.where('date','==', d));

  let q = _fb.query(
    _fb.collection(_fb.db,'bookings'),
    ...filtros,
    _fb.orderBy('date','asc'),
    _fb.orderBy('time','asc')
  );

  unsub = _fb.onSnapshot(q, (snap)=>{
    limparTabela();
    let count = 0;
    snap.forEach(doc=>{
      const b = doc.data();
      const statusSel = fltStatus.value;
      if(statusSel !== 'all' && b.status !== statusSel) return;
      desenharLinha(doc.id, b);
      count++;
    });
    msg.textContent = `${count} agendamento(s)`;
    msg.className = '';
  }, ()=>{
    msg.textContent = 'Erro ao carregar agendamentos.';
    msg.className = 'erro';
  });
}
