<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>AgendApp — Área do ADM</title>
<link rel="icon" href="/agendamentos/agendapp.png?v=153" />
<style>
  :root{
    --bg:#0b0b0e; --surface:#131318; --surface-2:#1a1a21;
    --border:#26262e; --text:#f5f5f7; --muted:#a8a8b3; --accent:#2dd4bf;
    --ok:#22c55e; --warn:#facc15; --danger:#f87171;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui, Arial, sans-serif}

  /* Header */
  header{position:sticky;top:0;z-index:10;background:var(--surface);
    border-bottom:1px solid var(--border);padding:10px 14px;display:flex;justify-content:space-between;align-items:center}
  .brand{display:flex;align-items:center;gap:12px}
  .brand img{width:64px;height:64px;object-fit:cover;border-radius:12px;filter: drop-shadow(0 0 10px rgba(45,212,191,.35))}
  .brand .name{font-weight:900;letter-spacing:.35px;font-size:26px;line-height:1}
  @media (max-width:380px){ .brand img{width:58px;height:58px} .brand .name{font-size:24px} }
  .linkCliente{border:1px solid var(--border);padding:8px 12px;border-radius:10px;background:transparent;color:var(--text);text-decoration:none}
  .linkCliente:hover{border-color:var(--accent)}

  /* Layout */
  .wrap{min-height:calc(100vh - 92px);padding:18px}
  .container{max-width:1040px;margin:0 auto;display:grid;gap:14px}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px}
  .title{margin:0 0 4px;font-size:22px;font-weight:800}
  .sub{margin:0 0 14px;color:var(--muted);font-size:14px}

  .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .btn{padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);cursor:pointer;font-weight:700}
  .btn:hover{border-color:var(--accent)}
  .btnPrimary{border-color:var(--accent);box-shadow:inset 0 0 0 1px rgba(45,212,191,.35)}
  .btnDanger{border-color:#7a1c1c}
  input, select{padding:10px 12px;border-radius:12px;border:1px solid var(--border);background:#0f0f14;color:var(--text)}
  .feedback{margin-top:8px;font-size:14px}
  .ok{color:var(--ok)} .erro{color:var(--danger)} .muted{color:var(--muted)}

  /* Lista */
  .list{display:grid;gap:10px}
  .rowItem{display:grid;gap:10px;align-items:center;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);padding:10px}
  .rowItem .top{display:grid;grid-template-columns:1fr auto;gap:8px}
  .name{font-weight:800}
  .chips{display:flex;gap:6px;flex-wrap:wrap}
  .chip{padding:4px 8px;border-radius:999px;border:1px solid var(--border);background:transparent;font-size:12px}
  .chip.pending{border-color:#665c15;color:#facc15}
  .chip.confirmed{border-color:#115e3b;color:#22c55e}
  .chip.canceled{border-color:#6b1b1b;color:#f87171}
  .actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
  @media (min-width:860px){
    .rowItem{grid-template-columns:1.4fr 1fr 1fr auto;gap:12px}
    .rowItem .top{grid-template-columns:1fr;gap:2px}
    .actions{justify-content:flex-start}
  }

  /* Modal */
  dialog{border:none;border-radius:16px;max-width:560px;width:92%;background:var(--surface);color:var(--text);padding:0}
  dialog::backdrop{background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
  .sheet{padding:18px}
  .sheet h3{margin:0 0 10px;font-size:18px}
  .grid{display:grid;gap:10px}
  .g2{grid-template-columns:1fr 1fr}
  .sheet-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:6px}
</style>
</head>
<body>
  <header>
    <div class="brand">
      <img src="/agendamentos/agendapp.png?v=153" alt="Logo AgendApp" />
      <span class="name">AgendApp</span>
    </div>
    <a class="linkCliente" href="./?v=153">Área do Cliente</a>
  </header>

  <main class="wrap">
    <div class="container">

      <!-- Login -->
      <section class="card" id="loginCard">
        <h1 class="title">Área do ADM</h1>
        <p class="sub">Acesso restrito</p>
        <form id="formLogin" class="grid">
          <label class="grid">
            <span class="muted">E-mail</span>
            <input id="email" name="email" type="email" autocomplete="username" required />
          </label>
          <label class="grid">
            <span class="muted">Senha</span>
            <input id="senha" name="senha" type="password" autocomplete="current-password" required />
          </label>
          <div class="row">
            <button type="submit" class="btn btnPrimary" id="btnEntrar">Entrar</button>
            <button type="button" class="btn" id="btnMostrar">Mostrar senha</button>
            <button type="button" class="btn" id="btnReset">Esqueci a senha</button>
          </div>
        </form>
        <p id="msg" class="feedback"></p>
      </section>

      <!-- Painel -->
      <section class="card" id="panel" style="display:none">
        <div class="row" style="justify-content:space-between;align-items:center">
          <div class="row" style="gap:8px">
            <button class="btn" id="prevDay">‹</button>
            <input type="date" id="admDate" />
            <button class="btn" id="nextDay">›</button>
            <select id="statusFilter">
              <option value="all">Todos</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="canceled">Cancelados</option>
            </select>
            <button class="btn" id="btnHoje">Hoje</button>
          </div>
          <div class="row">
            <span class="muted" id="who"></span>
            <button type="button" class="btn" id="btnSair">Sair</button>
          </div>
        </div>

        <div class="list" id="list" style="margin-top:12px"></div>
        <p id="listaMsg" class="feedback muted"></p>
      </section>
    </div>
  </main>

  <!-- Modal editar -->
  <dialog id="dlgEdit">
    <div class="sheet">
      <h3>Editar agendamento</h3>
      <form id="formEdit" class="grid">
        <label class="grid">
          <span class="muted">Nome</span>
          <input type="text" id="edNome" required />
        </label>
        <label class="grid">
          <span class="muted">Telefone</span>
          <input type="tel" id="edFone" required />
        </label>
        <div class="grid g2">
          <label class="grid">
            <span class="muted">Data</span>
            <input type="date" id="edData" required />
          </label>
          <label class="grid">
            <span class="muted">Hora</span>
            <select id="edHora" required></select>
          </label>
        </div>
        <div class="grid g2">
          <label class="grid">
            <span class="muted">Status</span>
            <select id="edStatus">
              <option value="pending">Pendente</option>
              <option value="confirmed">Confirmado</option>
              <option value="canceled">Cancelado</option>
            </select>
          </label>
          <label class="grid">
            <span class="muted">Total (R$)</span>
            <input type="number" id="edTotal" step="1" min="0" />
          </label>
        </div>
        <div class="sheet-actions">
          <button type="button" class="btn" id="edCancelar">Fechar</button>
          <button type="submit" class="btn btnPrimary">Salvar</button>
        </div>
      </form>
      <p id="edMsg" class="feedback"></p>
    </div>
  </dialog>

  <script type="module" src="./admin.js?v=153"></script>
</body>
</html>
