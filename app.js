// =============================================
// Finanças do Casal — versão Google Sheets
// Estrutura: uma tabela por pessoa selecionada
// =============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxO7OyPb4w7VXs_vfvg1tudnMLRBmXU93AEw0b8Z_8iMj7GMGYsPIErzYpd_i4SIu_R/exec';

let state = {
  pessoas: [],
  lancamentos: [],
  filtroPessoasIds: [],
  // Rascunho dos formulários por pessoa (não perder o que está digitando ao atualizar)
  rascunhos: {}
};

let usuarioDigitando = false; // pausa atualizações automáticas enquanto digita

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
      return {
        id: String(l.id),
        descricao: String(l.descricao || ''),
        valor: Number(l.valor) || 0,
        parcelas: Math.max(1, parseInt(l.parcelas, 10) || 1),
        tipo: l.tipo === 'entrada' ? 'entrada' : 'saida',
        pessoasIds
      };
    });

  return { pessoas, lancamentos };
}

async function carregarDados(silencioso = false) {
  if (usuarioDigitando) return; // não atualiza enquanto digita
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

// ---------- Cálculos ----------
function lancamentosDaPessoa(pid) {
  return state.lancamentos.filter(l => l.pessoasIds.includes(pid));
}

// União: lançamentos que envolvem pelo menos uma das pessoas (sem duplicar)
function lancamentosUniao(ids) {
  const set = new Set(ids);
  return state.lancamentos.filter(l => l.pessoasIds.some(pid => set.has(pid)));
}

function somarTotais(lista) {
  let entrada = 0, saida = 0;
  for (const l of lista) {
    const t = l.valor * l.parcelas;
    if (l.tipo === 'entrada') entrada += t; else saida += t;
  }
  return { entrada, saida, total: entrada - saida };
}

// ---------- Render ----------
function render() {
  renderListaPessoas();
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

  const lista = lancamentosUniao(ids);
  const { entrada, saida, total } = somarTotais(lista);
  document.getElementById('geral-entrada').textContent = fmtBRL(entrada);
  document.getElementById('geral-saida').textContent = fmtBRL(saida);
  const elT = document.getElementById('geral-total');
  elT.textContent = fmtBRL(total);
  elT.classList.remove('entrada', 'saida');
  if (total > 0) elT.classList.add('entrada');
  else if (total < 0) elT.classList.add('saida');
}

function renderTabelasPessoas() {
  const container = document.getElementById('tabelas-pessoas');
  if (!container) return;

  // Quais pessoas mostrar: filtradas ou todas
  const ids = state.filtroPessoasIds.length
    ? state.filtroPessoasIds
    : state.pessoas.map(p => p.id);

  // Preserva foco do input ativo antes de redesenhar
  const ativo = document.activeElement;
  const ativoInfo = ativo && ativo.dataset && ativo.dataset.pessoa
    ? { pessoaId: ativo.dataset.pessoa, campo: ativo.dataset.campo, pos: ativo.selectionStart }
    : null;

  container.innerHTML = '';

  if (!ids.length) {
    return;
  }

  for (const pid of ids) {
    container.appendChild(criarTabelaPessoa(pid));
  }

  // Restaura foco
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

  const lista = lancamentosDaPessoa(pid);
  const { entrada, saida, total } = somarTotais(lista);

  const section = document.createElement('section');
  section.className = 'card tabela-pessoa';

  // Cabeçalho + resumo
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

  // Form de lançamento
  const rasc = state.rascunhos[pid] || { descricao: '', valor: '', parcelas: '1', tipo: 'saida' };
  const form = document.createElement('form');
  form.className = 'form-lancamento';
  form.innerHTML = `
    <input type="text" placeholder="Descrição" data-pessoa="${pid}" data-campo="descricao" value="${escapeHtml(rasc.descricao)}" />
    <input type="number" step="0.01" min="0.01" placeholder="Valor" data-pessoa="${pid}" data-campo="valor" value="${escapeHtml(rasc.valor)}" />
    <input type="number" min="1" placeholder="Parcelas" data-pessoa="${pid}" data-campo="parcelas" value="${escapeHtml(rasc.parcelas)}" />
    <select data-pessoa="${pid}" data-campo="tipo">
      <option value="saida" ${rasc.tipo === 'saida' ? 'selected' : ''}>Saída</option>
      <option value="entrada" ${rasc.tipo === 'entrada' ? 'selected' : ''}>Entrada</option>
    </select>
    <button type="submit">Adicionar</button>
  `;

  // Eventos dos inputs
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('focus', () => { usuarioDigitando = true; });
    el.addEventListener('blur', () => { usuarioDigitando = false; });
    el.addEventListener('input', (e) => {
      if (!state.rascunhos[pid]) state.rascunhos[pid] = { descricao:'', valor:'', parcelas:'1', tipo:'saida' };
      state.rascunhos[pid][el.dataset.campo] = el.value;
    });
    el.addEventListener('change', (e) => {
      if (!state.rascunhos[pid]) state.rascunhos[pid] = { descricao:'', valor:'', parcelas:'1', tipo:'saida' };
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

    if (!descricao) return alert('Descrição é obrigatória.');
    if (!(valor > 0)) return alert('Valor deve ser maior que zero.');

    adicionarLancamento({ descricao, valor, parcelas, tipo, pessoasIds: [pid] });
    state.rascunhos[pid] = { descricao:'', valor:'', parcelas:'1', tipo: 'saida' };
  });

  section.appendChild(form);

  // Tabela de lançamentos
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';
  if (!lista.length) {
    wrap.innerHTML = '<div class="empty">Nenhum lançamento.</div>';
  } else {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Parcelas</th>
          <th class="text-right">Valor</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector('tbody');

    [...lista].reverse().forEach(l => {
      const total = l.valor * l.parcelas;
      const parcelasTxt = l.parcelas > 1 ? `${l.parcelas}x de ${fmtBRL(l.valor)}` : '1x';
      const tipoClass = l.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida';
      const valorClass = l.tipo === 'entrada' ? 'valor-entrada' : 'valor-saida';
      const sinal = l.tipo === 'entrada' ? '+' : '−';

      // Sublegenda com outras pessoas (se o lançamento é compartilhado)
      const outras = l.pessoasIds.filter(x => x !== pid).map(getPessoaNome);
      const subLegenda = outras.length
        ? `<span class="pessoas-sub">com ${escapeHtml(outras.join(', '))}</span>`
        : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          ${escapeHtml(l.descricao)}
          ${subLegenda}
        </td>
        <td><span class="${tipoClass}">${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
        <td>${parcelasTxt}</td>
        <td class="text-right"><span class="${valorClass}">${sinal} ${fmtBRL(total)}</span></td>
        <td class="text-right"><button class="btn-trash" title="Remover">🗑️</button></td>
      `;
      tr.querySelector('.btn-trash').onclick = () => removerLancamento(l.id);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
  }
  section.appendChild(wrap);

  return section;
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
    ? `Remover "${p.nome}"? Os lançamentos desta pessoa continuarão, mas sem vínculo com ela.`
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
    pessoasIds: [...l.pessoasIds]
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

  // Atualização automática mais suave: só quando não está digitando
  setInterval(() => carregarDados(true), 20000);
  window.addEventListener('focus', () => carregarDados(true));
}

// ---------- Init ----------
bindEvents();
carregarDados();
