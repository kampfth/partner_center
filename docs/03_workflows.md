# 03 — Workflows (end-to-end)

Este documento descreve os fluxos **as-is (v1)** e aponta o que está “should-be” quando houver inconsistência.

## 1) Setup inicial (primeira execução)

**Entrada**: usuário acessa `/` (`index.php`).

### As-is

1. `index.php` verifica se existem:
   - `/.env`
   - `/backend/secrets.php`
2. Se faltar algum, redireciona para `/backend/setup.php`.
3. `backend/setup.php` (2 passos):
   - **Step 1**: recebe `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`; faz um “health check” via cURL.
   - **Step 2**: gera um secret TOTP, exibe QR code, usuário confirma com um código válido.
4. Em caso de sucesso:
   - grava `/.env` (na raiz)
   - grava `/backend/secrets.php` com `2fa_secret`
   - redireciona para `/backend/login.php`

### Should-be (rebuild)

- Garantir que **`secrets.php` nunca seja versionado** e que a escrita seja atômica (evitar arquivo parcial).
- Validar melhor a conexão Supabase (hoje aceita HTTP code “>=200 e <500”).

## 2) Login (2FA TOTP)

### As-is

1. `backend/login.php` verifica se `2fa_secret` existe em `backend/secrets.php`.
2. Se não existir, entra em “setupMode” e faz o enrollment inicial.
3. Se existir, valida o código TOTP (janela de tolerância: 2).
4. Em sucesso:
   - seta `$_SESSION['authenticated']=true`
   - seta timestamps de sessão
   - `session_regenerate_id(true)`
   - grava `audit_logs` com `LOGIN_SUCCESS` (ou `LOGIN_SETUP`)

### Erros

- Rate limit: 10 tentativas por IP a cada 15 minutos.
- Em falha: retorna erro na UI do login e registra `LOGIN_FAIL`.

## 3) Upload (CSV ou ZIP com CSVs)

**Entrada**: UI Admin → Upload (`LEGADO/src/pages/admin/UploadTab.tsx`) envia `multipart/form-data` com `file` para `/backend/upload.php`.

### As-is (backend/upload.php)

1. Requer sessão autenticada (`checkAuth()`).
2. Rate limit:
   - 30 uploads/hora por IP
   - 30 uploads/hora por sessão
3. Valida:
   - método POST
   - tamanho máx 50MB
   - extensão `.csv` ou `.zip`
   - MIME best-effort (lista allow)
4. Se ZIP:
   - requer `ZipArchive`
   - extrai até 50 entradas `.csv` (com proteção básica contra zip slip)
5. Parse CSV (para cada arquivo):
   - lê header com `fgetcsv`
   - exige colunas: `earningId`, `transactionDate`, `transactionAmount`, `lever`, `productName`, `productId`, `transactionCountryCode`, `externalReferenceIdLabel`
   - para cada linha:
     - descarta se faltar `productId`/`earningId`/`transactionDate`
     - **sempre registra/atualiza** o produto em `all_products` (descoberta)
     - **só persiste transações** quando `all_products.is_tracked=true` para o `productId`
     - adiciona para batch insert:
       - `transactions` (linha por venda)
       - `products` (uma vez por `productId`)
     - `all_products` é upsert com `last_seen_at`
6. Batch:
   - size 1000
   - insere `products` com ignore-duplicates
   - insere `transactions` com ignore-duplicates (dedupe por PK `earning_id`)
7. Resposta JSON: `processed` (linhas lidas), `tracked` (linhas de produtos tracked), `inserted`, `latest_date`, `csv_files_processed`, `errors[]`
8. Registra `audit_logs` com `CSV_UPLOAD`.

### Erros e fluxos de falha

- **CSV inválido**: falha ao abrir, sem header → retorna `error`.
- **Colunas faltando**: o código não falha explicitamente; ele só não popula `$data[$col]` e acaba pulando linhas (pode gerar import “silencioso”).
- **Duplicidade**: ignorada pelo PostgREST; v1 não retorna contagem de duplicatas ignoradas (apenas “inserted”).
- **ZIP inválido / sem ZipArchive**: retorna erro.
- **ZIP com entradas suspeitas**: adiciona warning em `errors[]`.

### Nota (as-is)

- A tabela `all_products` existe e é a fonte de verdade para o tracking.
- `backend/whitelist.php` passa a ser legado (não usado no fluxo principal de upload).

### Should-be (rebuild)

- Validação explícita de header obrigatório (falhar com mensagem clara se faltar colunas).
- Persistir resultado da importação (tabela `imports`), com métricas:
  - lidas, válidas, filtradas pela whitelist/tracking, duplicadas ignoradas, inseridas
  - erros por arquivo e amostra de linhas problemáticas
- Manter tracking no DB (já feito via `all_products.is_tracked`) e adicionar rastreabilidade por import (tabela `imports` + métricas completas).

## 4) Relatórios (dashboard/graphics)

### As-is

Fluxo “report”:
1. Front chama `GET /backend/api.php?action=report&start=YYYY-MM-DD&end=YYYY-MM-DD`
2. Backend retorna:
   - `daily`: select da view `daily_sales` com filtro por `date`
   - `summary`: RPC `get_product_summary(start_date,end_date)`

Fluxo “date_range”:
1. Front chama `GET /backend/api.php?action=date_range`
2. Backend pega min/max na `daily_sales` e retorna `{min_date,max_date}`

### Erros

- Em erro (exceção), backend retorna `500` e mensagem genérica em produção.
- Front (`apiClient.ts`) tenta detectar HTML e redirecionar ao login.

## 5) Balance (planilha financeira)

### As-is

1. UI carrega anos disponíveis via `action=balance_years` (min/max `transaction_date`).
2. UI carrega dados do ano via `action=balance&year=YYYY`.
3. Backend:
   - pega `initial_cash` do ano
   - pega `partners`
   - calcula receita por mês chamando `get_product_summary` para cada mês (12 chamadas)
   - carrega `balance_revenue_adjustments`, `balance_expenses`, `balance_withdrawals`
   - computa totais por mês: receita subtotal, despesas, retiradas, net etc.

### Regra de negócio importante (retiradas)

- `create_withdrawal`: cria **uma retirada por parceiro** no mês (mesmo valor).
- `update_withdrawal` e `delete_withdrawal`: aplicam a todos os parceiros no mesmo `year_month`.

### Should-be (rebuild)

- Reduzir chamadas repetidas (12 RPCs por ano) — ex.: RPC agregada por mês/ano, ou view/materialized view.
- Modelar “withdrawal compartilhada” explicitamente (ex.: entidade `withdrawal_events` + rows derivadas), mantendo UI simples.

