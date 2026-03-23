import { api } from './services/api.js';
import { currency, dateToLabel, monthLabel, slugify } from './utils/formatters.js';

const state = {
  bootstrap: null,
  lancamentosFiltrados: [],
  conciliacoesFiltradas: [],
  filePreview: [],
  fileWorkbook: null,
  activePage: 'dashboard',
  editingLancamentoId: null
};

const app = document.querySelector('#app');
let monthlyChart;
let categoryChart;
let lancamentosTable;
let conciliacaoTable;
let resumoTable;

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 20);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function shell(content) {
  return `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-icon">₿</div>
          <div>
            <strong>FinanceFlow</strong>
            <small>MVP empresarial</small>
          </div>
        </div>
        <nav class="nav">
          ${[
            ['dashboard', 'Dashboard'],
            ['importacao', 'Importar Planilha'],
            ['lancamentos', 'Lançamentos'],
            ['resumo', 'Resumo Financeiro'],
            ['conciliacao', 'Conciliação Bancária'],
            ['classificacoes', 'Classificações'],
            ['dfc', 'DFC'],
            ['recebimentos', 'Recebimentos'],
            ['relatorios', 'Relatórios'],
            ['configuracoes', 'Configurações']
          ]
            .map(
              ([key, label]) => `
                <button class="nav-link ${state.activePage === key ? 'active' : ''}" data-page="${key}">${label}</button>
              `
            )
            .join('')}
        </nav>
      </aside>
      <main class="content">
        <header class="topbar">
          <div>
            <h1>Sistema financeiro empresarial</h1>
            <p>Automação de importação, consolidação mensal, resumo executivo e conciliação.</p>
          </div>
          <div class="topbar-actions">
            <button class="ghost-button" id="export-json">Exportar JSON</button>
            <button class="primary-button" id="refresh-data">Atualizar dados</button>
          </div>
        </header>
        ${content}
      </main>
    </div>`;
}

function renderLoginCard() {
  return `
    <section class="login-screen">
      <div class="login-card">
        <span class="badge">MVP funcional</span>
        <h2>Entrar no painel financeiro</h2>
        <p>Interface pensada para usuários não técnicos, com importação de Excel, filtros e relatórios executivos.</p>
        <form id="login-form" class="grid-form">
          <label><span>E-mail</span><input type="email" name="email" value="admin@empresa.local" required /></label>
          <label><span>Senha</span><input type="password" name="senha" value="123456" required /></label>
          <button class="primary-button" type="submit">Acessar sistema</button>
        </form>
      </div>
    </section>`;
}

function renderDashboard() {
  const data = state.bootstrap;
  const indicadores = data.indicadores;
  return shell(`
    <section class="page-grid cols-4">
      <article class="metric-card"><span>Receitas</span><strong>${currency(indicadores.totalReceitas)}</strong><small>Total consolidado</small></article>
      <article class="metric-card negative"><span>Despesas</span><strong>${currency(indicadores.totalDespesas)}</strong><small>Saídas acumuladas</small></article>
      <article class="metric-card accent"><span>Saldo</span><strong>${currency(indicadores.saldoPeriodo)}</strong><small>Resultado do período</small></article>
      <article class="metric-card"><span>Lançamentos</span><strong>${indicadores.quantidadeLancamentos}</strong><small>Itens controlados</small></article>
    </section>

    <section class="page-grid cols-2">
      <article class="panel">
        <div class="panel-header"><div><h3>Fluxo mensal</h3><p>Receitas x despesas por competência</p></div></div>
        <canvas id="monthlyChart"></canvas>
      </article>
      <article class="panel">
        <div class="panel-header"><div><h3>Top classificações</h3><p>Maiores grupos financeiros</p></div></div>
        <canvas id="categoryChart"></canvas>
      </article>
    </section>

    <section class="page-grid cols-3">
      <article class="panel compact">
        <div class="panel-header"><div><h3>Centro de custo</h3><p>Totais principais</p></div></div>
        <ul class="summary-list">
          ${data.topCentros.map((item) => `<li><span>${item.nome}</span><strong>${currency(item.total)}</strong></li>`).join('')}
        </ul>
      </article>
      <article class="panel compact">
        <div class="panel-header"><div><h3>Recebimentos</h3><p>Estrutura por origem</p></div></div>
        <ul class="summary-list">
          ${data.recebimentos.map((item) => `<li><span>${item.origem}</span><strong>${currency(item.total)}</strong></li>`).join('')}
        </ul>
      </article>
      <article class="panel compact">
        <div class="panel-header"><div><h3>Conciliação</h3><p>Status atuais</p></div></div>
        <ul class="summary-list">
          ${data.conciliacaoStatus.map((item) => `<li><span>${item.status}</span><strong>${item.total}</strong></li>`).join('')}
        </ul>
      </article>
    </section>
  `);
}

function renderImportacao() {
  const previewRows = state.filePreview.slice(0, 8);
  return shell(`
    <section class="page-grid cols-2">
      <article class="panel">
        <div class="panel-header"><div><h3>Importar planilha</h3><p>Suporte a .xls e .xlsx com múltiplas abas</p></div></div>
        <form id="import-form" class="grid-form">
          <label class="full"><span>Arquivo Excel</span><input type="file" id="excel-file" accept=".xls,.xlsx" required /></label>
          <label><span>Banco padrão</span><input type="text" name="defaultBank" value="Banco consolidado" /></label>
          <label><span>Aba sugerida</span><input type="text" id="sheet-detected" disabled value="${state.fileWorkbook?.sheetNames?.join(', ') || ''}" /></label>
          <div class="mapping-box full">
            <h4>Mapeamento inteligente</h4>
            <p>O parser procura variações como “Dt liquidação”, “Conta financeira”, “Valor”, “Centro custo”, “Ds observação”, “Classificação”.</p>
          </div>
          <button class="primary-button" type="submit" ${state.filePreview.length ? '' : 'disabled'}>Salvar importação</button>
        </form>
      </article>
      <article class="panel">
        <div class="panel-header"><div><h3>Pré-visualização</h3><p>Linhas detectadas antes de gravar no banco</p></div></div>
        <div class="preview-meta">
          <span>Abas detectadas: <strong>${state.fileWorkbook?.sheetNames?.length || 0}</strong></span>
          <span>Linhas válidas: <strong>${state.filePreview.length}</strong></span>
        </div>
        <div class="table-preview">
          <table>
            <thead><tr><th>Data</th><th>Conta</th><th>Valor</th><th>Centro</th><th>Descrição</th></tr></thead>
            <tbody>
              ${previewRows.length ? previewRows.map((row) => `<tr><td>${dateToLabel(row.data)}</td><td>${row.contaFinanceira}</td><td>${currency(row.valor)}</td><td>${row.centroCusto}</td><td>${row.descricao}</td></tr>`).join('') : '<tr><td colspan="5">Selecione uma planilha para ver a prévia.</td></tr>'}
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="panel-header"><div><h3>Histórico de importações</h3><p>Controle de data/hora, total de linhas e prevenção de duplicidades por hash</p></div></div>
      <div class="table-preview">
        <table>
          <thead><tr><th>Arquivo</th><th>Importado em</th><th>Abas</th><th>Linhas</th></tr></thead>
          <tbody>
            ${state.bootstrap.imports.map((item) => `<tr><td>${item.fileName}</td><td>${new Date(item.importedAt).toLocaleString('pt-BR')}</td><td>${item.totalSheets}</td><td>${item.totalRows}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `);
}

function renderLancamentos() {
  return shell(`
    <section class="panel">
      <div class="panel-header split">
        <div><h3>Gestão de lançamentos</h3><p>Filtros por período, conta, centro de custo, texto e status de origem</p></div>
        <button class="primary-button" id="open-manual-form">Novo lançamento</button>
      </div>
      <div class="filters-grid">
        <label><span>Período</span><input id="filter-periodo" type="month" /></label>
        <label><span>Conta financeira</span><input id="filter-conta" type="text" placeholder="BB, Bradesco..." /></label>
        <label><span>Centro de custo</span><input id="filter-centro" type="text" placeholder="Administração" /></label>
        <label><span>Classificação</span><input id="filter-classificacao" type="text" placeholder="Pessoal, Receita..." /></label>
        <label><span>Texto</span><input id="filter-texto" type="text" placeholder="observação" /></label>
        <label><span>Origem</span>
          <select id="filter-origem"><option value="">Todas</option><option value="manual">Manual</option><option value="importado">Importado</option></select>
        </label>
      </div>
      <div id="lancamentos-table"></div>
    </section>

    <section class="panel hidden" id="manual-form-panel">
      <div class="panel-header"><div><h3>Lançamento manual</h3><p>Criação rápida com validação básica e reaproveitamento de cadastros</p></div></div>
      <form id="manual-lancamento-form" class="grid-form cols-3">
        <label><span>Data</span><input name="data" type="date" required /></label>
        <label><span>Tipo</span><select name="tipo"><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
        <label><span>Valor</span><input name="valor" type="number" step="0.01" required /></label>
        <label><span>Conta financeira</span><input name="contaFinanceira" list="contas-list" required /></label>
        <label><span>Centro de custo</span><input name="centroCusto" list="centros-list" required /></label>
        <label><span>Classificação</span><input name="classificacao" list="classificacoes-list" required /></label>
        <label class="full"><span>Descrição</span><input name="descricao" type="text" required /></label>
        <label><span>Referência</span><input name="referencia" type="text" /></label>
        <label><span>Origem de recebimento</span><input name="origemRecebimento" type="text" /></label>
        <div class="full form-actions">
          <button class="ghost-button" type="reset">Limpar</button>
          <button class="primary-button" type="submit">Salvar lançamento</button>
        </div>
      </form>
      <datalist id="contas-list">${state.bootstrap.contasFinanceiras.map((item) => `<option value="${item.nome}"></option>`).join('')}</datalist>
      <datalist id="centros-list">${state.bootstrap.centrosCusto.map((item) => `<option value="${item.nome}"></option>`).join('')}</datalist>
      <datalist id="classificacoes-list">${state.bootstrap.classificacoes.map((item) => `<option value="${item.nome}"></option>`).join('')}</datalist>
    </section>
  `);
}

function renderResumo() {
  return shell(`
    <section class="page-grid cols-2">
      <article class="panel">
        <div class="panel-header"><div><h3>Resumo financeiro</h3><p>Despesas pagas, totais mensais, subtotais e comparativo entre competências</p></div></div>
        <div id="resumo-table"></div>
      </article>
      <article class="panel compact">
        <div class="panel-header"><div><h3>DFC resumido</h3><p>Base para evolução do relatório gerencial</p></div></div>
        <ul class="summary-list dfc-list">
          ${state.bootstrap.dfc.map((item) => `<li><span>${monthLabel(item.periodo)}</span><strong>${currency(item.saldoFinal)}</strong><small>Entradas ${currency(item.entradasOperacionais)} • Saídas ${currency(item.saidasOperacionais)}</small></li>`).join('')}
        </ul>
      </article>
    </section>
  `);
}

function renderConciliacao() {
  return shell(`
    <section class="panel">
      <div class="panel-header split">
        <div><h3>Conciliação bancária</h3><p>Comparativo entre extrato e sistema com destaque para divergências</p></div>
        <div class="inline-actions">
          <label><span>Status</span><select id="filter-conciliacao-status"><option value="">Todos</option><option value="Conciliado">Conciliado</option><option value="Divergente">Divergente</option></select></label>
          <label><span>Período</span><input type="month" id="filter-conciliacao-periodo" /></label>
        </div>
      </div>
      <div id="conciliacao-table"></div>
    </section>
  `);
}

function renderPlaceholder(title, description) {
  return shell(`
    <section class="panel placeholder-panel">
      <span class="badge">Próxima fase</span>
      <h3>${title}</h3>
      <p>${description}</p>
      <ul class="roadmap-list">
        <li>Controle de usuários e perfis de acesso.</li>
        <li>Exportações nativas em Excel/PDF e impressão.</li>
        <li>DFC analítico e relatórios gerenciais avançados.</li>
        <li>Cadastros auxiliares e regras adicionais por banco/conta.</li>
      </ul>
    </section>
  `);
}

function render() {
  if (!state.bootstrap) {
    app.innerHTML = renderLoginCard();
    document.querySelector('#login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      await loadData();
      state.activePage = 'dashboard';
      render();
    });
    return;
  }

  const pages = {
    dashboard: renderDashboard,
    importacao: renderImportacao,
    lancamentos: renderLancamentos,
    resumo: renderResumo,
    conciliacao: renderConciliacao,
    classificacoes: () => renderPlaceholder('Classificações financeiras', 'Estrutura hierárquica preparada para categoria principal, subcategoria e conta financeira vinculada.'),
    dfc: () => renderPlaceholder('Demonstração de Fluxo de Caixa', 'A camada de consolidação já entrega saldo inicial, entradas, saídas e saldo final por mês.'),
    recebimentos: () => renderPlaceholder('Estrutura de recebimentos', 'Base pronta para consolidar caixa, BB, Bradesco, Sicoob, cartão, taxa e outras origens.'),
    relatorios: () => renderPlaceholder('Relatórios e exportações', 'A interface já possui botão de exportação JSON e está preparada para Excel/PDF via jsPDF/SheetJS.'),
    configuracoes: () => renderPlaceholder('Configurações', 'Cadastros auxiliares e preferências do sistema poderão ser evoluídos nesta área.')
  };

  app.innerHTML = pages[state.activePage]();
  attachCommonEvents();
  attachPageEvents();
}

function attachCommonEvents() {
  document.querySelectorAll('[data-page]').forEach((button) => {
    button.addEventListener('click', () => {
      state.activePage = button.dataset.page;
      render();
    });
  });

  document.querySelector('#refresh-data')?.addEventListener('click', async () => {
    await loadData();
    showToast('Dados atualizados com sucesso.');
    render();
  });

  document.querySelector('#export-json')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state.bootstrap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'financeflow-export.json';
    link.click();
    URL.revokeObjectURL(url);
  });
}

function attachPageEvents() {
  if (state.activePage === 'dashboard') drawCharts();
  if (state.activePage === 'importacao') attachImportEvents();
  if (state.activePage === 'lancamentos') attachLancamentosEvents();
  if (state.activePage === 'resumo') attachResumoTable();
  if (state.activePage === 'conciliacao') attachConciliacaoEvents();
}

function drawCharts() {
  const fluxo = state.bootstrap.fluxoMensal;
  monthlyChart?.destroy();
  categoryChart?.destroy();

  monthlyChart = new Chart(document.getElementById('monthlyChart'), {
    type: 'bar',
    data: {
      labels: fluxo.map((item) => monthLabel(item.periodo)),
      datasets: [
        { label: 'Receitas', data: fluxo.map((item) => item.receitas), backgroundColor: '#2563eb', borderRadius: 10 },
        { label: 'Despesas', data: fluxo.map((item) => item.despesas), backgroundColor: '#ef4444', borderRadius: 10 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  categoryChart = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: state.bootstrap.topClassificacoes.map((item) => item.nome),
      datasets: [{
        data: state.bootstrap.topClassificacoes.map((item) => Math.abs(item.total)),
        backgroundColor: ['#0f172a', '#2563eb', '#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function attachImportEvents() {
  document.querySelector('#excel-file')?.addEventListener('change', handleExcelSelection);
  document.querySelector('#import-form')?.addEventListener('submit', handleImportSubmit);
}

function excelDateToIso(excelValue) {
  if (typeof excelValue === 'number') {
    const jsDate = new Date(Math.round((excelValue - 25569) * 86400 * 1000));
    return jsDate.toISOString().slice(0, 10);
  }
  if (typeof excelValue === 'string') {
    const brMatch = excelValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    const iso = new Date(excelValue);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

function guessFieldName(header) {
  const normalized = slugify(String(header || ''));
  if (/(dt|data).*(liquid|emiss|pag)/.test(normalized)) return 'data';
  if (/conta.*financeira/.test(normalized)) return 'contaFinanceira';
  if (/valor/.test(normalized)) return 'valor';
  if (/centro.*custo/.test(normalized)) return 'centroCusto';
  if (/(observ|histor|descri|descricao)/.test(normalized)) return 'descricao';
  if (/(classif|codigo|categoria)/.test(normalized)) return 'classificacao';
  if (/refer/.test(normalized)) return 'referencia';
  return null;
}

function extractRowsFromWorkbook(workbook) {
  const rows = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const headerIndex = matrix.findIndex((row) => row.some((cell) => guessFieldName(cell)));
    if (headerIndex === -1) return;
    const headers = matrix[headerIndex];
    const mapping = {};
    headers.forEach((header, index) => {
      const field = guessFieldName(header);
      if (field) mapping[field] = index;
    });

    matrix.slice(headerIndex + 1).forEach((row) => {
      if (!row.some((cell) => String(cell).trim())) return;
      const valor = Number(String(row[mapping.valor] || '0').replace(/\./g, '').replace(',', '.')) || Number(row[mapping.valor]) || 0;
      rows.push({
        data: excelDateToIso(row[mapping.data]),
        competencia: excelDateToIso(row[mapping.data]).slice(0, 7),
        contaFinanceira: row[mapping.contaFinanceira] || 'Conta não mapeada',
        valor,
        centroCusto: row[mapping.centroCusto] || 'Sem centro',
        descricao: row[mapping.descricao] || 'Sem descrição',
        classificacao: row[mapping.classificacao] || sheetName,
        referencia: row[mapping.referencia] || '',
        origem: 'importado',
        tipo: /receita|receb/i.test(sheetName) ? 'receita' : 'despesa',
        origemRecebimento: row[mapping.contaFinanceira] || sheetName,
        sheetName
      });
    });
  });
  return rows.filter((row) => row.valor !== 0 || row.descricao !== 'Sem descrição');
}

async function handleExcelSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const rows = extractRowsFromWorkbook(workbook);
  state.fileWorkbook = { name: file.name, sheetNames: workbook.SheetNames };
  state.filePreview = rows;
  render();
  showToast(`Planilha analisada: ${rows.length} linhas válidas encontradas.`);
}

async function handleImportSubmit(event) {
  event.preventDefault();
  if (!state.filePreview.length || !state.fileWorkbook) return;
  const formData = new FormData(event.currentTarget);
  try {
    const response = await api.importWorkbook({
      fileName: state.fileWorkbook.name,
      totalSheets: state.fileWorkbook.sheetNames.length,
      defaultBank: formData.get('defaultBank'),
      rows: state.filePreview,
      columnMapping: {
        data: 'Dt liquidação / Dt emissão',
        contaFinanceira: 'Conta financeira',
        valor: 'Valor',
        centroCusto: 'Centro custo',
        descricao: 'Ds observação',
        classificacao: 'Aba ou coluna de classificação'
      }
    });
    state.bootstrap = { ...state.bootstrap, ...response.bootstrap, classificacoes: state.bootstrap.classificacoes, contasFinanceiras: state.bootstrap.contasFinanceiras, centrosCusto: state.bootstrap.centrosCusto, usuarios: state.bootstrap.usuarios };
    state.filePreview = [];
    state.fileWorkbook = null;
    showToast(response.message);
    render();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

function applyLancamentosFilters() {
  const periodo = document.querySelector('#filter-periodo')?.value || '';
  const conta = slugify(document.querySelector('#filter-conta')?.value || '');
  const centro = slugify(document.querySelector('#filter-centro')?.value || '');
  const classificacao = slugify(document.querySelector('#filter-classificacao')?.value || '');
  const texto = slugify(document.querySelector('#filter-texto')?.value || '');
  const origem = document.querySelector('#filter-origem')?.value || '';

  state.lancamentosFiltrados = state.bootstrap.lancamentos.filter((item) => {
    return (!periodo || item.competencia === periodo)
      && (!origem || item.origem === origem)
      && (!conta || slugify(item.contaFinanceira).includes(conta))
      && (!centro || slugify(item.centroCusto).includes(centro))
      && (!classificacao || slugify(item.classificacao).includes(classificacao))
      && (!texto || slugify(`${item.descricao} ${item.referencia}`).includes(texto));
  });
  lancamentosTable?.replaceData(state.lancamentosFiltrados);
}

function attachLancamentosEvents() {
  state.lancamentosFiltrados = [...state.bootstrap.lancamentos];
  lancamentosTable = new Tabulator('#lancamentos-table', {
    data: state.lancamentosFiltrados,
    layout: 'fitColumns',
    height: 420,
    pagination: true,
    paginationSize: 8,
    columns: [
      { title: 'Data', field: 'data', formatter: (cell) => dateToLabel(cell.getValue()) },
      { title: 'Período', field: 'competencia', formatter: (cell) => monthLabel(cell.getValue()) },
      { title: 'Conta financeira', field: 'contaFinanceira' },
      { title: 'Centro custo', field: 'centroCusto' },
      { title: 'Classificação', field: 'classificacao' },
      { title: 'Descrição', field: 'descricao', widthGrow: 2 },
      { title: 'Tipo', field: 'tipo' },
      { title: 'Valor', field: 'valor', hozAlign: 'right', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Origem', field: 'origem' },
      {
        title: 'Ações',
        formatter: () => '<button class="table-action edit">Editar</button> <button class="table-action delete danger">Excluir</button>',
        width: 160,
        hozAlign: 'center',
        cellClick: async (event, cell) => {
          const row = cell.getRow().getData();
          if (event.target.classList.contains('delete')) {
            if (!confirm(`Excluir lançamento ${row.descricao}?`)) return;
            await api.deleteLancamento(row.id);
            await loadData();
            showToast('Lançamento excluído.');
            render();
          }
          if (event.target.classList.contains('edit')) {
            document.querySelector('#manual-form-panel').classList.remove('hidden');
            const form = document.querySelector('#manual-lancamento-form');
            Object.entries(row).forEach(([key, value]) => form.elements[key] && (form.elements[key].value = value));
            state.editingLancamentoId = row.id;
          }
        }
      }
    ]
  });

  ['#filter-periodo', '#filter-conta', '#filter-centro', '#filter-classificacao', '#filter-texto', '#filter-origem'].forEach((selector) => {
    document.querySelector(selector)?.addEventListener('input', applyLancamentosFilters);
    document.querySelector(selector)?.addEventListener('change', applyLancamentosFilters);
  });

  document.querySelector('#open-manual-form')?.addEventListener('click', () => document.querySelector('#manual-form-panel').classList.toggle('hidden'));
  document.querySelector('#manual-lancamento-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      if (state.editingLancamentoId) {
        await api.updateLancamento(state.editingLancamentoId, payload);
        state.editingLancamentoId = null;
        showToast('Lançamento atualizado.');
      } else {
        await api.createLancamento(payload);
        showToast('Lançamento criado com sucesso.');
      }
      event.currentTarget.reset();
      await loadData();
      render();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

function attachResumoTable() {
  resumoTable = new Tabulator('#resumo-table', {
    data: state.bootstrap.resumoFinanceiro,
    layout: 'fitColumns',
    columns: [
      { title: 'Período', field: 'periodo', formatter: (cell) => monthLabel(cell.getValue()) },
      { title: 'Receitas', field: 'receitas', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Despesas', field: 'despesas', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Saldo', field: 'saldo', formatter: (cell) => currency(cell.getValue()) }
    ]
  });
}

function attachConciliacaoEvents() {
  state.conciliacoesFiltradas = [...state.bootstrap.conciliacoes];
  conciliacaoTable = new Tabulator('#conciliacao-table', {
    data: state.conciliacoesFiltradas,
    layout: 'fitColumns',
    columns: [
      { title: 'Período', field: 'periodo', formatter: (cell) => monthLabel(cell.getValue()) },
      { title: 'Banco', field: 'banco' },
      { title: 'Extrato', field: 'valorExtrato', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Sistema', field: 'valorSistema', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Diferença', field: 'diferenca', formatter: (cell) => currency(cell.getValue()) },
      { title: 'Status', field: 'status', formatter: (cell) => `<span class="status ${slugify(cell.getValue())}">${cell.getValue()}</span>` }
    ],
    rowFormatter: (row) => {
      if (row.getData().status === 'Divergente') {
        row.getElement().classList.add('row-warning');
      }
    }
  });

  const applyFilters = () => {
    const status = document.querySelector('#filter-conciliacao-status')?.value || '';
    const periodo = document.querySelector('#filter-conciliacao-periodo')?.value || '';
    state.conciliacoesFiltradas = state.bootstrap.conciliacoes.filter((item) => (!status || item.status === status) && (!periodo || item.periodo === periodo));
    conciliacaoTable.replaceData(state.conciliacoesFiltradas);
  };

  document.querySelector('#filter-conciliacao-status')?.addEventListener('change', applyFilters);
  document.querySelector('#filter-conciliacao-periodo')?.addEventListener('input', applyFilters);
}

async function loadData() {
  state.bootstrap = await api.bootstrap();
  state.lancamentosFiltrados = [...state.bootstrap.lancamentos];
  state.conciliacoesFiltradas = [...state.bootstrap.conciliacoes];
}

render();
