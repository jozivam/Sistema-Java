# Sistema Financeiro Empresarial Web

## Stack escolhida
Para este cenário, a escolha foi uma arquitetura **full stack leve** com:
- **Frontend em HTML5 + CSS3 + JavaScript moderno**, organizado em módulos ES para manter baixo atrito inicial.
- **Backend em Node.js puro com `http`**, sem dependências obrigatórias no MVP, para facilitar execução em ambientes restritos.
- **Persistência em JSON local** (`backend/data/db.json`) como substituto inicial de banco relacional, com modelagem pronta para futura migração para SQLite/PostgreSQL.
- **Bibliotecas no frontend via CDN**:
  - **SheetJS** para leitura de planilhas Excel.
  - **Chart.js** para gráficos.
  - **Tabulator** para tabelas com filtros, paginação e ordenação.
  - **jsPDF** como base para exportações futuras.

## Motivo da escolha
Essa abordagem entrega rapidamente um **MVP funcional e visualmente profissional** sem acoplar o projeto a um build complexo logo no início. O sistema já nasce dividido em `frontend` e `backend`, com responsabilidades separadas, o que permite evoluir depois para React/Vue, Express e banco relacional sem reescrever a lógica principal.

## Como os dados da planilha são transformados
O fluxo de importação foi desenhado para aceitar planilhas com estrutura variável:
1. O usuário seleciona um arquivo `.xls` ou `.xlsx`.
2. O frontend lê todas as abas com SheetJS.
3. O parser detecta automaticamente a linha de cabeçalho e faz **mapeamento inteligente** de colunas como:
   - `Dt liquidação` / `Dt emissão`
   - `Conta financeira`
   - `Valor`
   - `Centro custo`
   - `Ds observação`
   - `Classificação`
4. Cada linha válida é normalizada em um objeto de **lançamento financeiro padronizado**.
5. O backend recebe os registros, calcula um **hash da importação** para evitar duplicidade e persiste no repositório local.
6. A partir disso, o sistema consolida automaticamente:
   - receitas e despesas
   - saldo por período
   - totais por centro de custo
   - totais por classificação
   - estrutura de recebimentos
   - conciliação bancária resumida
   - base de DFC mensal

## Como o sistema pode crescer no futuro
A base foi preparada para expansão em fases:
- trocar `db.json` por **SQLite ou PostgreSQL**;
- substituir o frontend modular por **React ou Vue** sem mudar contratos REST;
- adicionar autenticação real, perfis de acesso e trilha de auditoria;
- implementar exportações completas em Excel/PDF;
- evoluir DFC para versão analítica/gerencial;
- incluir regras por banco, conciliação automática por OFX/CSV e workflows de aprovação.

## Estrutura do projeto
```text
backend/
  data/db.json          # persistência local do MVP
  server.js             # API HTTP + servidor estático
frontend/
  index.html            # shell principal da aplicação
  src/
    main.js             # SPA em JavaScript moderno
    services/api.js     # camada de comunicação com a API
    styles/main.css     # design system e layout responsivo
    utils/formatters.js # formatação de moeda, datas e utilitários
```

## MVP implementado
O MVP entregue já contempla:
- login ilustrativo;
- dashboard com cards e gráficos;
- importação de Excel com múltiplas abas e pré-visualização;
- gestão de lançamentos com filtros, edição, exclusão e criação manual;
- resumo financeiro consolidado;
- conciliação bancária com status e destaque visual;
- páginas preparadas para DFC, recebimentos, relatórios, classificações e configurações.

## Como executar
```bash
npm start
```
Depois, abra:
```text
http://localhost:3000
```

## Observação
Neste ambiente, as bibliotecas de UI e Excel são carregadas por CDN no navegador. Em produção, a recomendação é internalizar os assets ou migrar para um pipeline com empacotamento.
