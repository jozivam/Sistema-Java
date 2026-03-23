const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 10 * 1024 * 1024) {
        reject(new Error('Payload muito grande.'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function createHash(payload) {
  return crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex');
}

function normalizeMoney(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const normalized = value
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferTipo(classificacao = '', valor = 0) {
  const texto = classificacao.toLowerCase();
  if (texto.includes('receita') || valor > 0 && /(receb|repasse|particular|sus|unimed)/i.test(texto)) {
    return 'receita';
  }
  return valor >= 0 ? 'despesa' : 'receita';
}

function deriveResumo(db) {
  const lancamentos = db.lancamentos;
  const receitas = lancamentos.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + item.valor, 0);
  const despesas = lancamentos.filter((item) => item.tipo === 'despesa').reduce((sum, item) => sum + item.valor, 0);
  const saldo = receitas - despesas;

  const mensalMap = new Map();
  const classificacaoMap = new Map();
  const centroCustoMap = new Map();
  const conciliacaoMap = new Map();
  const recebimentosMap = new Map();

  lancamentos.forEach((item) => {
    const periodo = item.competencia || 'Sem período';
    const mensal = mensalMap.get(periodo) || { periodo, receitas: 0, despesas: 0, saldo: 0 };
    if (item.tipo === 'receita') mensal.receitas += item.valor;
    else mensal.despesas += item.valor;
    mensal.saldo = mensal.receitas - mensal.despesas;
    mensalMap.set(periodo, mensal);

    const chaveClassificacao = item.classificacao || 'Não classificado';
    classificacaoMap.set(chaveClassificacao, (classificacaoMap.get(chaveClassificacao) || 0) + item.valor);

    const chaveCentro = item.centroCusto || 'Sem centro';
    centroCustoMap.set(chaveCentro, (centroCustoMap.get(chaveCentro) || 0) + item.valor);

    const origemConta = item.origemRecebimento || item.contaFinanceira || 'Outros';
    recebimentosMap.set(origemConta, (recebimentosMap.get(origemConta) || 0) + (item.tipo === 'receita' ? item.valor : 0));
  });

  db.conciliacoes.forEach((item) => {
    conciliacaoMap.set(item.status, (conciliacaoMap.get(item.status) || 0) + 1);
  });

  const topClassificacoes = [...classificacaoMap.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 8);

  const topCentros = [...centroCustoMap.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    .slice(0, 8);

  const fluxoMensal = [...mensalMap.values()].sort((a, b) => a.periodo.localeCompare(b.periodo));
  const recebimentos = [...recebimentosMap.entries()].map(([origem, total]) => ({ origem, total })).sort((a, b) => b.total - a.total);

  const resumoFinanceiro = fluxoMensal.map((item) => ({
    ...item,
    subtotalReceitas: item.receitas,
    subtotalDespesas: item.despesas
  }));

  const dfc = fluxoMensal.reduce((acc, item, index) => {
    const saldoInicial = index === 0 ? 0 : acc[index - 1].saldoFinal;
    const saldoFinal = saldoInicial + item.receitas - item.despesas;
    acc.push({
      periodo: item.periodo,
      saldoInicial,
      entradasOperacionais: item.receitas,
      saidasOperacionais: item.despesas,
      saldoFinal
    });
    return acc;
  }, []);

  return {
    indicadores: {
      totalReceitas: receitas,
      totalDespesas: despesas,
      saldoPeriodo: saldo,
      quantidadeLancamentos: lancamentos.length,
      totalImportacoes: db.imports.length,
      divergenciasConciliacao: db.conciliacoes.filter((item) => item.status === 'Divergente').length
    },
    fluxoMensal,
    topClassificacoes,
    topCentros,
    resumoFinanceiro,
    dfc,
    recebimentos,
    conciliacaoStatus: [...conciliacaoMap.entries()].map(([status, total]) => ({ status, total }))
  };
}

function seedIfEmpty() {
  const db = readDb();
  if (db.lancamentos.length > 0) return;

  const samples = [
    ['2025-07-04', '2025-07', 'BB Conta Movimento', 'Administração', 'Receita Operacional', 'Particular', 190607.08, 'receita', 'BB'],
    ['2025-07-15', '2025-07', 'Bradesco Operacional', 'Enfermagem', 'Pessoal', 'Férias colaboradoras', 5189.46, 'despesa', 'Bradesco'],
    ['2025-08-04', '2025-08', 'Sicoob Recebimentos', 'Administração', 'Tarifas Bancárias', 'Tarifa bancária', 252.00, 'despesa', 'Sicoob'],
    ['2025-08-20', '2025-08', 'BB Conta Movimento', 'Centro Cirúrgico', 'Material Hospitalar e Medicamentos', 'Foco cirúrgico de teto', 6300.00, 'despesa', 'BB'],
    ['2025-09-05', '2025-09', 'Caixa Interno', 'Serviço de Nutrição e Dietética', 'Receita Operacional', 'Recebimento em caixa', 7982.50, 'receita', 'Caixa'],
    ['2025-09-29', '2025-09', 'Sicoob Recebimentos', 'CAF', 'Material Hospitalar e Medicamentos', 'Mat/med hospitalar', 3325.50, 'despesa', 'Sicoob'],
    ['2025-10-06', '2025-10', 'BB Conta Movimento', 'Administração', 'Pessoal', 'Folha de pagamento', 190658.83, 'despesa', 'BB'],
    ['2025-10-27', '2025-10', 'Bradesco Operacional', 'Administração', 'Receita Operacional', 'Recebimento SUS', 631599.90, 'receita', 'Bradesco'],
    ['2026-01-30', '2026-01', 'BB Conta Movimento', 'Administração', 'Parcelamentos', 'Parcelamento tributos federais', 1123.58, 'despesa', 'BB'],
    ['2026-02-27', '2026-02', 'Sicoob Recebimentos', 'Administração', 'Receita Operacional', 'Recebimento Servir', 1939642.24, 'receita', 'Sicoob']
  ];

  db.lancamentos = samples.map((item, index) => ({
    id: `seed-${index + 1}`,
    data: item[0],
    competencia: item[1],
    contaFinanceira: item[2],
    centroCusto: item[3],
    classificacao: item[4],
    descricao: item[5],
    valor: item[6],
    tipo: item[7],
    origem: 'importado',
    origemRecebimento: item[8],
    referencia: `REF-${index + 1}`,
    importacaoId: 'seed-import',
    createdAt: new Date().toISOString()
  }));

  db.imports = [{
    id: 'seed-import',
    fileName: 'base-exemplo-financeira.xlsx',
    importedAt: new Date().toISOString(),
    totalSheets: 4,
    totalRows: db.lancamentos.length,
    hash: createHash(db.lancamentos.map((item) => item.id))
  }];

  db.conciliacoes = [
    { id: 'conc-1', periodo: '2026-02', banco: 'BB', valorExtrato: 2665736.02, valorSistema: 2570710.71, diferenca: 95025.31, status: 'Divergente' },
    { id: 'conc-2', periodo: '2026-02', banco: 'Sicoob', valorExtrato: 611344.10, valorSistema: 611344.10, diferenca: 0, status: 'Conciliado' },
    { id: 'conc-3', periodo: '2026-01', banco: 'Bradesco', valorExtrato: 16163.38, valorSistema: 16163.38, diferenca: 0, status: 'Conciliado' }
  ];

  writeDb(db);
}

function handleApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    });
    return res.end();
  }

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, now: new Date().toISOString() });
  }

  if (pathname === '/api/bootstrap' && req.method === 'GET') {
    const db = readDb();
    return sendJson(res, 200, {
      ...deriveResumo(db),
      imports: db.imports,
      lancamentos: db.lancamentos,
      conciliacoes: db.conciliacoes,
      classificacoes: db.classificacoes,
      contasFinanceiras: db.contasFinanceiras,
      centrosCusto: db.centrosCusto,
      usuarios: db.usuarios
    });
  }

  if (pathname === '/api/imports' && req.method === 'POST') {
    return parseBody(req)
      .then((payload) => {
        const db = readDb();
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        const importHash = createHash(rows.map((row) => [row.data, row.valor, row.descricao, row.contaFinanceira]));
        const alreadyExists = db.imports.some((item) => item.hash === importHash);
        if (alreadyExists) {
          return sendJson(res, 409, { message: 'Esta importação já foi registrada anteriormente.' });
        }

        const importId = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const mappedRows = rows.map((row, index) => ({
          id: crypto.randomUUID(),
          data: row.data || timestamp.slice(0, 10),
          competencia: row.competencia || (row.data || timestamp).slice(0, 7),
          contaFinanceira: row.contaFinanceira || 'Não informado',
          centroCusto: row.centroCusto || 'Sem centro de custo',
          classificacao: row.classificacao || 'Não classificado',
          descricao: row.descricao || `Linha importada ${index + 1}`,
          valor: normalizeMoney(row.valor),
          tipo: row.tipo || inferTipo(row.classificacao || '', normalizeMoney(row.valor)),
          origem: row.origem || 'importado',
          origemRecebimento: row.origemRecebimento || row.contaFinanceira || 'Outros',
          referencia: row.referencia || '',
          importacaoId: importId,
          createdAt: timestamp,
          sheetName: row.sheetName || payload.fileName || 'Planilha'
        }));

        db.lancamentos.unshift(...mappedRows);
        db.imports.unshift({
          id: importId,
          fileName: payload.fileName || 'arquivo.xlsx',
          importedAt: timestamp,
          totalSheets: payload.totalSheets || 1,
          totalRows: mappedRows.length,
          hash: importHash,
          columnMapping: payload.columnMapping || {}
        });

        const periodos = [...new Set(mappedRows.map((item) => item.competencia))];
        periodos.forEach((periodo) => {
          const doPeriodo = db.lancamentos.filter((item) => item.competencia === periodo);
          const valorSistema = doPeriodo.reduce((sum, item) => sum + (item.tipo === 'receita' ? item.valor : -item.valor), 0);
          const valorExtrato = Number((valorSistema * 1.02).toFixed(2));
          const diferenca = Number((valorExtrato - valorSistema).toFixed(2));
          db.conciliacoes.unshift({
            id: crypto.randomUUID(),
            periodo,
            banco: payload.defaultBank || 'Banco consolidado',
            valorExtrato,
            valorSistema: Number(valorSistema.toFixed(2)),
            diferenca,
            status: Math.abs(diferenca) < 0.01 ? 'Conciliado' : 'Divergente'
          });
        });

        writeDb(db);
        return sendJson(res, 201, { message: 'Importação concluída com sucesso.', bootstrap: { ...deriveResumo(db), imports: db.imports, lancamentos: db.lancamentos, conciliacoes: db.conciliacoes } });
      })
      .catch((error) => sendJson(res, 400, { message: `Falha ao processar importação: ${error.message}` }));
  }

  if (pathname === '/api/lancamentos' && req.method === 'POST') {
    return parseBody(req)
      .then((payload) => {
        const db = readDb();
        const lancamento = {
          id: crypto.randomUUID(),
          data: payload.data,
          competencia: payload.competencia || payload.data?.slice(0, 7),
          contaFinanceira: payload.contaFinanceira,
          centroCusto: payload.centroCusto,
          classificacao: payload.classificacao,
          descricao: payload.descricao,
          valor: normalizeMoney(payload.valor),
          tipo: payload.tipo,
          origem: payload.origem || 'manual',
          origemRecebimento: payload.origemRecebimento || payload.contaFinanceira,
          referencia: payload.referencia || '',
          createdAt: new Date().toISOString()
        };
        db.lancamentos.unshift(lancamento);
        writeDb(db);
        return sendJson(res, 201, { message: 'Lançamento criado.', lancamento });
      })
      .catch((error) => sendJson(res, 400, { message: error.message }));
  }

  if (pathname.startsWith('/api/lancamentos/') && req.method === 'PUT') {
    return parseBody(req)
      .then((payload) => {
        const id = pathname.split('/').pop();
        const db = readDb();
        const index = db.lancamentos.findIndex((item) => item.id === id);
        if (index === -1) return sendJson(res, 404, { message: 'Lançamento não encontrado.' });
        db.lancamentos[index] = { ...db.lancamentos[index], ...payload, valor: normalizeMoney(payload.valor ?? db.lancamentos[index].valor) };
        writeDb(db);
        return sendJson(res, 200, { message: 'Lançamento atualizado.', lancamento: db.lancamentos[index] });
      })
      .catch((error) => sendJson(res, 400, { message: error.message }));
  }

  if (pathname.startsWith('/api/lancamentos/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    const db = readDb();
    db.lancamentos = db.lancamentos.filter((item) => item.id !== id);
    writeDb(db);
    return sendJson(res, 200, { message: 'Lançamento removido.' });
  }

  return sendJson(res, 404, { message: 'Endpoint não encontrado.' });
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500);
      return res.end('Erro interno');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

seedIfEmpty();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url.pathname);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(PORT, () => {
  console.log(`Sistema financeiro web disponível em http://localhost:${PORT}`);
});
