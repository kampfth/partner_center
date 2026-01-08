# 01 — Current System Audit (v1 / `LEGADO/`)

## Inventário (o que existe hoje)

### Código / runtime

- **Frontend (React SPA)**: `LEGADO/src/`
  - Rotas: `Dashboard` (`/`), `Graphics` (`/graphics`), `Balance` (`/balance`), `Admin` (`/admin`)
  - API client: `LEGADO/src/api/apiClient.ts`, `LEGADO/src/api/partnerApi.ts`
  - UI: Tailwind + shadcn/ui em `LEGADO/src/components/ui/`
  - Layout mobile-first: `LEGADO/src/components/layout/AppShell.tsx`, `TopNav.tsx`, `BottomNav.tsx`

- **Backend (PHP)**: `LEGADO/backend/`
  - Auth + headers + same-origin: `auth.php`
  - Login TOTP: `login.php` + `GoogleAuthenticator.php`
  - Setup inicial: `setup.php` (gera `.env` e `backend/secrets.php`)
  - API JSON: `api.php` (`?action=...`)
  - Upload CSV/ZIP: `upload.php`
  - Rate limiting (file-based): `ratelimit.php`
  - Validação JSON/UUID/datas: `validation.php`
  - Cliente Supabase (PostgREST): `supabase.php`
  - Whitelist de produtos: `whitelist.php`

### Build/deploy

- **Vite build**: `npm run build`
- **Empacotamento FTP**: `LEGADO/scripts/build_dist.py` → gera `LEGADO/dist/`
- **Criação de `.env`**: `LEGADO/scripts/create_env.py` (server-side)
- **SPA routing (Hostinger)**: `.htaccess` no root e em `backend/`

### Dados / Banco

- **Supabase (Postgres)** via MCP do projeto `hejqzrgxdgxonkpumwys`
  - Tabelas: `transactions`, `products`, `product_groups`, `partners`, `balance_*`, `audit_logs`, `app_settings`
  - View: `daily_sales`
  - RPCs: `get_product_summary(start_date,end_date)`, `get_available_products()`

### Dados locais

- CSVs de exemplo: `LEGADO/CSVS/*.csv` (amostra indica **120 colunas** por arquivo).

## Fluxos e comportamento real (as-is)

### Setup / login

- `index.php` redireciona para `backend/setup.php` se `.env` ou `backend/secrets.php` não existirem.
- `backend/setup.php`:
  - passo 1: salva Supabase URL + service_role em sessão (e “testa” conexão)
  - passo 2: gera/valida TOTP, então grava `.env` e `backend/secrets.php`
- `backend/login.php`: autentica com TOTP e cria sessão PHP (timeouts: 2h idle, 8h absoluto em `auth.php`)

### Upload CSV/ZIP

- `backend/upload.php`:
  - aceita CSV ou ZIP (até 50MB; ZIP até 50 CSVs)
  - parse via `fgetcsv`, usa colunas **obrigatórias**:
    - `earningId`, `transactionDate`, `transactionAmount`, `lever`, `productName`, `productId`, `transactionCountryCode`, `externalReferenceIdLabel`
  - **sempre** registra/atualiza produtos em `all_products` (descoberta)
  - **só persiste** transações em `transactions` para produtos com `all_products.is_tracked=true`
  - batches de 1000; insere em `products` e `transactions` (dedupe por PK)
  - `backend/whitelist.php` passa a ser legado (não usado no fluxo principal)

### Dashboard / Reports / Balance

- `backend/api.php` expõe ações:
  - core: `report`, `date_range`, `products`, `groups`, `create_group`, `update_product`
  - analytics: `sales_by_weekday`, `sales_by_time_bucket`, `sales_by_msfs_version`
  - settings/admin: `get_login_history`, `get_sort_order`, `save_sort_order`, `truncate_table`, `reset_all`
  - balance: `balance`, `balance_years`, CRUD expenses/withdrawals/adjustments, partners
  - “product discovery/tracking”: `all_products`, `track_product`, `untrack_product` (dependem de tabela ausente)

## Pontos quebrados / incompletos (com severidade)

### Crítico

  - **Estado atual**: `all_products` existe no Supabase e o tracking funciona via `is_tracked`.
  - **Risco residual**: validar permissões/RLS para garantir deny-by-default no DB.

- **Segurança: `backend/secrets.php` está versionado** no workspace com `2fa_secret`.
  - `setup.php` foi feito para **gerar** isso em runtime; não deveria estar no repo.

- **Lockdown incompleto no Supabase**:
  - `anon`/`authenticated` ainda têm privilégios em tabelas (`partners`, `balance_*`) e EXECUTE em `get_available_products`.
  - Existem policies RLS “Allow all …” com `roles={public}` em algumas tabelas.
  - Mesmo que o frontend não use anon key, isso viola o princípio “deny-by-default”.

### Alto

- **Whitelist hardcoded** (`backend/whitelist.php`) virou **legado**:
  - não deve mais controlar persistência; o tracking passou a ser via DB (`all_products.is_tracked`)

- **Sem testes automatizados** para parser/dedupe/regras de negócio.

- **Observabilidade limitada**:
  - há `audit_logs`, mas não existe uma estratégia clara de logs estruturados para falhas de import.

### Médio

- **Contrato de API acoplado** ao `action=` e a detalhes do Supabase (ex.: view `daily_sales`, RPC `get_product_summary`).
- **Ações perigosas** (`truncate_table`, `reset_all`) expostas via API:
  - há rate limit, mas o risco de erro humano permanece.

### Baixo

- Build/deploy por FTP depende de disciplina (problema “blank page” por assets hashados já ocorreu; ver `DEPLOY_FIX_PROMPT.md`).

## Dívida técnica e riscos (resumo)

- **Risco de segurança (alto)**: secrets versionados + policies/grants inconsistentes.
- **Risco funcional (alto)**: fluxo “All Products / discovery / tracking” inconsistente DB vs código.
- **Risco de manutenção (médio)**: whitelist hardcoded e `action=` monolítico.
- **Risco de qualidade (médio)**: ausência de testes, CSV parser sem validação profunda.

## Mapa de dependências (bibliotecas/serviços)

### Frontend (`LEGADO/package.json`)

- React 18, React Router, TanStack Query
- Tailwind + shadcn/ui (Radix)
- Recharts
- date-fns
- zod (presente, mas validação é majoritariamente no backend hoje)

### Backend (PHP)

- PHP puro, cURL, ZipArchive (opcional), sessões PHP
- Biblioteca TOTP: `GoogleAuthenticator.php`

### Infra/serviços

- Supabase (Postgres + PostgREST + RPC)
- Hostinger (shared hosting), deploy via FTP

## Unknowns / hipóteses (para validar)

- O repositório externo citado “Lovable” (`partner-portal-hub`) não está presente nesta workspace; o `LEGADO/` já contém um frontend completo. Precisamos comparar depois (fase 1/2) para ver divergências.
- Regras exatas de dedupe além de `earningId`: hoje só PK, mas pode haver casos em que `earningId` não seja estável (precisa validar com histórico real).

