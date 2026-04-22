// =============================================
// Finanças do Casal — versão Google Sheets
// =============================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxO7OyPb4w7VXs_vfvg1tudnMLRBmXU93AEw0b8Z_8iMj7GMGYsPIErzYpd_i4SIu_R/exec';

let state = {
  pessoas: [],
  lancamentos: [],
  filtroPessoasIds: [],
  formPessoasIds: []
};

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

// Normaliza os dados vindos da planilha (protege contra valores nulos/estranhos)
function normalizarDados(data) {
  const pessoas = (data.pessoas || [])
    .filter(p => p && p.id)
    .map(p => ({
      id: String(p.id),
      nome: String(p.nome || '').trim()
    }));

  const lancamentos = (data.lancamentos || [])
    .filter(l => l && l.id)
    .map(l => {
      let pessoasIds = l.pessoasIds;
      if (Array.isArray(pessoasIds)) {
        pessoasIds = pessoasIds.map(x => String(x)).filter(Boolean);
      } else if (typeof pessoasIds === 'string') {
        pessoasIds = pessoasIds.split(',').map(x => x.trim()).filter(Boolean);
      } else {
        pessoasIds = [];
      }
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

async function carregarDados() {
  try {
    setLoading(true);
    const raw = await apiGet();
    console.log('Dados brutos da API:', raw);
    const data = normalizarDados(raw);
    console.log('Dados normalizados:', data);

    state.pessoas = data.pessoas;
    state.lancamentos = data.lancamentos;
    state.filtroPessoasIds = state.filtroPessoasIds.filter(id =>
      state.pessoas.some(p => p.id === id)
    );
    render();
  } catch (e) {
    console.error('ERRO completo ao carregar:', e);
    alert('Erro ao carregar dados: ' + e.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  document.body.style.opacity = on ? '0.6' : '1';
  document.body.style.pointerEvents = on ? 'none' : 'auto';
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

// ---------- Cálculos ----------
function lancamentosComQualquer(ids) {
  if (!ids.length) return state.lancamentos;
  const set = new Set(ids);
  return state.lancamentos.filter(l => l.pessoasIds.some(pid => set.has(pid)));
}

function lancamentosComTodas(ids) {
  if (!ids.length) return [];
  return state.lancamentos.filter(l =>
    ids.every(pid => l.pessoasIds.includes(pid))
  );
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
  try {
    renderListaPessoas();
    renderFiltroPessoas();
    renderPessoasLancamento();
    renderResumo();
    renderSecaoConjunto();
    renderLancamentos();
    toggleApp();
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
    container.innerHTML = '<span style="color:#999;font-size:13px;">Nenhuma pessoa cadastrada.</span>';
    return;
  }
  for (const p of state.pessoas) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `<span>${escapeHtml(p.nome)}</span>`;
    const xbtn = document.createElement('button');
    xbtn.className = 'x-btn';
    xbtn.type = 'button';
    xbtn.title = 'Remover pessoa';
    xbtn.textContent = '×';
    xbtn.onclick = (e) => {
      e.stopPropagation();
      removerPessoa(p.id);
    };
    chip.appendChild(xbtn);
    container.appendChild(chip);
  }
}

function renderFiltroPessoas() {
  const container = document.getElementById('filtro-pessoas');
  if (!container) return;
  container.innerHTML = '';
  for (const p of state.pessoas) {
    const chip = document.createElement('span');
    const ativo = state.filtroPessoasIds.includes(p.id);
    chip.className = 'chip' + (ativo ? ' active' : '');
    chip.textContent = p.nome;
    chip.onclick = () => {
      if (ativo) {
        state.filtroPessoasIds = state.filtroPessoasIds.filter(id => id !== p.id);
      } else {
        state.filtroPessoasIds.push(p.id);
      }
      render();
    };
    container.appendChild(chip);
  }
}

function renderPessoasLancamento() {
  const container = document.getElementById('pessoas-lancamento');
  if (!container) return;
  container.innerHTML = '';
  state.formPessoasIds = state.formPessoasIds.filter(id =>
    state.pessoas.some(p => p.id === id)
  );
  for (const p of state.pessoas) {
    const chip = document.createElement('span');
    const ativo = state.formPessoasIds.includes(p.id);
    chip.className = 'chip' + (ativo ? ' active' : '');
    chip.textContent = p.nome;
    chip.onclick = () => {
      if (ativo) state.formPessoasIds = state.formPessoasIds.filter(id => id !== p.id);
      else state.formPessoasIds.push(p.id);
      renderPessoasLancamento();
    };
    container.appendChild(chip);
  }
}

function renderResumo() {
  const elEntrada = document.getElementById('total-entrada');
  const elSaida = document.getElementById('total-saida');
  const elTotal = document.getElementById('total-geral');
  if (!elEntrada || !elSaida || !elTotal) return;

  const lista = lancamentosComQualquer(state.filtroPessoasIds);
  const { entrada, saida, total } = somarTotais(lista);
  elEntrada.textContent = fmtBRL(entrada);
  elSaida.textContent = fmtBRL(saida);
  elTotal.textContent = fmtBRL(total);
  elTotal.classList.remove('entrada', 'saida');
  if (total > 0) elTotal.classList.add('entrada');
  else if (total < 0) elTotal.classList.add('saida');
}

function renderSecaoConjunto() {
  const secao = document.getElementById('secao-conjunto');
  if (!secao) return;
  const ids = state.filtroPessoasIds;
  if (ids.length < 2) {
    secao.classList.add('hidden');
    return;
  }
  secao.classList.remove('hidden');
  const elNomes = document.getElementById('conjunto-nomes');
  const elE = document.getElementById('conjunto-entrada');
  const elS = document.getElementById('conjunto-saida');
  const elT = document.getElementById('conjunto-total');
  if (!elNomes || !elE || !elS || !elT) return;

  elNomes.textContent = ids.map(getPessoaNome).join(' + ');
  const lista = lancamentosComTodas(ids);
  const { entrada, saida, total } = somarTotais(lista);
  elE.textContent = fmtBRL(entrada);
  elS.textContent = fmtBRL(saida);
  elT.textContent = fmtBRL(total);
  elT.classList.remove('entrada', 'saida');
  if (total > 0) elT.classList.add('entrada');
  else if (total < 0) elT.classList.add('saida');
}

function renderLancamentos() {
  const container = document.getElementById('lista-lancamentos');
  const titulo = document.getElementById('titulo-lancamentos');
  if (!container || !titulo) return;
  container.innerHTML = '';
  const ids = state.filtroPessoasIds;

  if (ids.length === 0) {
    titulo.textContent = 'Lançamentos';
    const lista = [...state.lancamentos].reverse();
    if (!lista.length) {
      container.innerHTML = '<div class="empty">Nenhum lançamento.</div>';
      return;
    }
    lista.forEach(l => container.appendChild(criarItem(l)));
    return;
  }

  if (ids.length === 1) {
    const nome = getPessoaNome(ids[0]);
    titulo.textContent = 'Lançamentos de ' + nome;
    const lista = lancamentosComQualquer(ids).reverse();
    if (!lista.length) {
      container.innerHTML = '<div class="empty">Nenhum lançamento para esta pessoa.</div>';
      return;
    }
    lista.forEach(l => container.appendChild(criarItem(l)));
    return;
  }

  titulo.textContent = 'Lançamentos filtrados';

  const conjuntos = lancamentosComTodas(ids);
  const idsConjunto = new Set(conjuntos.map(l => l.id));

  if (conjuntos.length) {
    const h = document.createElement('div');
    h.className = 'grupo-titulo';
    h.textContent = 'Em conjunto (' + ids.map(getPessoaNome).join(' + ') + ')';
    container.appendChild(h);
    [...conjuntos].reverse().forEach(l => container.appendChild(criarItem(l)));
  }

  for (const pid of ids) {
    const individuais = state.lancamentos.filter(l =>
      l.pessoasIds.includes(pid) && !idsConjunto.has(l.id)
    );
    if (!individuais.length) continue;
    const h = document.createElement('div');
    h.className = 'grupo-titulo';
    h.textContent = 'Somente ' + getPessoaNome(pid);
    container.appendChild(h);
    [...individuais].reverse().forEach(l => container.appendChild(criarItem(l)));
  }

  if (!container.children.length) {
    container.innerHTML = '<div class="empty">Nenhum lançamento.</div>';
  }
}

function criarItem(l) {
  const total = l.valor * l.parcelas;
  const pessoasNomes = l.pessoasIds.length
    ? l.pessoasIds.map(getPessoaNome).join(' • ')
    : 'Sem pessoas';
  const parcelasTxt = l.parcelas > 1 ? ` • ${l.parcelas}x de ${fmtBRL(l.valor)}` : '';
  const tipoLabel = l.tipo === 'entrada' ? 'Entrada' : 'Saída';
  const sinal = l.tipo === 'entrada' ? '+' : '−';
  const valorClass = l.tipo === 'entrada' ? 'entrada' : 'saida';

  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
    <div class="item-info">
      <div class="item-desc">${escapeHtml(l.descricao)}</div>
      <div class="item-meta">${tipoLabel}${parcelasTxt}</div>
    </div>
    <div class="item-valor-wrap">
      <span class="item-valor ${valorClass}">${sinal} ${fmtBRL(total)}</span>
      <span class="item-pessoas-sub">${escapeHtml(pessoasNomes)}</span>
    </div>
    <button class="btn-trash" title="Remover">🗑️</button>
  `;
  div.querySelector('.btn-trash').onclick = () => removerLancamento(l.id);
  return div;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
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
    ? `Remover "${p.nome}"? Os lançamentos desta pessoa continuarão na lista, mas sem vínculo com ela.`
    : `Remover "${p.nome}"?`;
  if (!confirm(msg)) return;

  state.pessoas = state.pessoas.filter(x => x.id !== id);
  state.filtroPessoasIds = state.filtroPessoasIds.filter(x => x !== id);
  state.formPessoasIds = state.formPessoasIds.filter(x => x !== id);
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
  const formLanc = document.getElementById('form-lancamento');

  if (formPessoa) {
    formPessoa.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('nome-pessoa');
      adicionarPessoa(input.value);
      input.value = '';
      input.focus();
    });
  }

  if (formLanc) {
    formLanc.addEventListener('submit', (e) => {
      e.preventDefault();
      const descricao = document.getElementById('descricao').value;
      const valor = parseFloat(document.getElementById('valor').value);
      const parcelas = parseInt(document.getElementById('parcelas').value, 10) || 1;
      const tipo = document.getElementById('tipo').value;

      if (!descricao.trim()) return alert('Descrição é obrigatória.');
      if (!(valor > 0)) return alert('Valor deve ser maior que zero.');
      if (parcelas < 1) return alert('Parcelas deve ser ≥ 1.');

      adicionarLancamento({
        descricao, valor, parcelas, tipo,
        pessoasIds: state.formPessoasIds
      });

      e.target.reset();
      document.getElementById('parcelas').value = 1;
      state.formPessoasIds = [];
      renderPessoasLancamento();
    });
  }

  setInterval(carregarDados, 15000);
  window.addEventListener('focus', carregarDados);
}

// ---------- Init ----------
bindEvents();
carregarDados();
