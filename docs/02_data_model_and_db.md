# 02 — Data Model & Database (Supabase/Postgres)

## Banco atual (v1) — Visão geral

Projeto Supabase (MCP): `hejqzrgxdgxonkpumwys`

### Entidades principais

- **Transações** (`transactions`): vendas importadas do CSV.
- **Produtos rastreados** (`products`): catálogo “ativo” usado em relatórios/grupos.
- **Produtos descobertos + tracking** (`all_products`): catálogo completo descoberto via uploads; `is_tracked` controla persistência.
- **Grupos** (`product_groups`): agrupamento manual de produtos.
- **Balance** (`balance_*`): despesas, retiradas, ajustes e saldo inicial.
- **Parceiros** (`partners`): lista de sócios e percentuais.
- **Config** (`app_settings`): preferências (ex.: `sort_order`).
- **Audit** (`audit_logs`): eventos operacionais.
- **View** (`daily_sales`): agregação diária para gráficos.

## Esquema atual (tabelas/colunas)

### `all_products`

- **PK**: `id` (bigserial)
- **UNIQUE**: `product_id` (text)
- **Colunas**:
  - `id` bigint (PK)
  - `product_id` text (unique)
  - `product_name` text
  - `lever` text nullable
  - `first_seen_at` timestamptz default `now()`
  - `last_seen_at` timestamptz default `now()`
  - `is_tracked` boolean default `false`

### `transactions`

- **PK**: `earning_id` (text)
- **Colunas**:
  - `earning_id` text (PK) — vem do CSV `earningId`
  - `transaction_date` timestamptz — CSV `transactionDate` (ex.: `2026-01-03T00:40:33.000Z`)
  - `transaction_amount` numeric(15,10) — CSV `transactionAmount`
  - `lever` text — CSV `lever`
  - `product_name` text — CSV `productName` (snapshot; pode mudar no CSV)
  - `product_id` text — CSV `productId`
  - `transaction_country_code` text — CSV `transactionCountryCode`
  - `external_reference_id_label` text — CSV `externalReferenceIdLabel` (parece vir como `"TransactionId"`)
  - `processed_at` timestamptz default `now()`
- **Índices**:
  - `transactions_pkey` (earning_id)
  - `idx_transactions_date` (transaction_date)
  - `idx_transactions_product_id` (product_id)

### `products`

- **PK**: `product_id` (text)
- **FK**: `group_id` → `product_groups.id` (ON DELETE SET NULL)
- **Colunas**:
  - `product_id` text (PK)
  - `product_name` text
  - `label` text nullable (nome customizado)
  - `lever` text nullable
  - `group_id` uuid nullable
  - `msfs_version` text nullable
  - `created_at` timestamptz default `now()`
- **Índices**:
  - `products_pkey` (product_id)
  - `idx_products_group_id` (group_id)

### `product_groups`

- **PK**: `id` uuid default `uuid_generate_v4()`
- **Colunas**:
  - `id` uuid
  - `name` text
  - `created_at` timestamptz default `now()`

### `partners`

- **PK**: `id` text (ex.: `kampf`, `leo`)
- **Colunas**:
  - `id` text
  - `name` text
  - `share` real default `0.5` com CHECK `0<=share<=1`
  - `created_at`, `updated_at` timestamptz default `now()`

### `balance_expenses`

- **PK**: `id` int (sequence)
- **Colunas**:
  - `year_month` text CHECK `YYYY-MM`
  - `category` text CHECK in (`fixed`,`variable`)
  - `name` text
  - `amount` real CHECK `amount>0`
  - `created_at`, `updated_at` timestamptz default `now()`
- **Índices**:
  - `idx_balance_expenses_year_month` (year_month)

### `balance_withdrawals`

- **PK**: `id` int (sequence)
- **FK**: `partner_id` → `partners.id` (ON DELETE CASCADE)
- **Colunas**:
  - `year_month` text CHECK `YYYY-MM`
  - `partner_id` text
  - `amount` real CHECK `amount>0`
  - `note` text nullable
  - `created_at`, `updated_at` timestamptz default `now()`
- **Índices**:
  - `idx_balance_withdrawals_year_month` (year_month)
  - `idx_balance_withdrawals_partner_id` (partner_id)

### `balance_revenue_adjustments`

- **PK**: `id` int (sequence)
- **Colunas**:
  - `year_month` text CHECK `YYYY-MM`
  - `name` text
  - `amount` real
  - `created_at`, `updated_at` timestamptz default `now()`
- **Índices**:
  - `idx_balance_revenue_adjustments_year_month` (year_month)

### `balance_initial_cash`

- **PK**: `year` int
- **Colunas**:
  - `year` int
  - `amount` numeric(12,2) default `0`
  - `note` text nullable
  - `created_at`, `updated_at` timestamptz default `now()`

### `audit_logs`

- **PK**: `id` uuid default `uuid_generate_v4()`
- **Colunas**:
  - `event_type` text
  - `description` text nullable
  - `ip_address` text nullable
  - `created_at` timestamptz default `now()`
- **Índices**:
  - `idx_audit_created_at` (created_at)

### `app_settings`

- **PK**: `key` text
- **Colunas**:
  - `key` text
  - `value` jsonb nullable
  - `updated_at` timestamptz default `now()`

## Views

### `daily_sales` (VIEW)

Definição:

```sql
SELECT
  date(transaction_date) AS date,
  count(*) AS total_units,
  sum(transaction_amount) AS total_amount
FROM transactions
GROUP BY date(transaction_date);
```

Colunas: `date` (date), `total_units` (bigint), `total_amount` (numeric)

## Funções (RPC)

### `get_product_summary(start_date,end_date)`

Retorna linhas do tipo:
- `display_name` (produto/grupo)
- `units_sold`
- `total_amount`
- `type` = `Group` | `Product`
- `group_id`
- `product_id` (null quando `type=Group`)

Observação: agrupa por `p.group_id` (se existir) e usa `coalesce(g.name, p.label, p.product_name)` para nome.

### `get_available_products()`

Retorna produtos existentes em `transactions` que **não estão** na tabela `products` (tracked), agregando `transaction_count` e `total_amount`.

## Dicionário de dados (mapeamento CSV → DB)

O importador v1 (`backend/upload.php`) usa **apenas 8 colunas** do CSV Microsoft:

- `earningId` → `transactions.earning_id` (PK, dedupe principal)
- `transactionDate` → `transactions.transaction_date`
- `transactionAmount` → `transactions.transaction_amount`
- `lever` → `transactions.lever` e `products.lever`
- `productName` → `transactions.product_name` e `products.product_name`/`label`
- `productId` → `transactions.product_id` e `products.product_id`
- `transactionCountryCode` → `transactions.transaction_country_code`
- `externalReferenceIdLabel` → `transactions.external_reference_id_label`

Os CSVs de exemplo (`LEGADO/CSVS`) têm **120 colunas**; o resto é ignorado.

## Unicidade / deduplicação (as-is)

- **Transações**: a dedupe depende de `transactions.earning_id` como PK.
  - Na ingestão, o backend usa PostgREST com `Prefer: resolution=ignore-duplicates`, então inserts com `earning_id` já existente são ignorados.
- **Produtos**: dedupe por `products.product_id` (PK) com “ignore-duplicates”.

### Pontos de atenção

- O sistema assume que **`earningId` é estável e único** globalmente.
- Não existe “job de reconciliação” para detectar divergências de valor/data se a mesma transação reaparecer com valores diferentes (v1 simplesmente ignora).

## Segurança no DB (RLS / grants) — situação atual

### RLS

- RLS está habilitado em tabelas (observado via MCP) e existe SQL recomendado em `LEGADO/docs/supabase_lockdown.sql`.

### Inconsistências detectadas

- Existem policies em algumas tabelas (`partners`, `balance_*`) do tipo **“Allow all …”** com `roles={public}` e `qual=true`.
  - Isso pode permitir acesso amplo quando combinado com grants.
- `anon`/`authenticated` ainda possuem grants em `partners` e `balance_*`.
- `anon`/`authenticated` possuem `EXECUTE` na função `get_available_products`.

**Impacto**: mesmo para uso pessoal, isso viola o princípio “deny-by-default” (o backend usa service_role, então o DB deveria ser fechado para anon/auth).

## Proposta de schema novo (rascunho / hipótese)

> Nota: esta seção é um **rascunho** para orientar o rebuild; será confirmada/ajustada na Fase 2.

Opções simples (sem overengineering):

- **Manter** `transactions` e `products` com PKs atuais, mas:
  - remover dependência de whitelist hardcoded → mover para `products.is_tracked` (ou uma tabela `tracked_products`)
  - adicionar uma tabela de **ingestões** (ex.: `imports`) para rastrear uploads (arquivo, período, contagens, erros)
  - criar tabela `discovered_products` (equivalente ao `all_products` pretendido) com `first_seen_at/last_seen_at`
  - endurecer RLS/grants (deny-by-default)

### Plano de migração (se necessário)

- Migrar de v1 → v2 mantendo tabelas existentes e adicionando as novas tabelas/colunas (migrções aditivas).
- (Opcional) backfill de `discovered_products` a partir de `transactions` (group by product_id).

