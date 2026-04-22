// =============================================
// Finanças do Casal — com meses, parcelas e comparativo
// =============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxO7OyPb4w7VXs_vfvg1tudnMLRBmXU93AEw0b8Z_8iMj7GMGYsPIErzYpd_i4SIu_R/exec';

let state = {
  pessoas: [],
  lancamentos: [],
  filtroPessoasIds: [],
  filtroMeses: [],
  rascunhos: {}
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
      if (!/^\d{4}-\d{2}$/.test(mesInicial)) {
        if (mesInicial instanceof Date) {
          mesInicial = `${mesInicial.getFullYear()}-${String(mesInicial.getMonth() + 1).padStart(2, '0')}`;
        } else {
          mesInicial = mesInicial || mesAtual();
        }
      }

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
    render();
  } catch (e) {
    console.error(e);
    if (!silencioso) alert('Erro ao carregar dados: ' + e.message);
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

// ---------- Render ----------
function render() {
  renderListaPessoas();
  renderListaMeses();
  renderTotalGeral();
  renderTabelasPessoas();
  toggleApp();
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
    container.innerHTML = '<span style="color:#999;font-size:13px;">Nenhuma pessoa cadastrada.</span>';
    return;
  }
  for (const p of state.pessoas) {
    const ativo = state.filtroPessoasIds.includes(p.id);
    const chip = document.createElement('span');
    chip.className = 'chip' + (ativo ? ' active' : '');

    const nome = document.createElement('span');
    nome.textContent = p.nome;
    nome.style.cursor = 'pointer';
    nome.onclick = () => togglePessoa(p.id);

    const xbtn = document.createElement('button');
    xbtn.className = 'x-btn';
    xbtn.type = 'button';
    xbtn.title = 'Remover pessoa';
    xbtn.textContent = '×';
    xbtn.onclick = (e) => {
      e.stopPropagation();
      removerPessoa(p.id);
    };

    chip.appendChild(nome);
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
    container.innerHTML = '<span style="color:#999;font-size:13px;">Adicione lançamentos para ver os meses.</span>';
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
    btn.style.marginLeft = '8px';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '13px';
    btn.onclick = () => { state.filtroMeses = []; render(); };
    container.appendChild(btn);
  }
}

function ocorrenciasVisiveis() {
  let ocs = ocorrenciasFiltradas();
  if (state.filtroMeses.length) {
    const set = new Set(state.filtroMeses);
    ocs = ocs.filter(o => set.has(o.mes));
  }
  return ocs;
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
  document.getElementById('geral-entrada').textContent = fmtBRL(entrada);
  document.getElementById('geral-saida').textContent = fmtBRL(saida);
  const elT = document.getElementById('geral-total');
  elT.textContent = fmtBRL(total);
  elT.classList.remove('entrada', 'saida');
  if (total > 0) elT.classList.add('entrada');
  else if (total < 0) elT.classList.add('saida');

  const wrapComp = document.getElementById('geral-comparativo');
  wrapComp.innerHTML = '';
  if (state.filtroMeses.length >= 2) {
    wrapComp.appendChild(criarComparativo(ocorrenciasFiltradas(), state.filtroMeses));
  }
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

  for (const pid of ids) {
    container.appendChild(criarTabelaPessoa(pid));
  }

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

function criarTabelaPessoa(pid) {
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

  const cabecalho = document.createElement('div');
  cabecalho.innerHTML = `
    <h2>${escapeHtml(p.nome)}</h2>
    <div class="pessoa-resumo">
      <div><span class="label">Entrada</span><span class="valor entrada">${fmtBRL(entrada)}</span></div>
      <div><span class="label">Saída</span><span class="valor saida">${fmtBRL(saida)}</span></div>
      <div><span class="label">Total</span><span class="valor ${total > 0 ? 'entrada' : total < 0 ? 'saida' : ''}">${fmtBRL(total)}</span></div>
    </div>
  `;
  section.appendChild(cabecalho);

  // Rascunho (mantém mês e tipo entre adições; descrição/valor/parcelas resetam)
  const rasc = state.rascunhos[pid] || {
    descricao: '', valor: '', parcelas: '', tipo: 'saida', mes: mesAtual()
  };
  if (!rasc.mes) rasc.mes = mesAtual();

  const form = document.createElement('form');
  form.className = 'form-lancamento';
  form.innerHTML = `
    <input type="text" placeholder="Descrição" data-pessoa="${pid}" data-campo="descricao" value="${escapeHtml(rasc.descricao)}" />
    <input type="number" step="0.01" min="0.01" placeholder="Valor" data-pessoa="${pid}" data-campo="valor" value="${escapeHtml(rasc.valor)}" />
    <input type="number" min="1" placeholder="Parcelas" data-pessoa="${pid}" data-campo="parcelas" value="${escapeHtml(rasc.parcelas)}" />
    <input type="month" data-pessoa="${pid}" data-campo="mes" value="${escapeHtml(rasc.mes)}" title="Mês inicial" />
    <select data-pessoa="${pid}" data-campo="tipo">
      <option value="saida" ${rasc.tipo === 'saida' ? 'selected' : ''}>Saída</option>
      <option value="entrada" ${rasc.tipo === 'entrada' ? 'selected' : ''}>Entrada</option>
    </select>
    <button type="submit">Adicionar</button>
  `;

  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('focus', () => { usuarioDigitando = true; });
    el.addEventListener('blur', () => { usuarioDigitando = false; });
    el.addEventListener('input', () => {
      if (!state.rascunhos[pid]) state.rascunhos[pid] = { descricao:'', valor:'', parcelas:'', tipo:'saida', mes: mesAtual() };
      state.rascunhos[pid][el.dataset.campo] = el.value;
    });
    el.addEventListener('change', () => {
      if (!state.rascunhos[pid]) state.rascunhos[pid] = { descricao:'', valor:'', parcelas:'', tipo:'saida', mes: mesAtual() };
      state.rascunhos[pid][el.dataset.campo] = el.value;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = state.rascunhos[pid] || {};
    const descricao = (r.descricao || '').trim();
    const valor = parseFloat(r.valor);
    const parcelas = parseInt(r.parcelas || 1, 10) || 1;
    const tipo = r.tipo || 'saida';
    const mes = r.mes || mesAtual();

    if (!descricao) return alert('Descrição é obrigatória.');
    if (!(valor > 0)) return alert('Valor deve ser maior que zero.');
    if (!/^\d{4}-\d{2}$/.test(mes)) return alert('Mês inválido.');

    adicionarLancamento({
      descricao, valor, parcelas, tipo,
      pessoasIds: [pid], mesInicial: mes
    });

    // Zera descrição, valor e parcelas. Mantém mês e tipo.
    state.rascunhos[pid] = {
      descricao: '',
      valor: '',
      parcelas: '',
      tipo: tipo,
      mes: mes
    };
  });

  section.appendChild(form);

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
        const parcelaTxt = o.totalParcelas > 1
          ? `${o.parcelaAtual}/${o.totalParcelas}`
          : '—';
        const outras = o.pessoasIds.filter(x => x !== pid).map(getPessoaNome);
        const subLeg = outras.length
          ? `<span class="pessoas-sub">com ${escapeHtml(outras.join(', '))}</span>`
          : '';
        const futuroClass = m > atual ? ' futuro-row' : '';
        const tagFuturo = m > atual ? '<span class="tag-futuro">Futuro</span>' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="${futuroClass}">
            ${escapeHtml(o.descricao)}${tagFuturo}
            ${subLeg}
          </td>
          <td class="${futuroClass}"><span class="${tipoClass}">${o.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
          <td class="${futuroClass}">${parcelaTxt}</td>
          <td class="text-right ${futuroClass}"><span class="${valorClass}">${sinal} ${fmtBRL(o.valor)}</span></td>
          <td class="text-right ${futuroClass}"><button class="btn-trash" title="Remover lançamento inteiro">🗑️</button></td>
        `;
        tr.querySelector('.btn-trash').onclick = () => {
          if (confirm('Remover este lançamento? Se tiver parcelas, todas serão removidas.')) {
            removerLancamento(o.lancamentoId);
          }
        };
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

// ---------- Ações ----------
async function adicionarPessoa(nome) {
  const t = nome.trim();
  if (!t) return;
  const pessoa = { id: uid(), nome: t };
  state.pessoas.push(pessoa);
  render();
  try { await apiPost('addPessoa', pessoa); }
  catch (e) { alert('Erro ao salvar: ' + e.message); }
}

async function removerPessoa(id) {
  const p = state.pessoas.find(x => x.id === id);
  if (!p) return;
  const temLancamentos = state.lancamentos.some(l => l.pessoasIds.includes(id));
  const msg = temLancamentos
    ? `Remover "${p.nome}"? Os lançamentos continuarão, mas sem vínculo com ela.`
    : `Remover "${p.nome}"?`;
  if (!confirm(msg)) return;

  state.pessoas = state.pessoas.filter(x => x.id !== id);
  state.filtroPessoasIds = state.filtroPessoasIds.filter(x => x !== id);
  delete state.rascunhos[id];
  render();
  try { await apiPost('deletePessoa', { id }); }
  catch (e) { alert('Erro ao remover: ' + e.message); }
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
  try { await apiPost('addLancamento', novo); }
  catch (e) { alert('Erro ao salvar: ' + e.message); }
}

async function removerLancamento(id) {
  state.lancamentos = state.lancamentos.filter(l => l.id !== id);
  render();
  try { await apiPost('deleteLancamento', { id }); }
  catch (e) { alert('Erro ao remover: ' + e.message); }
}

// ---------- Bind ----------
function bindEvents() {
  const formPessoa = document.getElementById('form-pessoa');
  if (formPessoa) {
    formPessoa.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('nome-pessoa');
      adicionarPessoa(input.value);
      input.value = '';
      input.focus();
    });
  }

  setInterval(() => carregarDados(true), 20000);
  window.addEventListener('focus', () => carregarDados(true));
}

// ---------- Init ----------
bindEvents();
carregarDados();
