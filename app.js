/* ================= SQL YARD · CLIENTE ================= */
const CONFIG = {
  url: 'https://ndugekayjlxznlrqwtiw.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5kdWdla2F5amx4em5scnF3dGl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1ODkyNDMsImV4cCI6MjEwNzE2NTI0M30.j-Ia8qqHgf36MMn5OdQx7SgpFtVUOnqsJ_RPvX-RBak',   // Project Settings → API → "anon" ou "publishable" key
  fn: 'game'
};
const CONFIGURED = CONFIG.key && !CONFIG.key.startsWith('COLE_');
const sb = CONFIGURED && window.supabase ? window.supabase.createClient(CONFIG.url, CONFIG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NICK_RE = /^[A-Za-zÀ-ÿ0-9_ .-]{3,20}$/;
const AVATARS = ['🕵️', '🦉', '🐺', '🦊', '🐈‍⬛', '🔍', '🎩', '🧥', '🚇', '🗝️', '🕶️', '🦅'];

/* ---------- armazenamento local (visitante) ---------- */
const GK = 'sqlyard_guest_v1';
let guest = { done: {}, notes: {}, theme: null };
try { const s = JSON.parse(localStorage.getItem(GK)); if (s) guest = { done: {}, notes: {}, theme: null, ...s }; } catch (e) {}
const saveGuest = () => { try { localStorage.setItem(GK, JSON.stringify(guest)); } catch (e) {} };

/* ---------- estado ---------- */
const state = { view: 'home', filter: 'todos', q: '', session: null, profile: null, progress: {}, c: null, db: null, hintTexts: [], wrongs: 0, loading: false, board: null };
const logged = () => !!state.session;
const doneMap = () => logged() ? state.progress : guest.done;
const totalXP = () => Object.values(doneMap()).reduce((a, d) => a + (d.xp || 0), 0);
const maxXP = CASES.reduce((a, c) => a + c.xp, 0);
const RANKS = [[0, 'Estagiário'], [200, 'Guarda'], [800, 'Detetive'], [2000, 'Inspetor'], [4500, 'Superintendente'], [9000, 'Lenda do Yard']];
function rankInfo() {
  const xp = totalXP(); let i = 0; RANKS.forEach((r, k) => { if (xp >= r[0]) i = k; });
  const next = RANKS[i + 1];
  return { name: RANKS[i][1], xp, next, pct: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) * 100 : 100 };
}
const HINT_COST = [0.15, 0.15, 0.4];
const potential = () => { let cost = 0; for (let i = 0; i < state.hintTexts.length; i++) cost += HINT_COST[i]; return Math.max(0.2, 1 - cost - state.wrongs * 0.2); };

/* ---------- API ---------- */
async function api(action, payload = {}) {
  if (!CONFIGURED) throw new Error('O servidor ainda não foi configurado (falta a chave pública do Supabase).');
  const token = state.session?.access_token || CONFIG.key;
  let r;
  try {
    r = await fetch(`${CONFIG.url}/functions/v1/${CONFIG.fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: CONFIG.key, Authorization: 'Bearer ' + token }, body: JSON.stringify({ action, ...payload }) });
  } catch (e) { throw new Error('Sem conexão com o servidor. Verifique sua internet.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Falha no servidor (${r.status}).`);
  return j;
}
const AUTH_ERR = [
  [/Invalid login credentials/i, 'E-mail ou senha incorretos.'], [/already registered|already been registered/i, 'Este e-mail já tem uma conta. Use "Entrar".'],
  [/at least 6/i, 'A senha precisa ter pelo menos 6 caracteres.'], [/valid email|invalid format/i, 'Digite um e-mail válido.'],
  [/Email not confirmed/i, 'Confirme seu e-mail antes de entrar (veja a caixa de entrada e o spam).'], [/rate limit|too many/i, 'Muitas tentativas. Aguarde alguns minutos.'],
  [/weak|pwned/i, 'Essa senha é fraca ou já vazou. Escolha outra.']
];
const authMsg = e => { const m = e?.message || String(e); const f = AUTH_ERR.find(x => x[0].test(m)); return f ? f[1] : m; };

/* ---------- cabeçalho ---------- */
function renderHeader() {
  const r = rankInfo();
  $('#rankName').textContent = r.name;
  $('#xpTxt').textContent = r.next ? `${r.xp} / ${r.next[0]} XP` : `${r.xp} XP · patente máxima`;
  $('#xpBar').style.width = Math.min(100, r.pct) + '%';
  $('#userArea').innerHTML = logged()
    ? `<button class="userchip" id="btnUser" title="Meu perfil"><span class="av">${esc(state.profile?.avatar || '🕵️')}</span><span class="nick">${esc(state.profile?.nickname || '…')}</span></button>`
    : `<button class="btn primary sm" id="btnLogin">Entrar / Criar conta</button>`;
}

/* ---------- HOME ---------- */
function renderHome() {
  state.view = 'home'; state.c = null; window.scrollTo(0, 0);
  const dm = doneMap(), doneN = Object.keys(dm).length, q = state.q.trim().toLowerCase();
  const filters = [['todos', 'Todos'], ...NIVEIS.map((n, i) => [String(i), n]), ['yard', '🚇 Scotland Yard'], ['pend', 'Pendentes']];
  let html = `
  <section class="hero"><div class="stamp">CONFIDENCIAL</div>
    <h1>SQL Yard</h1>
    <p class="sub">Detetives de dados</p>
    <p>Interrogue tabelas, cruze pistas e prenda o culpado usando <b>SQL de verdade</b>. São <b>${CASES.length} casos</b> em 4 níveis, do primeiro <code>WHERE</code> às caçadas estilo <i>Scotland Yard</i> com táxi, ônibus, metrô e balsa.</p>
    <div class="herostats"><span><b>${doneN}</b>/${CASES.length} casos resolvidos</span><span><b>${totalXP()}</b>/${maxXP} XP</span></div>
    ${logged() ? '' : `<div class="guestbar">Você está jogando como <b>visitante</b>. <button class="linkbtn" id="btnLogin2">Crie uma conta grátis</button> para salvar seu progresso em qualquer aparelho e entrar no ranking.</div>`}
    ${CONFIGURED ? '' : `<div class="guestbar warn">⚠ Falta configurar a chave pública do Supabase em <code>CONFIG.key</code> no arquivo.</div>`}
  </section>
  <div class="toolbar">
    <div class="chips">${filters.map(f => `<button class="chip ${state.filter === f[0] ? 'on' : ''}" data-filter="${f[0]}">${f[1]}</button>`).join('')}</div>
    <input id="search" class="search" type="search" placeholder="Buscar caso…" value="${esc(state.q)}" aria-label="Buscar caso">
  </div>`;
  let any = false;
  NIVEIS.forEach((nome, lvl) => {
    const list = CASES.filter(c => c.lvl === lvl).filter(c => {
      if (state.filter === 'yard' && !c.yard) return false;
      if (state.filter === 'pend' && dm[c.id]) return false;
      if (/^[0-3]$/.test(state.filter) && +state.filter !== lvl) return false;
      if (q && !(c.titulo + ' ' + c.d + ' ' + c.tag + ' ' + c.l).toLowerCase().includes(q)) return false;
      return true;
    });
    if (!list.length) return; any = true;
    const d = CASES.filter(c => c.lvl === lvl && dm[c.id]).length, tot = CASES.filter(c => c.lvl === lvl).length;
    html += `<section class="lvl l${lvl}"><h2><span class="dot"></span>${nome}<small>${d}/${tot} resolvidos</small></h2><div class="grid">` +
      list.map(c => {
        const dn = dm[c.id];
        return `<button class="card ${dn ? 'done' : ''}" data-case="${c.i}">
          <div class="cardtop"><span class="num">Caso nº ${String(c.num).padStart(2, '0')}</span><span class="xp">${dn ? '✔ ' + dn.xp : c.xp} XP</span></div>
          <h3>${esc(c.titulo)}</h3><p>${esc(c.d)}</p>
          <div class="tags"><span class="tag">${esc(c.tag)}</span>${c.yard ? '<span class="tag yard">🚇 Scotland Yard</span>' : ''}</div></button>`;
      }).join('') + `</div></section>`;
  });
  if (!any) html += `<p class="empty">Nenhum caso encontrado com esses filtros.</p>`;
  if (!logged()) html += `<footer class="foot"><button class="linkbtn" id="btnResetGuest">Apagar progresso de visitante</button></footer>`;
  $('#app').innerHTML = html; renderHeader();
}

/* ---------- RANKING ---------- */
async function renderBoard() {
  state.view = 'board'; window.scrollTo(0, 0);
  $('#app').innerHTML = `<div class="casebar"><button class="linkbtn" id="btnBack">← Todos os casos</button></div><section class="panel"><h3>🏆 Ranking de detetives</h3><div id="boardBox"><p class="note">Carregando…</p></div></section>`;
  try {
    if (!sb) throw new Error('Servidor não configurado.');
    const { data, error } = await sb.rpc('leaderboard', { lim: 50 });
    if (error) throw error;
    const me = state.profile?.nickname?.toLowerCase();
    $('#boardBox').innerHTML = data.length ? `<div class="tablewrap"><table class="board"><thead><tr><th>#</th><th>Detetive</th><th>XP</th><th>Casos</th></tr></thead><tbody>${data.map(r => `<tr class="${me && r.nickname.toLowerCase() === me ? 'me' : ''}"><td>${r.rank}</td><td>${esc(r.avatar)} ${esc(r.nickname)}</td><td>${r.total_xp}</td><td>${r.solved}/${CASES.length}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Ninguém resolveu um caso ainda. Seja o primeiro!</p>';
    if (!logged()) $('#boardBox').insertAdjacentHTML('beforeend', '<p class="note">Crie uma conta para aparecer aqui.</p>');
  } catch (e) { $('#boardBox').innerHTML = `<div class="err">${esc(e.message || e)}</div>`; }
}

/* ---------- CASO ---------- */
async function openCase(i) {
  if (state.loading) return; state.loading = true;
  const meta = CASES[i];
  $('#app').innerHTML = `<div class="loading"><div class="stamp ok">ABRINDO ARQUIVO</div><p>${esc(meta.titulo)}…</p></div>`;
  try {
    const c = await api('case', { case_id: meta.id });
    state.c = { ...meta, ...c }; state.db = makeDB(c.tables);
    state.hintTexts = c.hints || []; state.wrongs = c.wrongs || 0; state.view = 'case';
    state.sql = `SELECT * FROM ${c.tables[0].name};`;
    let notes = guest.notes[meta.id] || '';
    if (logged() && sb) { const { data } = await sb.from('notes').select('body').eq('case_id', meta.id).maybeSingle(); notes = data?.body || ''; }
    state.notes = notes; renderCase();
  } catch (e) {
    $('#app').innerHTML = `<div class="casebar"><button class="linkbtn" id="btnBack">← Todos os casos</button></div><div class="err"><b>Não foi possível abrir o caso.</b><br>${esc(e.message)}</div>`;
  } finally { state.loading = false; }
}
function renderCase() {
  const c = state.c; window.scrollTo(0, 0);
  const dn = doneMap()[c.id];
  const schema = c.tables.map(t => `
    <div class="tbl"><div class="tblhead"><code class="tname">${t.name}</code><span class="cnt">${t.rows.length} linhas</span><button class="mini" data-peek="${t.name}">ver dados</button></div>
      <p class="tdesc">${esc(t.desc)}</p><div class="cols">${t.cols.map(col => `<button class="col" data-ins="${col}">${col}</button>`).join('')}</div></div>`).join('');
  $('#app').innerHTML = `
  <div class="casewrap l${c.lvl}">
    <div class="casebar"><button class="linkbtn" id="btnBack">← Todos os casos</button><span class="lvlbadge l${c.lvl}">${NIVEIS[c.lvl]}</span></div>
    <div class="caselayout">
      <aside class="left">
        <header class="casehead"><span class="num">Caso nº ${String(c.num).padStart(2, '0')}${dn ? ' · resolvido ✔' : ''}</span><h1>${esc(c.titulo)}</h1>
          <div class="tags"><span class="tag">${esc(c.tag)}</span>${c.yard ? '<span class="tag yard">🚇 Scotland Yard</span>' : ''}<span class="tag">${c.xp} XP</span></div></header>
        <section class="panel"><h3>Relatório</h3><p>${esc(c.d)}</p>${c.briefing.map(p => `<p>${esc(p)}</p>`).join('')}<p class="goal"><b>Objetivo:</b> ${esc(c.objetivo)}</p></section>
        <section class="panel"><h3>Tabelas do caso</h3><p class="note">Nomes de tabelas e colunas são sempre em minúsculas. Clique numa coluna para inseri-la no editor.</p>${schema}</section>
        <section class="panel"><h3>Dicas <small id="xpPot"></small></h3><div id="hintsBox"></div><button class="btn ghost" id="btnHint"></button></section>
        <section class="panel"><h3>Caderno de anotações</h3><textarea id="notes" class="notes" placeholder="Anote nomes, horários e suspeitas aqui…">${esc(state.notes)}</textarea></section>
      </aside>
      <div class="right">
        <section class="panel editor"><h3>Terminal SQL <small>Ctrl + Enter executa</small></h3>
          <textarea id="sql" class="sql" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" rows="8">${esc(state.sql)}</textarea>
          <div class="row"><button class="btn primary" id="btnRun">▶ Executar</button><button class="btn ghost" id="btnClear">Limpar</button><button class="btn ghost" id="btnRef2">Cola SQL</button></div></section>
        <section class="panel"><h3>Resultado</h3><div id="results" class="results"><p class="note">Execute uma consulta para ver os resultados aqui.</p></div></section>
        <section class="panel accuse"><h3>⚖ Acusação formal</h3><p class="note">Digite o nome completo do culpado. Cada acusação errada reduz o XP em 20%.</p>
          <div class="row"><input id="accuse" class="input" type="text" placeholder="Nome e sobrenome" autocomplete="off"><button class="btn danger" id="btnAccuse">Acusar</button></div>
          <div id="accMsg" class="accmsg" role="status"></div></section>
      </div>
    </div>
  </div>`;
  renderHints();
}
function renderHints() {
  const c = state.c, n = state.hintTexts.length;
  $('#hintsBox').innerHTML = n ? '<ol class="hints">' + state.hintTexts.map(h => `<li><pre>${esc(h)}</pre></li>`).join('') + '</ol>' : '<p class="note">Sem dicas por enquanto. Cada dica custa um pouco de XP.</p>';
  const b = $('#btnHint');
  if (n >= 3) b.style.display = 'none'; else { b.style.display = ''; b.disabled = false; b.textContent = `Pedir dica ${n + 1}/3 (−${HINT_COST[n] * 100}% XP${n === 2 ? ', revela a solução' : ''})`; }
  $('#xpPot').textContent = `XP possível: ${Math.round(c.xp * potential())}`;
}
async function askHint() {
  const b = $('#btnHint'); b.disabled = true;
  try { const r = await api('hint', { case_id: state.c.id, n: state.hintTexts.length + 1 }); state.hintTexts.push(r.text); }
  catch (e) { alert(e.message); }
  renderHints();
}
function fmt(v) {
  if (v === null || v === undefined) return '<span class="null">NULL</span>';
  if (typeof v === 'boolean') return v ? '1' : '0';
  if (typeof v === 'number' && !Number.isInteger(v)) return String(Math.round(v * 10000) / 10000);
  return esc(v);
}
function execute() {
  const sql = $('#sql').value; state.sql = sql; const out = $('#results');
  try {
    const q = sql.trim();
    if (!q) throw new SqlError('Escreva uma consulta primeiro.');
    if (!/^select\b/i.test(q)) throw new SqlError('Na delegacia só é permitido consultar (SELECT). Ninguém altera as provas!');
    const r = runSQL(state.db, q);
    if (!r.rows.length) { out.innerHTML = '<p class="note">Consulta executada: 0 linhas. Nenhum registro bate com esses filtros.</p>'; return; }
    const MAX = 200, rows = r.rows.slice(0, MAX);
    out.innerHTML = `<div class="rescount">${r.rows.length} linha${r.rows.length > 1 ? 's' : ''}${r.rows.length > MAX ? ` (mostrando as primeiras ${MAX})` : ''}</div>
      <div class="tablewrap"><table><thead><tr>${r.cols.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(v => `<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  } catch (e) { out.innerHTML = `<div class="err"><b>${e instanceof SqlError ? 'Erro na consulta' : 'Erro inesperado'}</b><br>${esc(e.message)}</div>`; }
}
async function accuse() {
  const v = $('#accuse').value.trim(), msg = $('#accMsg'), btn = $('#btnAccuse');
  if (!v) { msg.className = 'accmsg bad'; msg.textContent = 'Digite o nome de um suspeito.'; return; }
  btn.disabled = true; msg.className = 'accmsg'; msg.textContent = 'Levando a acusação ao promotor…';
  try {
    const r = await api('accuse', { case_id: state.c.id, name: v, hints: state.hintTexts.length, wrongs: state.wrongs });
    if (r.correct) {
      if (logged()) state.progress[state.c.id] = { xp: r.best };
      else { const prev = guest.done[state.c.id]; guest.done[state.c.id] = { xp: Math.max(r.xp, prev ? prev.xp : 0) }; saveGuest(); }
      renderHeader(); showVictory(r);
    } else {
      state.wrongs = r.wrongs; renderHints();
      msg.className = 'accmsg bad'; msg.textContent = `"${v}" foi liberado por falta de provas. XP possível agora: ${r.potential}.`;
    }
  } catch (e) { msg.className = 'accmsg bad'; msg.textContent = e.message; }
  finally { btn.disabled = false; }
}
function showVictory(r) {
  const c = state.c, i = CASES.findIndex(x => x.i === c.i), dm = doneMap();
  const next = CASES.slice(i + 1).concat(CASES.slice(0, i)).find(x => !dm[x.id]);
  const m = document.createElement('div'); m.className = 'overlay'; m.id = 'ovl';
  m.innerHTML = `<div class="modal win"><div class="stamp ok">CASO ENCERRADO</div><h2>${esc(r.culpado)} foi preso!</h2>
    <p>${r.replay ? 'Você já tinha resolvido este caso; o XP guardado é o melhor resultado.' : `Você ganhou <b>+${r.xp} XP</b>.`} ${state.hintTexts.length ? `Dicas usadas: ${state.hintTexts.length}.` : 'Sem dicas, muito bom!'} ${state.wrongs ? `Acusações erradas: ${state.wrongs}.` : ''}</p>
    ${logged() ? '' : '<p class="note">Jogando como visitante: <b>crie uma conta</b> para guardar este XP e entrar no ranking.</p>'}
    <p class="note">Uma solução possível:</p><pre class="code">${esc(r.solucao)}</pre>
    <div class="row"><button class="btn ghost" data-close="home">Todos os casos</button>${next ? `<button class="btn primary" data-open="${next.i}">Próximo caso →</button>` : ''}</div></div>`;
  document.body.appendChild(m);
}
function showRef() {
  const R = [['Ver tudo', 'SELECT * FROM tabela;'], ['Colunas escolhidas', 'SELECT nome, hora FROM tabela;'], ['Filtrar', "WHERE sala = 'Cofre' AND hora >= '21:00'"], ['Ou / dentro de uma lista', "WHERE a = 1 OR b IN ('x','y')"], ['Intervalo', "WHERE hora BETWEEN '21:00' AND '22:00'"], ['Texto parcial', "WHERE texto LIKE '%chapéu%'"], ['Ordenar e limitar', 'ORDER BY valor DESC LIMIT 5'], ['Unir tabelas', 'FROM a JOIN b ON b.a_id = a.id'], ['Contar por grupo', 'SELECT x, COUNT(*) AS n FROM t GROUP BY x'], ['Filtrar grupos', 'GROUP BY x HAVING COUNT(*) >= 3'], ['Somar / média', 'SUM(valor), AVG(valor), MIN(...), MAX(...)'], ['Valores únicos', 'SELECT DISTINCT profissao FROM pessoas'], ['Subconsulta', 'WHERE id IN (SELECT pessoa_id FROM chaves)'], ['Excluir da lista', 'WHERE id NOT IN (SELECT pessoa_id FROM alibis)'], ['Mesma tabela 2x', 'FROM encontros a JOIN encontros b ON a.lugar = b.lugar']];
  modal(`<h2>Cola rápida de SQL</h2><div class="reflist">${R.map(r => `<div><b>${r[0]}</b><code>${esc(r[1])}</code></div>`).join('')}</div><div class="row"><button class="btn primary" data-close="x">Fechar</button></div>`);
}
function modal(inner) { closeOvl(); const m = document.createElement('div'); m.className = 'overlay'; m.id = 'ovl'; m.innerHTML = `<div class="modal">${inner}</div>`; document.body.appendChild(m); return m; }
const closeOvl = () => { const o = $('#ovl'); if (o) o.remove(); };
function insertAtCursor(txt) { const ta = $('#sql'); if (!ta) return; const s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e); ta.selectionStart = ta.selectionEnd = s + txt.length; ta.focus(); state.sql = ta.value; }

/* ---------- CONTA ---------- */
let authMode = 'signup', pickedAvatar = AVATARS[0];
function showAuth(mode = 'signup', note = '') {
  authMode = mode;
  if (!sb) { modal(`<h2>Contas indisponíveis</h2><p>O servidor ainda não foi configurado: falta a chave pública do Supabase no arquivo do jogo.</p><div class="row"><button class="btn primary" data-close="x">Ok</button></div>`); return; }
  const su = mode === 'signup';
  modal(`<div class="authtabs"><button class="${su ? 'on' : ''}" data-authmode="signup">Criar conta</button><button class="${su ? '' : 'on'}" data-authmode="login">Entrar</button></div>
    <h2>${su ? 'Seu distintivo de detetive' : 'Bem-vindo de volta'}</h2>
    ${note ? `<p class="note">${esc(note)}</p>` : ''}
    <div class="form">
      ${su ? `<label>Apelido <small>(aparece no ranking · 3 a 20 caracteres)</small><input id="fNick" class="input" maxlength="20" autocomplete="nickname" placeholder="Ex.: Inspetor Select"></label>
      <div><span class="lbl">Avatar</span><div class="avgrid">${AVATARS.map(a => `<button type="button" class="avbtn ${a === pickedAvatar ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>` : ''}
      <label>E-mail<input id="fMail" class="input" type="email" autocomplete="email" placeholder="voce@exemplo.com"></label>
      <label>Senha<input id="fPass" class="input" type="password" autocomplete="${su ? 'new-password' : 'current-password'}" placeholder="mínimo 6 caracteres"></label>
      <div id="authMsg" class="accmsg" role="status"></div>
      <button class="btn primary" id="btnAuth">${su ? 'Criar conta' : 'Entrar'}</button>
      ${su ? '' : '<button class="linkbtn" id="btnForgot">Esqueci minha senha</button>'}
      <button class="linkbtn" data-close="x">Continuar como visitante</button>
    </div></div>`);
}
const authSay = (t, bad = true) => { const m = $('#authMsg'); if (m) { m.className = 'accmsg' + (bad ? ' bad' : ' okmsg'); m.textContent = t; } };
async function doAuth() {
  const email = $('#fMail').value.trim(), pass = $('#fPass').value, btn = $('#btnAuth');
  if (!email || !pass) return authSay('Preencha e-mail e senha.');
  btn.disabled = true;
  try {
    if (authMode === 'signup') {
      const nick = $('#fNick').value.trim();
      if (!NICK_RE.test(nick)) { btn.disabled = false; return authSay('Apelido: de 3 a 20 letras, números, espaço, ponto, hífen ou _.'); }
      const ok = await sb.rpc('nickname_available', { n: nick });
      if (ok.data === false) { btn.disabled = false; return authSay('Esse apelido já está em uso. Escolha outro.'); }
      const { data, error } = await sb.auth.signUp({ email, password: pass, options: { data: { nickname: nick, avatar: pickedAvatar }, emailRedirectTo: location.origin + location.pathname } });
      if (error) throw error;
      if (!data.session) { modal(`<h2>Confirme seu e-mail</h2><p>Enviamos um link para <b>${esc(email)}</b>. Clique nele para ativar sua conta e depois volte aqui para entrar.</p><p class="note">Não achou? Olhe a caixa de spam.</p><div class="row"><button class="btn primary" data-close="x">Entendi</button></div>`); return; }
      closeOvl();
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      closeOvl();
    }
  } catch (e) { authSay(authMsg(e)); btn.disabled = false; }
}
async function forgot() {
  const email = $('#fMail').value.trim(); if (!email) return authSay('Digite seu e-mail acima primeiro.');
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  error ? authSay(authMsg(error)) : authSay('Se este e-mail tiver conta, enviamos um link para redefinir a senha.', false);
}
function showNewPassword() {
  modal(`<h2>Nova senha</h2><div class="form"><label>Nova senha<input id="fNew" class="input" type="password" autocomplete="new-password"></label><div id="authMsg" class="accmsg"></div><button class="btn primary" id="btnNewPass">Salvar senha</button></div>`);
}
async function showProfile() {
  const p = state.profile || {}; pickedAvatar = p.avatar || AVATARS[0];
  const solved = Object.keys(state.progress).length;
  modal(`<h2>${esc(p.avatar || '🕵️')} ${esc(p.nickname || '')}</h2>
    <p class="note">${esc(state.session?.user?.email || '')}</p>
    <p><b>${rankInfo().name}</b> · ${totalXP()} XP · ${solved}/${CASES.length} casos</p>
    <div class="form"><label>Apelido<input id="fNick" class="input" maxlength="20" value="${esc(p.nickname || '')}"></label>
    <div><span class="lbl">Avatar</span><div class="avgrid">${AVATARS.map(a => `<button type="button" class="avbtn ${a === pickedAvatar ? 'on' : ''}" data-av="${a}">${a}</button>`).join('')}</div></div>
    <div id="authMsg" class="accmsg"></div>
    <button class="btn primary" id="btnSaveProfile">Salvar perfil</button>
    <button class="btn ghost" id="btnBoard2">🏆 Ver ranking</button>
    <button class="btn ghost" id="btnLogout">Sair da conta</button></div>`);
}
async function saveProfile() {
  const nick = $('#fNick').value.trim();
  if (!NICK_RE.test(nick)) return authSay('Apelido: de 3 a 20 letras, números, espaço, ponto, hífen ou _.');
  const { error } = await sb.from('profiles').update({ nickname: nick, avatar: pickedAvatar }).eq('id', state.session.user.id);
  if (error) return authSay(error.code === '23505' ? 'Esse apelido já está em uso.' : authMsg(error));
  state.profile = { nickname: nick, avatar: pickedAvatar }; renderHeader(); authSay('Perfil atualizado!', false);
}
async function loadAccount() {
  const uid = state.session.user.id;
  for (let t = 0; t < 3 && !state.profile; t++) {
    const { data } = await sb.from('profiles').select('nickname,avatar').eq('id', uid).maybeSingle();
    if (data) state.profile = data; else await new Promise(r => setTimeout(r, 600));
  }
  const { data } = await sb.from('progress').select('case_id,xp');
  state.progress = {}; (data || []).forEach(r => state.progress[r.case_id] = { xp: r.xp });
}
async function onSession(session) {
  state.session = session; state.profile = null; state.progress = {};
  if (session && sb) { try { await loadAccount(); } catch (e) { console.error(e); } }
  renderHeader();
  if (state.view === 'home') renderHome(); else if (state.view === 'board') renderBoard();
}

/* ---------- eventos ---------- */
let noteTimer;
document.addEventListener('click', ev => {
  const t = ev.target.closest('button, .overlay'); if (!t) return;
  if (t.classList.contains('overlay')) { if (ev.target === t) closeOvl(); return; }
  if (t.dataset.filter !== undefined) { state.filter = t.dataset.filter; renderHome(); return; }
  if (t.dataset.case !== undefined) { openCase(+t.dataset.case); return; }
  if (t.dataset.open !== undefined) { closeOvl(); openCase(+t.dataset.open); return; }
  if (t.dataset.close !== undefined) { closeOvl(); if (t.dataset.close === 'home') renderHome(); return; }
  if (t.dataset.peek) { $('#sql').value = `SELECT * FROM ${t.dataset.peek};`; execute(); return; }
  if (t.dataset.ins) { insertAtCursor(t.dataset.ins); return; }
  if (t.dataset.authmode) { showAuth(t.dataset.authmode); return; }
  if (t.dataset.av) { pickedAvatar = t.dataset.av; document.querySelectorAll('.avbtn').forEach(b => b.classList.toggle('on', b.dataset.av === pickedAvatar)); return; }
  switch (t.id) {
    case 'btnBack': renderHome(); break;
    case 'btnRun': execute(); break;
    case 'btnClear': $('#sql').value = ''; $('#sql').focus(); break;
    case 'btnRef': case 'btnRef2': showRef(); break;
    case 'btnHint': askHint(); break;
    case 'btnAccuse': accuse(); break;
    case 'btnTheme': toggleTheme(); break;
    case 'btnBoard': renderBoard(); break;
    case 'btnBoard2': closeOvl(); renderBoard(); break;
    case 'btnLogin': case 'btnLogin2': showAuth('signup'); break;
    case 'btnUser': showProfile(); break;
    case 'btnAuth': doAuth(); break;
    case 'btnForgot': forgot(); break;
    case 'btnSaveProfile': saveProfile(); break;
    case 'btnLogout': closeOvl(); sb.auth.signOut(); break;
    case 'btnNewPass': (async () => { const { error } = await sb.auth.updateUser({ password: $('#fNew').value }); error ? authSay(authMsg(error)) : (closeOvl()); })(); break;
    case 'btnResetGuest': if (confirm('Apagar seu progresso de visitante?')) { guest = { done: {}, notes: {}, theme: guest.theme }; saveGuest(); renderHome(); } break;
  }
});
document.addEventListener('input', ev => {
  if (ev.target.id === 'search') { state.q = ev.target.value; const p = ev.target.selectionStart; renderHome(); const s = $('#search'); s.focus(); s.setSelectionRange(p, p); }
  if (ev.target.id === 'notes' && state.c) {
    const body = ev.target.value, id = state.c.id; state.notes = body;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      if (logged() && sb) await sb.from('notes').upsert({ user_id: state.session.user.id, case_id: id, body, updated_at: new Date().toISOString() });
      else { guest.notes[id] = body; saveGuest(); }
    }, 900);
  }
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') closeOvl();
  if (ev.target.id === 'sql') {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); execute(); }
    if (ev.key === 'Tab') { ev.preventDefault(); insertAtCursor('  '); }
  }
  if (ev.target.id === 'accuse' && ev.key === 'Enter') accuse();
  if ((ev.target.id === 'fPass' || ev.target.id === 'fMail') && ev.key === 'Enter') doAuth();
});
function applyTheme() { if (guest.theme) document.documentElement.setAttribute('data-theme', guest.theme); }
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  guest.theme = cur === 'dark' ? 'light' : 'dark'; applyTheme(); saveGuest();
}
applyTheme(); renderHome();
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    setTimeout(() => {   // evita travar o cliente do Supabase dentro do callback
      if (event === 'PASSWORD_RECOVERY') showNewPassword();
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        if (event === 'SIGNED_IN' && state.session?.user?.id === session?.user?.id) return;
        onSession(session);
      }
    }, 0);
  });
}
