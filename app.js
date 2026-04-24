// =============================================
// Finanças do Casal — modernizado
// =============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxO7OyPb4w7VXs_vfvg1tudnMLRBmXU93AEw0b8Z_8iMj7GMGYsPIErzYpd_i4SIu_R/exec';

let state = {
  pessoas: [],
  lancamentos: [],
  filtroPessoasIds: [],
  filtroMeses: [],
  rascunhos: {},
  focusPessoaId: null,
  charts: {},
  primeiraCarga: true,
  totalPositivoAnterior: null
};

let usuarioDigitando = false;

// ---------- API ----------
async function apiGet() {
  const res = await fetch(API_URL);
  return await res.json();
}

async function apiPost(action, data) {
  await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, data })
  });
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizarDados(data) {
  const pessoas = (data.pessoas || [])
    .filter(p => p && p.id)
    .map(p => ({ id: String(p.id), nome: String(p.nome || '').trim() }));

  const lancamentos = (data.lancamentos || [])
    .filter(l => l && l.id)
    .map(l => {
      let pessoasIds = l.pessoasIds;
      if (Array.isArray(pessoasIds)) pessoasIds = pessoasIds.map(String).filter(Boolean);
      else if (typeof pessoasIds === 'string') pessoasIds = pessoasIds.split(',').map(x => x.trim()).filter(Boolean);
      else pessoasIds = [];

      let mesInicial = String(l.mesInicial || '').trim();
      if (!/^\d{4}-\d{2}$/.test(mesInicial)) mesInicial = mesAtual();

      return {
        id: String(l.id),
        descricao: String(l.descricao || ''),
        valor: Number(l.valor) || 0,
        parcelas: Math.max(1, parseInt(l.parcelas, 10) || 1),
        tipo: l.tipo === 'entrada' ? 'entrada' : 'saida',
        pessoasIds,
        mesInicial
      };
    });

  return { pessoas, lancamentos };
}

async function carregarDados(silencioso = false) {
  if (usuarioDigitando) return;
  try {
    const raw = await apiGet();
    const data = normalizarDados(raw);
    state.pessoas = data.pessoas;
    state.lancamentos = data.lancamentos;
    state.filtroPessoasIds = state.filtroPessoasIds.filter(id =>
      state.pessoas.some(p => p.id === id)
    );

    if (state.primeiraCarga) {
      state.primeiraCarga = false;
      const skel = document.getElementById('skeleton-wrap');
      if (skel) skel.style.display = 'none';
    }

    render();
  } catch (e) {
    console.error(e);
    if (!silencioso) toast({ type: 'error', title: 'Erro ao carregar', message: e.message });
  }
}

// ---------- Utils ----------
const fmtBRL = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function fmtPct(n) {
  if (!isFinite(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return sign + n.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + '%';
}

function uid() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Math.random().toString(36).slice(2) + Date.now();
}

function getPessoaNome(id) {
  const p = state.pessoas.find(x => x.id === id);
  return p ? p.nome : '—';
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

function mesLabel(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-');
  return `${NOMES_MESES[parseInt(m, 10) - 1]}/${y}`;
}

function mesLabelCurto(ym) {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split('-');
  return `${NOMES_MESES[parseInt(m, 10) - 1].slice(0, 3)}/${y.slice(2)}`;
}

function somarMes(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function compararMes(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

// ---------- Emoji Avatar ----------
const EMOJI_POOL = ['🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🦄', '🐙', '🦉', '🦋', '🌺', '🌸', '🍀', '⭐', '🌙', '🔥', '💎', '🎨', '🎯', '🚀', '⚡', '🌊', '🍉', '🍓', '🥑', '🍕', '🎸', '🎮', '🏆', '🎈'];
const COLOR_POOL = [
  'linear-gradient(135deg, #ff6b6b, #feca57)',
  'linear-gradient(135deg, #48dbfb, #0abde3)',
  'linear-gradient(135deg, #a29bfe, #6c5ce7)',
  'linear-gradient(135deg, #ff9ff3, #f368e0)',
  'linear-gradient(135deg, #1dd1a1, #10ac84)',
  'linear-gradient(135deg, #feca57, #ff9f43)',
  'linear-gradient(135deg, #54a0ff, #2e86de)',
  'linear-gradient(135deg, #5f27cd, #341f97)',
  'linear-gradient(135deg, #ee5253, #ea2027)',
  'linear-gradient(135deg, #00d2d3, #01a3a4)'
];

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function avatarInfo(nome) {
  const h = hashStr(nome || 'x');
  return {
    emoji: EMOJI_POOL[h % EMOJI_POOL.length],
    bg: COLOR_POOL[h % COLOR_POOL.length]
  };
}

function avatarHtml(nome, size) {
  const { emoji, bg } = avatarInfo(nome);
  const st = size ? `width:${size}px;height:${size}px;font-size:${Math.round(size * 0.55)}px;` : '';
  return `<span class="avatar" style="--avatar-bg:${bg};background:${bg};${st}" title="${escapeHtml(nome)}">${emoji}</span>`;
}

// ---------- Expansão de parcelas ----------
function expandirParcelas(lancamentos) {
  const ocorrencias = [];
  for (const l of lancamentos) {
    for (let i = 0; i < l.parcelas; i++) {
      const mes = somarMes(l.mesInicial, i);
      ocorrencias.push({
        id: l.id,
        lancamentoId: l.id,
        descricao: l.descricao,
        valor: l.valor,
        parcelaAtual: i + 1,
        totalParcelas: l.parcelas,
        tipo: l.tipo,
        pessoasIds: l.pessoasIds,
        mes
      });
    }
  }
  return ocorrencias;
}

function ocorrenciasFiltradas() {
  let lancs = state.lancamentos;
  if (state.filtroPessoasIds.length) {
    const set = new Set(state.filtroPessoasIds);
    lancs = lancs.filter(l => l.pessoasIds.some(pid => set.has(pid)));
  }
  return expandirParcelas(lancs);
}

function mesesDisponiveis() {
  const ocorrencias = expandirParcelas(state.lancamentos);
  const set = new Set(ocorrencias.map(o => o.mes));
  return [...set].sort(compararMes);
}

function somarOcorrencias(ocorrencias) {
  let entrada = 0, saida = 0;
  for (const o of ocorrencias) {
    if (o.tipo === 'entrada') entrada += o.valor;
    else saida += o.valor;
  }
  return { entrada, saida, total: entrada - saida };
}

function ocorrenciasVisiveis() {
  let ocs = ocorrenciasFiltradas();
  if (state.filtroMeses.length) {
    const set = new Set(state.filtroMeses);
    ocs = ocs.filter(o => set.has(o.mes));
  }
  return ocs;
}

// ---------- Toast ----------
function toast({ type = 'info', title, message, duration = 4000, actionText, onAction } = {}) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const icon = icons[type] || 'ℹ';

  el.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      ${message ? `<div>${escapeHtml(message)}</div>` : ''}
    </div>
    ${actionText ? `<button class="toast-action" type="button">${escapeHtml(actionText)}</button>` : ''}
    <button class="toast-close" type="button" aria-label="Fechar">×</button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>
  `;

  const remove = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 300);
  };

  el.querySelector('.toast-close').onclick = remove;

  if (actionText && onAction) {
    el.querySelector('.toast-action').onclick = () => {
      onAction();
      remove();
    };
  }

  container.appendChild(el);
  setTimeout(remove, duration);
  return el;
}

// ---------- Count-up animation ----------
function animateCountUp(el, targetValue, { duration = 700, formatter = fmtBRL } = {}) {
  if (!el) return;
  const current = parseFloat(el.dataset.countup) || 0;
  if (current === targetValue) {
    el.textContent = formatter(targetValue);
    return;
  }
  const start = performance.now();
  const delta = targetValue - current;

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = current + delta * eased;
    el.textContent = formatter(v);
    if (t < 1) requestAnimationFrame(tick);
    else el.dataset.countup = targetValue;
  }
  requestAnimationFrame(tick);
}

// ---------- Confetti ----------
function dispararConfetti() {
  if (typeof confetti !== 'function') return;
  const defaults = {
    spread: 70,
    startVelocity: 45,
    ticks: 120,
    zIndex: 10001,
    colors: ['#22d896', '#00e5ff', '#a855f7', '#feca57', '#ff6b6b']
  };
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.3, y: 0.7 } });
  setTimeout(() => confetti({ ...defaults, particleCount: 80, origin: { x: 0.7, y: 0.7 } }), 150);
  setTimeout(() => confetti({ ...defaults, particleCount: 50, origin: { x: 0.5, y: 0.6 } }), 300);
}

// ---------- Render ----------
function render() {
  try {
    renderListaPessoas();
    renderListaMeses();
    renderTotalGeral();
    renderTabelasPessoas();
    renderDashboard();
    toggleApp();
    atualizarFocusModal();
  } catch (e) {
    console.error('Erro ao renderizar:', e);
  }
}

function toggleApp() {
  const app = document.getElementById('app');
  if (!app) return;
  if (state.pessoas.length > 0) app.classList.remove('hidden');
  else app.classList.add('hidden');
}

function renderListaPessoas() {
  const container = document.getElementById('lista-pessoas');
  if (!container) return;
  container.innerHTML = '';
  if (state.pessoas.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Nenhuma pessoa cadastrada.</span>';
    return;
  }
  for (const p of state.pessoas) {
    const ativo = state.filtroPessoasIds.includes(p.id);
    const chip = document.createElement('span');
    chip.className = 'chip chip-pessoa' + (ativo ? ' active' : '');

    chip.innerHTML = `
      ${avatarHtml(p.nome, 22)}
      <span class="p-nome">${escapeHtml(p.nome)}</span>
    `;

    const nomeEl = chip.querySelector('.p-nome');
    nomeEl.style.cursor = 'pointer';
    nomeEl.onclick = () => togglePessoa(p.id);
    chip.querySelector('.avatar').onclick = (e) => { e.stopPropagation(); togglePessoa(p.id); };

    const xbtn = document.createElement('button');
    xbtn.className = 'x-btn';
    xbtn.type = 'button';
    xbtn.title = 'Remover pessoa';
    xbtn.textContent = '×';
    xbtn.onclick = (e) => { e.stopPropagation(); removerPessoa(p.id); };

    chip.appendChild(xbtn);
    container.appendChild(chip);
  }
}

function togglePessoa(id) {
  if (state.filtroPessoasIds.includes(id)) {
    state.filtroPessoasIds = state.filtroPessoasIds.filter(x => x !== id);
  } else {
    state.filtroPessoasIds.push(id);
  }
  render();
}

function renderListaMeses() {
  const container = document.getElementById('lista-meses');
  if (!container) return;
  container.innerHTML = '';

  const meses = mesesDisponiveis();
  if (!meses.length) {
    container.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Adicione lançamentos para ver os meses.</span>';
    return;
  }

  const atual = mesAtual();

  for (const m of meses) {
    const ativo = state.filtroMeses.includes(m);
    const futuro = m > atual;
    const chip = document.createElement('span');
    chip.className = 'chip' + (ativo ? ' active' : '') + (futuro ? ' futuro' : '');
    chip.textContent = mesLabel(m);
    chip.onclick = () => {
      if (ativo) state.filtroMeses = state.filtroMeses.filter(x => x !== m);
      else state.filtroMeses.push(m);
      render();
    };
    container.appendChild(chip);
  }

  if (state.filtroMeses.length) {
    const btn = document.createElement('button');
    btn.textContent = 'Limpar';
    btn.className = 'chip-btn';
    btn.style.marginLeft = '4px';
    btn.onclick = () => { state.filtroMeses = []; render(); };
    container.appendChild(btn);
  }
}

function renderTotalGeral() {
  const secao = document.getElementById('secao-total-geral');
  if (!secao) return;
  const ids = state.filtroPessoasIds;
  if (ids.length < 2) {
    secao.classList.add('hidden');
    return;
  }
  secao.classList.remove('hidden');
  document.getElementById('total-geral-nomes').textContent = ids.map(getPessoaNome).join(' + ');

  const ocs = ocorrenciasVisiveis();
  const { entrada, saida, total } = somarOcorrencias(ocs);

  animateCountUp(document.getElementById('geral-entrada'), entrada);
  animateCountUp(document.getElementById('geral-saida'), saida);

  const elT = document.getElementById('geral-total');
  animateCountUp(elT, total);
  elT.classList.remove('entrada', 'saida');
  if (total > 0) elT.classList.add('entrada');
  else if (total < 0) elT.classList.add('saida');

  // Checar se passou a ser positivo → confetti
  if (state.totalPositivoAnterior !== null && state.totalPositivoAnterior <= 0 && total > 0) {
    dispararConfetti();
    toast({ type: 'success', title: 'No azul! 🎉', message: 'Total geral virou positivo.' });
  }
  state.totalPositivoAnterior = total;

  // Budget bar
  renderBudgetBar(document.getElementById('geral-orcamento'), entrada, saida);

  const wrapComp = document.getElementById('geral-comparativo');
  if (wrapComp) {
    wrapComp.innerHTML = '';
    if (state.filtroMeses.length >= 2) {
      wrapComp.appendChild(criarComparativo(ocorrenciasFiltradas(), state.filtroMeses));
    }
  }
}

function renderBudgetBar(el, entrada, saida) {
  if (!el) return;
  if (entrada <= 0 && saida <= 0) { el.innerHTML = ''; return; }

  const pct = entrada > 0 ? Math.min(100, (saida / entrada) * 100) : 100;
  const over = entrada > 0 && saida > entrada;
  const status = over ? 'alert' : 'ok';
  const statusText = over
    ? `${fmtPct(((saida - entrada) / entrada) * 100)} acima da renda`
    : entrada > 0 ? `${(100 - pct).toFixed(1)}% disponível` : 'Sem entradas';

  el.innerHTML = `
    <div class="bb-top">
      <span>Orçamento</span>
      <span>${pct.toFixed(1)}% gasto</span>
    </div>
    <div class="bb-track">
      <div class="bb-fill ${over ? 'over' : ''}" style="width:0%"></div>
    </div>
    <div class="bb-info">
      <span>${fmtBRL(saida)} / ${fmtBRL(entrada)}</span>
      <span class="status ${status}">${statusText}</span>
    </div>
  `;
  // Anima a largura
  requestAnimationFrame(() => {
    const fill = el.querySelector('.bb-fill');
    if (fill) fill.style.width = pct + '%';
  });
}

function renderTabelasPessoas() {
  const container = document.getElementById('tabelas-pessoas');
  if (!container) return;

  const ids = state.filtroPessoasIds.length
    ? state.filtroPessoasIds
    : state.pessoas.map(p => p.id);

  const ativo = document.activeElement;
  const ativoInfo = ativo && ativo.dataset && ativo.dataset.pessoa
    ? { pessoaId: ativo.dataset.pessoa, campo: ativo.dataset.campo, pos: ativo.selectionStart }
    : null;

  container.innerHTML = '';

  ids.forEach((pid, idx) => {
    const el = criarTabelaPessoa(pid);
    el.style.setProperty('--delay', (200 + idx * 60) + 'ms');
    el.classList.add('fade-in');
    container.appendChild(el);
  });

  if (ativoInfo) {
    const el = container.querySelector(
      `[data-pessoa="${ativoInfo.pessoaId}"][data-campo="${ativoInfo.campo}"]`
    );
    if (el) {
      el.focus();
      if (el.setSelectionRange && ativoInfo.pos != null) {
        try { el.setSelectionRange(ativoInfo.pos, ativoInfo.pos); } catch (_) {}
      }
    }
  }
}

function criarTabelaPessoa(pid, { semForm = false } = {}) {
  const p = state.pessoas.find(x => x.id === pid);
  if (!p) return document.createElement('div');

  const todasOcsPessoa = expandirParcelas(
    state.lancamentos.filter(l => l.pessoasIds.includes(pid))
  );
  const ocsPessoaFiltradas = state.filtroMeses.length
    ? todasOcsPessoa.filter(o => state.filtroMeses.includes(o.mes))
    : todasOcsPessoa;

  const { entrada, saida, total } = somarOcorrencias(ocsPessoaFiltradas);

  const section = document.createElement('section');
  section.className = 'card tabela-pessoa';

  // Header com avatar
  const header = document.createElement('div');
  header.className = 'pessoa-header';
  header.innerHTML = `
    ${avatarHtml(p.nome, 44)}
    <h2>${escapeHtml(p.nome)}</h2>
    <div class="actions">
      <button class="icon-btn btn-focus" type="button" title="Modo focus">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
      </button>
    </div>
  `;
  header.querySelector('.btn-focus').onclick = () => abrirFocus(pid);
  section.appendChild(header);

  // Resumo
  const resumo = document.createElement('div');
  resumo.className = 'pessoa-resumo';
  resumo.innerHTML = `
    <div><span class="label">Entrada</span><span class="valor entrada" data-val="${entrada}">${fmtBRL(entrada)}</span></div>
    <div><span class="label">Saída</span><span class="valor saida" data-val="${saida}">${fmtBRL(saida)}</span></div>
    <div><span class="label">Total</span><span class="valor ${total > 0 ? 'entrada' : total < 0 ? 'saida' : ''}" data-val="${total}">${fmtBRL(total)}</span></div>
  `;
  section.appendChild(resumo);

  // Budget bar
  const bb = document.createElement('div');
  bb.className = 'budget-bar';
  renderBudgetBar(bb, entrada, saida);
  if (entrada > 0 || saida > 0) section.appendChild(bb);

  // Sparkline (últimos 6 meses)
  const sparkData = calcularSparklineData(todasOcsPessoa);
  if (sparkData.length >= 2) {
    section.appendChild(criarSparkline(sparkData));
  }

  // Form
  if (!semForm) {
    section.appendChild(criarFormLancamento(pid));
  }

  // Tabela
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  if (!ocsPessoaFiltradas.length) {
    wrap.innerHTML = '<div class="empty">Nenhum lançamento.</div>';
  } else {
    const atual = mesAtual();
    const porMes = {};
    for (const o of ocsPessoaFiltradas) {
      if (!porMes[o.mes]) porMes[o.mes] = [];
      porMes[o.mes].push(o);
    }
    const mesesOrdenados = Object.keys(porMes).sort(compararMes);

    for (const m of mesesOrdenados) {
      const titulo = document.createElement('div');
      titulo.className = 'grupo-mes' + (m > atual ? ' futuro' : '');
      titulo.textContent = mesLabel(m) + (m > atual ? ' (futuro)' : '');
      wrap.appendChild(titulo);

      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Parcela</th>
            <th class="text-right">Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');

      for (const o of porMes[m]) {
        const tipoClass = o.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida';
        const valorClass = o.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida';
        const sinal = o.tipo === 'entrada' ? '+' : '−';
        const parcelaTxt = o.totalParcelas > 1 ? `${o.parcelaAtual}/${o.totalParcelas}` : '—';
        const outras = o.pessoasIds.filter(x => x !== pid).map(getPessoaNome);
        const subLeg = outras.length ? `<span class="pessoas-sub">com ${escapeHtml(outras.join(', '))}</span>` : '';
        const futuroClass = m > atual ? ' futuro-row' : '';
        const tagFuturo = m > atual ? '<span class="tag-futuro">Futuro</span>' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="${futuroClass}">${escapeHtml(o.descricao)}${tagFuturo}${subLeg}</td>
          <td class="${futuroClass}"><span class="${tipoClass}">${o.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
          <td class="${futuroClass}">${parcelaTxt}</td>
          <td class="text-right ${futuroClass}"><span class="${valorClass}">${sinal} ${fmtBRL(o.valor)}</span></td>
          <td class="text-right ${futuroClass}">
            <button class="btn-trash" title="Remover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        `;
        tr.querySelector('.btn-trash').onclick = () => removerLancamentoComUndo(o.lancamentoId);
        tbody.appendChild(tr);
      }

      wrap.appendChild(table);
    }
  }

  section.appendChild(wrap);

  if (state.filtroMeses.length >= 2) {
    section.appendChild(criarComparativo(todasOcsPessoa, state.filtroMeses));
  }

  return section;
}

function criarFormLancamento(pid) {
  if (!state.rascunhos[pid]) {
    state.rascunhos[pid] = { descricao: '', valor: '', parcelas: '', tipo: 'saida', mes: mesAtual() };
  }
  const rasc = state.rascunhos[pid];
  if (!rasc.mes || !/^\d{4}-\d{2}$/.test(rasc.mes)) rasc.mes = mesAtual();

  const anoAtual = new Date().getFullYear();
  const anos = [];
  for (let y = anoAtual - 3; y <= anoAtual + 5; y++) anos.push(y);

  const [rAno, rMes] = rasc.mes.split('-');

  const opcoesMes = NOMES_MESES.map((nm, i) => {
    const mNum = String(i + 1).padStart(2, '0');
    return `<option value="${mNum}">${nm}</option>`;
  }).join('');
  const opcoesAno = anos.map(y => `<option value="${y}">${y}</option>`).join('');

  const form = document.createElement('form');
  form.className = 'form-lancamento';
  form.innerHTML = `
    <input type="text" placeholder="Descrição" data-pessoa="${pid}" data-campo="descricao" />
    <input type="number" step="0.01" min="0.01" placeholder="Valor" data-pessoa="${pid}" data-campo="valor" />
    <input type="number" min="1" placeholder="Parcelas" data-pessoa="${pid}" data-campo="parcelas" />
    <select data-pessoa="${pid}" data-campo="mesNum" title="Mês">${opcoesMes}</select>
    <select data-pessoa="${pid}" data-campo="anoNum" title="Ano">${opcoesAno}</select>
    <select data-pessoa="${pid}" data-campo="tipo">
      <option value="saida">Saída</option>
      <option value="entrada">Entrada</option>
    </select>
    <button type="submit">Adicionar</button>
  `;

  form.querySelector('[data-campo="descricao"]').value = rasc.descricao || '';
  form.querySelector('[data-campo="valor"]').value = rasc.valor || '';
  form.querySelector('[data-campo="parcelas"]').value = rasc.parcelas || '';
  form.querySelector('[data-campo="mesNum"]').value = rMes;
  form.querySelector('[data-campo="anoNum"]').value = rAno;
  form.querySelector('[data-campo="tipo"]').value = rasc.tipo || 'saida';

  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('focus', () => { usuarioDigitando = true; });
    el.addEventListener('blur', () => { usuarioDigitando = false; });

    const atualizar = () => {
      const campo = el.dataset.campo;
      if (campo === 'mesNum' || campo === 'anoNum') {
        const mSel = form.querySelector('[data-campo="mesNum"]').value;
        const aSel = form.querySelector('[data-campo="anoNum"]').value;
        state.rascunhos[pid].mes = `${aSel}-${mSel}`;
      } else {
        state.rascunhos[pid][campo] = el.value;
      }
    };

    el.addEventListener('input', atualizar);
    el.addEventListener('change', atualizar);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = state.rascunhos[pid] || {};
    const descricao = (r.descricao || '').trim();
    const valor = parseFloat(r.valor);
    const parcelas = parseInt(r.parcelas || 1, 10) || 1;
    const tipo = r.tipo || 'saida';
    const mes = r.mes || mesAtual();

    if (!descricao) return toast({ type: 'error', title: 'Ops', message: 'Descrição é obrigatória.' });
    if (!(valor > 0)) return toast({ type: 'error', title: 'Ops', message: 'Valor deve ser maior que zero.' });
    if (!/^\d{4}-\d{2}$/.test(mes)) return toast({ type: 'error', message: 'Mês inválido.' });

    adicionarLancamento({
      descricao, valor, parcelas, tipo,
      pessoasIds: [pid], mesInicial: mes
    });

    state.rascunhos[pid] = {
      descricao: '', valor: '', parcelas: '',
      tipo: tipo, mes: mes
    };
  });

  return form;
}

// ---------- Sparkline ----------
function calcularSparklineData(ocorrencias) {
  // Pega os últimos 6 meses (incluindo atual)
  const atual = mesAtual();
  const meses = [];
  for (let i = 5; i >= 0; i--) meses.push(somarMes(atual, -i));

  return meses.map(m => {
    const ocs = ocorrencias.filter(o => o.mes === m);
    const { total } = somarOcorrencias(ocs);
    return { mes: m, valor: total };
  });
}

function criarSparkline(data) {
  const wrap = document.createElement('div');
  wrap.className = 'sparkline-wrap';

  const label = document.createElement('div');
  label.className = 'spark-label';
  label.textContent = 'Últimos 6 meses (saldo)';
  wrap.appendChild(label);

  const w = 300, h = 40, pad = 4;
  const valores = data.map(d => d.valor);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 0);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = pad + (i * (w - pad * 2)) / (data.length - 1);
    const y = h - pad - ((d.valor - min) / range) * (h - pad * 2);
    return [x, y];
  });

  const polyline = points.map(p => p.join(',')).join(' ');
  const area = `${pad},${h - pad} ${polyline} ${w - pad},${h - pad}`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'sparkline-svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('preserveAspectRatio', 'none');

  const ultimo = points[points.length - 1];
  const ultimoValor = valores[valores.length - 1];
  const cor = ultimoValor >= 0 ? 'var(--entrada)' : 'var(--saida)';

  svg.innerHTML = `
    <defs>
      <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="var(--accent)"/>
        <stop offset="100%" stop-color="var(--accent-2)"/>
      </linearGradient>
      <linearGradient id="sparkArea" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <polygon class="sp-area" points="${area}"/>
    <polyline class="sp-line" points="${polyline}"/>
    <circle class="sp-dot" cx="${ultimo[0]}" cy="${ultimo[1]}" r="3" fill="${cor}"/>
  `;

  wrap.appendChild(svg);
  return wrap;
}

// ---------- Comparativo ----------
function criarComparativo(ocorrencias, meses) {
  const wrap = document.createElement('div');
  wrap.className = 'comparativo-wrap';

  const titulo = document.createElement('div');
  titulo.className = 'comparativo-titulo';
  titulo.textContent = 'Comparativo';
  wrap.appendChild(titulo);

  const grid = document.createElement('div');
  grid.className = 'comparativo-grid';

  const mesesOrd = [...meses].sort(compararMes);
  const totaisPorMes = {};

  for (const m of mesesOrd) {
    const ocs = ocorrencias.filter(o => o.mes === m);
    totaisPorMes[m] = somarOcorrencias(ocs);
    const t = totaisPorMes[m];
    const card = document.createElement('div');
    card.className = 'comp-card';
    card.innerHTML = `
      <h4>${mesLabelCurto(m)}</h4>
      <div class="comp-linha"><span class="lbl">Entrada</span><span class="val entrada">${fmtBRL(t.entrada)}</span></div>
      <div class="comp-linha"><span class="lbl">Saída</span><span class="val saida">${fmtBRL(t.saida)}</span></div>
      <div class="comp-linha"><span class="lbl">Total</span><span class="val ${t.total > 0 ? 'entrada' : t.total < 0 ? 'saida' : ''}">${fmtBRL(t.total)}</span></div>
    `;
    grid.appendChild(card);
  }

  if (mesesOrd.length >= 2) {
    const primeiro = mesesOrd[0];
    const ultimo = mesesOrd[mesesOrd.length - 1];
    const a = totaisPorMes[primeiro];
    const b = totaisPorMes[ultimo];

    const card = document.createElement('div');
    card.className = 'comp-card diff';
    card.innerHTML = `
      <h4>${mesLabelCurto(primeiro)} → ${mesLabelCurto(ultimo)}</h4>
      ${linhaDiff('Entrada', a.entrada, b.entrada)}
      ${linhaDiff('Saída', a.saida, b.saida)}
      ${linhaDiff('Total', a.total, b.total)}
    `;
    grid.appendChild(card);
  }

  const somaOcs = ocorrencias.filter(o => meses.includes(o.mes));
  const soma = somarOcorrencias(somaOcs);
  const cardSoma = document.createElement('div');
  cardSoma.className = 'comp-card diff';
  cardSoma.innerHTML = `
    <h4>Soma do período</h4>
    <div class="comp-linha"><span class="lbl">Entrada</span><span class="val entrada">${fmtBRL(soma.entrada)}</span></div>
    <div class="comp-linha"><span class="lbl">Saída</span><span class="val saida">${fmtBRL(soma.saida)}</span></div>
    <div class="comp-linha"><span class="lbl">Total</span><span class="val ${soma.total > 0 ? 'entrada' : soma.total < 0 ? 'saida' : ''}">${fmtBRL(soma.total)}</span></div>
  `;
  grid.appendChild(cardSoma);

  wrap.appendChild(grid);
  return wrap;
}

function linhaDiff(label, a, b) {
  const diff = b - a;
  let pct;
  if (a === 0 && b === 0) pct = 0;
  else if (a === 0) pct = Infinity;
  else pct = (diff / Math.abs(a)) * 100;

  const cls = diff > 0 ? 'pos' : diff < 0 ? 'neg' : 'zero';
  const sinal = diff > 0 ? '+' : '';
  const pctTxt = isFinite(pct) ? fmtPct(pct) : (diff === 0 ? '0%' : '—');
  return `
    <div class="comp-linha">
      <span class="lbl">${label}</span>
      <span class="val ${cls}">
        ${sinal}${fmtBRL(diff)}
        <span class="comp-sub">${pctTxt}</span>
      </span>
    </div>
  `;
}

// ---------- Dashboard (gráficos) ----------
function renderDashboard() {
  const dash = document.getElementById('dashboard');
  if (!dash) return;
  if (!state.pessoas.length || !state.lancamentos.length) {
    dash.classList.add('hidden');
    return;
  }
  dash.classList.remove('hidden');

  if (typeof Chart === 'undefined') return;

  renderChartEvolucao();
  renderChartDistribuicao();
}

function getThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    text: styles.getPropertyValue('--text').trim() || '#eaf0ff',
    muted: styles.getPropertyValue('--text-muted').trim() || '#8a95b5',
    border: styles.getPropertyValue('--border').trim() || 'rgba(120,180,255,0.15)',
    accent: styles.getPropertyValue('--accent').trim() || '#00e5ff',
    accent2: styles.getPropertyValue('--accent-2').trim() || '#a855f7',
    entrada: styles.getPropertyValue('--entrada').trim() || '#22d896',
    saida: styles.getPropertyValue('--saida').trim() || '#ff5577'
  };
}

function renderChartEvolucao() {
  const canvas = document.getElementById('chart-evolucao');
  if (!canvas) return;
  const colors = getThemeColors();

  // Meses dos últimos 12 meses (ou todos os disponíveis, limitado)
  const todosMeses = mesesDisponiveis();
  const meses = todosMeses.slice(-12);

  const ocs = expandirParcelas(state.lancamentos);
  const entradas = meses.map(m => {
    return ocs.filter(o => o.mes === m && o.tipo === 'entrada').reduce((s, o) => s + o.valor, 0);
  });
  const saidas = meses.map(m => {
    return ocs.filter(o => o.mes === m && o.tipo === 'saida').reduce((s, o) => s + o.valor, 0);
  });

  if (state.charts.evolucao) state.charts.evolucao.destroy();

  state.charts.evolucao = new Chart(canvas, {
    type: 'line',
    data: {
      labels: meses.map(mesLabelCurto),
      datasets: [
        {
          label: 'Entradas',
          data: entradas,
          borderColor: colors.entrada,
          backgroundColor: colors.entrada + '33',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Saídas',
          data: saidas,
          borderColor: colors.saida,
          backgroundColor: colors.saida + '33',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: colors.text, font: { size: 11, weight: '600' }, boxWidth: 12, padding: 12 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.dataset.label + ': ' + fmtBRL(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: colors.muted, font: { size: 10 } },
          grid: { color: colors.border }
        },
        y: {
          ticks: {
            color: colors.muted,
            font: { size: 10 },
            callback: (v) => 'R$ ' + (v / 1000).toFixed(1) + 'k'
          },
          grid: { color: colors.border }
        }
      }
    }
  });
}

function renderChartDistribuicao() {
  const canvas = document.getElementById('chart-distribuicao');
  if (!canvas) return;
  const colors = getThemeColors();

  // Saídas totais por pessoa
  const porPessoa = {};
  for (const p of state.pessoas) porPessoa[p.id] = 0;

  const ocs = expandirParcelas(state.lancamentos);
  for (const o of ocs) {
    if (o.tipo !== 'saida') continue;
    for (const pid of o.pessoasIds) {
      if (porPessoa[pid] == null) porPessoa[pid] = 0;
      porPessoa[pid] += o.valor / o.pessoasIds.length;
    }
  }

  const labels = [];
  const data = [];
  for (const p of state.pessoas) {
    labels.push(p.nome);
    data.push(porPessoa[p.id] || 0);
  }

  const palette = [colors.accent, colors.accent2, colors.entrada, colors.saida, '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1'];

  if (state.charts.distribuicao) state.charts.distribuicao.destroy();

  state.charts.distribuicao = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderColor: colors.border,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colors.text, font: { size: 11, weight: '600' }, boxWidth: 12, padding: 10 }
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ctx.label + ': ' + fmtBRL(ctx.parsed)
          }
        }
      }
    }
  });
}

// ---------- Focus Mode ----------
function abrirFocus(pid) {
  state.focusPessoaId = pid;
  const modal = document.getElementById('focus-modal');
  const content = document.getElementById('focus-content');
  if (!modal || !content) return;

  content.innerHTML = '';
  content.appendChild(criarTabelaPessoa(pid));

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function fecharFocus() {
  state.focusPessoaId = null;
  const modal = document.getElementById('focus-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function atualizarFocusModal() {
  if (!state.focusPessoaId) return;
  const pid = state.focusPessoaId;
  if (!state.pessoas.find(p => p.id === pid)) {
    fecharFocus();
    return;
  }
  const content = document.getElementById('focus-content');
  if (!content) return;
  content.innerHTML = '';
  content.appendChild(criarTabelaPessoa(pid));
}

// ---------- Ações ----------
async function adicionarPessoa(nome) {
  const t = nome.trim();
  if (!t) return;
  const pessoa = { id: uid(), nome: t };
  state.pessoas.push(pessoa);
  render();
  try {
    await apiPost('addPessoa', pessoa);
    toast({ type: 'success', title: 'Pessoa adicionada', message: t });
  } catch (e) {
    toast({ type: 'error', title: 'Erro ao salvar', message: e.message });
  }
}

async function removerPessoa(id) {
  const p = state.pessoas.find(x => x.id === id);
  if (!p) return;
  const temLancamentos = state.lancamentos.some(l => l.pessoasIds.includes(id));

  // Snapshot pra undo
  const snapshot = { pessoa: { ...p }, idx: state.pessoas.findIndex(x => x.id === id) };

  state.pessoas = state.pessoas.filter(x => x.id !== id);
  state.filtroPessoasIds = state.filtroPessoasIds.filter(x => x !== id);
  delete state.rascunhos[id];
  render();

  try { await apiPost('deletePessoa', { id }); } catch (e) {
    toast({ type: 'error', title: 'Erro ao remover', message: e.message });
  }

  toast({
    type: 'info',
    title: `"${p.nome}" removida`,
    message: temLancamentos ? 'Lançamentos mantidos sem vínculo.' : '',
    duration: 6000,
    actionText: 'Desfazer',
    onAction: async () => {
      state.pessoas.splice(snapshot.idx, 0, snapshot.pessoa);
      render();
      try {
        await apiPost('addPessoa', snapshot.pessoa);
        toast({ type: 'success', message: 'Pessoa restaurada.' });
      } catch (e) {
        toast({ type: 'error', message: 'Não consegui restaurar.' });
      }
    }
  });
}

async function adicionarLancamento(l) {
  const novo = {
    id: uid(),
    descricao: l.descricao.trim(),
    valor: Number(l.valor),
    parcelas: Math.max(1, parseInt(l.parcelas || 1, 10)),
    tipo: l.tipo,
    pessoasIds: [...l.pessoasIds],
    mesInicial: l.mesInicial || mesAtual()
  };
  state.lancamentos.push(novo);
  render();
  try {
    await apiPost('addLancamento', novo);
    toast({
      type: 'success',
      title: 'Lançamento adicionado',
      message: `${novo.tipo === 'entrada' ? '+' : '−'} ${fmtBRL(novo.valor)} — ${novo.descricao}`
    });
  } catch (e) {
    toast({ type: 'error', title: 'Erro ao salvar', message: e.message });
  }
}

async function removerLancamentoComUndo(id) {
  const l = state.lancamentos.find(x => x.id === id);
  if (!l) return;

  const snapshot = { ...l, pessoasIds: [...l.pessoasIds] };
  const idx = state.lancamentos.findIndex(x => x.id === id);

  state.lancamentos = state.lancamentos.filter(x => x.id !== id);
  render();

  try { await apiPost('deleteLancamento', { id }); } catch (e) {
    toast({ type: 'error', message: e.message });
  }

  toast({
    type: 'info',
    title: 'Lançamento removido',
    message: l.descricao,
    duration: 6000,
    actionText: 'Desfazer',
    onAction: async () => {
      state.lancamentos.splice(idx, 0, snapshot);
      render();
      try {
        await apiPost('addLancamento', snapshot);
        toast({ type: 'success', message: 'Restaurado.' });
      } catch (e) {
        toast({ type: 'error', message: 'Não consegui restaurar.' });
      }
    }
  });
}

// ---------- Tema ----------
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  try { localStorage.setItem('theme', tema); } catch (_) {}
  // Re-renderiza gráficos com novas cores
  setTimeout(() => {
    if (state.charts.evolucao || state.charts.distribuicao) renderDashboard();
  }, 400);
}

function animarTrocaTemaFallback(x, y, proximoTema) {
  const overlay = document.createElement('div');
  overlay.className = 'theme-transition-overlay';
  const tmp = document.createElement('html');
  tmp.setAttribute('data-theme', proximoTema);

  const maxR = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  );

  overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  document.body.appendChild(overlay);
  void overlay.offsetWidth;

  overlay.style.transition = 'clip-path 700ms cubic-bezier(0.4, 0, 0.2, 1)';
  overlay.style.clipPath = `circle(${maxR}px at ${x}px ${y}px)`;

  setTimeout(() => {
    aplicarTema(proximoTema);
    requestAnimationFrame(() => {
      overlay.style.transition = 'opacity 200ms ease';
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 220);
    });
  }, 700);
}

function alternarTema(event) {
  const atual = document.documentElement.getAttribute('data-theme') || 'dark';
  const proximo = atual === 'dark' ? 'light' : 'dark';

  const btn = (event && event.currentTarget) || document.getElementById('theme-toggle');
  const rect = btn ? btn.getBoundingClientRect() : null;
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

  if (document.startViewTransition) {
    const maxR = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

    const transition = document.startViewTransition(() => aplicarTema(proximo));

  transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxR}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => aplicarTema(proximo));
  } else {
    animarTrocaTemaFallback(x, y, proximo);
  }
}

function initTheme() {
  // Já aplicado no inline do <head>, aqui só bind do botão
  const btn = document.getElementById('theme-toggle');
  if (!btn) {
    console.warn('[tema] Botão #theme-toggle não encontrado.');
    return;
  }
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    alternarTema(e);
  });
}

// ---------- Modo compacto ----------
function initCompact() {
  const btn = document.getElementById('compact-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const ativo = document.documentElement.getAttribute('data-compact') === '1';
    if (ativo) {
      document.documentElement.removeAttribute('data-compact');
      try { localStorage.setItem('compact', '0'); } catch (_) {}
      toast({ type: 'info', message: 'Modo expandido', duration: 1800 });
    } else {
      document.documentElement.setAttribute('data-compact', '1');
      try { localStorage.setItem('compact', '1'); } catch (_) {}
      toast({ type: 'info', message: 'Modo compacto', duration: 1800 });
    }
  });
}

// ---------- Dashboard toggle ----------
function initDashboardToggle() {
  const btn = document.getElementById('btn-toggle-dashboard');
  const content = document.getElementById('dashboard-content');
  if (!btn || !content) return;

  const saved = localStorage.getItem('dashboard-hidden') === '1';
  if (saved) {
    content.style.display = 'none';
    btn.textContent = 'Mostrar';
  }

  btn.addEventListener('click', () => {
    const hidden = content.style.display === 'none';
    if (hidden) {
      content.style.display = '';
      btn.textContent = 'Ocultar';
      try { localStorage.setItem('dashboard-hidden', '0'); } catch (_) {}
      // Re-renderiza gráficos para ajustar tamanho
      setTimeout(() => renderDashboard(), 50);
    } else {
      content.style.display = 'none';
      btn.textContent = 'Mostrar';
      try { localStorage.setItem('dashboard-hidden', '1'); } catch (_) {}
    }
  });
}

// ---------- Focus modal init ----------
function initFocusModal() {
  const modal = document.getElementById('focus-modal');
  if (!modal) return;

  const backdrop = modal.querySelector('.focus-backdrop');
  const closeBtn = modal.querySelector('.focus-close');

  if (backdrop) backdrop.addEventListener('click', fecharFocus);
  if (closeBtn) closeBtn.addEventListener('click', fecharFocus);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.focusPessoaId) fecharFocus();
  });
}

// ---------- Bind ----------
function bindEvents() {
  initTheme();
  initCompact();
  initDashboardToggle();
  initFocusModal();

  const formPessoa = document.getElementById('form-pessoa');
  if (formPessoa) {
    formPessoa.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('nome-pessoa');
      if (!input.value.trim()) {
        toast({ type: 'error', message: 'Digite um nome.' });
        return;
      }
      adicionarPessoa(input.value);
      input.value = '';
      input.focus();
    });
  }

  setInterval(() => carregarDados(true), 20000);
  window.addEventListener('focus', () => carregarDados(true));
}

// ---------- Init ----------
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    carregarDados();
  });
} else {
  bindEvents();
  carregarDados();
}
