# 04 — API Contract (v1 as-is + proposta de estabilização)

## Visão geral

O backend v1 expõe uma API JSON única em:

- **Base**: `GET/POST /backend/api.php?action=...`
- **Upload**: `POST /backend/upload.php` (multipart/form-data)

Autenticação:
- Baseada em **sessão PHP** (cookie), criada por `/backend/login.php` após TOTP.
- Quando a sessão expira, o frontend detecta HTML/401/403 e redireciona para `/backend/login.php`.

## Convenções (as-is)

- **GET** para leitura.
- **POST** para mutações.
- Erros:
  - Alguns erros retornam `400/403/429` via `jsonError()`.
  - Outros retornam `500` com mensagem genérica em produção.

## Endpoints (as-is)

### Auth/Setup (páginas, não JSON)

- `GET /` → serve SPA (após auth) ou redireciona para setup/login.
- `GET/POST /backend/setup.php`
- `GET/POST /backend/login.php`

### Core — produtos/grupos/report

- **GET** `api.php?action=date_range`
  - **200**:
    - `{ "min_date": "YYYY-MM-DD"|null, "max_date": "YYYY-MM-DD"|null }`

- **GET** `api.php?action=products`
  - **200**: lista de produtos com join de grupo

- **GET** `api.php?action=groups`
  - **200**: lista de grupos

- **POST** `api.php?action=create_group`
  - **Body**:
    - `{ "name": string, "productIds": string[] }`
  - **200**:
    - `{ "success": true, "group": {...} }`

- **POST** `api.php?action=update_product`
  - **Body**:
    - `{ "product_id": uuid-string, "label"?: string, "group_id"?: uuid-string|null }`
  - **200**: representação do produto (via PostgREST return=representation)

- **GET** `api.php?action=report&start=YYYY-MM-DD&end=YYYY-MM-DD`
  - **200**:
    - `{ daily: DailySalesRow[], summary: ProductSummaryRow[] }`
  - Onde:
    - `daily_sales`: `{ date, total_units, total_amount }`
    - `summary`: retorno de `get_product_summary`

### Upload

- **POST** `/backend/upload.php`
  - **Body**: `multipart/form-data` com campo `file`
  - **Sucesso (200)**:
    - `{ success: true, processed: number, tracked: number, inserted: number, latest_date: string|null, csv_files_processed: number, errors: string[] }`
  - **Notas**:
    - `processed`: linhas lidas do CSV (todas)
    - `tracked`: linhas cujo `productId` está com `all_products.is_tracked=true`
  - **Erro (4xx/5xx)**:
    - `{ error: string }` ou `{ error: string, details: string[] }`

### Settings / Admin

- **GET** `api.php?action=get_login_history`
  - Últimos 50 `audit_logs` por `created_at desc`.

- **GET** `api.php?action=get_sort_order`
  - Retorna array PostgREST: `[ { key: "sort_order", value: string[] } ]`

- **POST** `api.php?action=save_sort_order`
  - **Body**: `{ "order": string[] }`

- **POST** `api.php?action=truncate_table`
  - **Body**: `{ "table": "transactions" | "products" | "product_groups" | "audit_logs" }`
  - Rate limit adicional (`api:danger:ip`, 20/min)

- **POST** `api.php?action=reset_all`
  - Rate limit adicional (`api:danger:ip`, 10/min)

### Balance

- **GET** `api.php?action=balance_years`
  - `{ years: number[] }` a partir de min/max `transactions.transaction_date`

- **GET** `api.php?action=balance&year=YYYY`
  - Retorna estrutura grande com:
    - `partners`, `months`, `autoRevenue`, `manualRevenueAdjustments`, `expenses`, `withdrawals`, `computed{...}`

- **CRUD Expenses**
  - `POST action=create_expense` body `{yearMonth,category,name,amount}`
  - `POST action=update_expense` body `{id,yearMonth,category,name,amount}`
  - `POST action=delete_expense` body `{id}`

- **CRUD Withdrawals**
  - `POST action=create_withdrawal` body `{yearMonth,amount,note?}`
  - `POST action=update_withdrawal` body `{id,yearMonth,amount,note?}` (atualiza todas do mês)
  - `POST action=delete_withdrawal` body `{id}` (apaga todas do mês)

- **CRUD Revenue Adjustments**
  - `POST action=create_revenue_adjustment` body `{yearMonth,name,amount}`
  - `POST action=update_revenue_adjustment` body `{id,yearMonth,name,amount}`
  - `POST action=delete_revenue_adjustment` body `{id}`

- **Partners**
  - `GET action=partners`
  - `POST action=update_partners` body `{ partners: {id,name,share}[] }` (delete+insert)

- **Initial Cash**
  - `GET action=get_initial_cash`
  - `POST action=set_initial_cash` body `{year,amount,note?}`
  - `POST action=delete_initial_cash` body `{year}`

### Analytics

- **GET** `api.php?action=sales_by_weekday&start=YYYY-MM-DD&end=YYYY-MM-DD`
- **GET** `api.php?action=sales_by_time_bucket&start=YYYY-MM-DD&end=YYYY-MM-DD`
- **GET** `api.php?action=sales_by_msfs_version&start=YYYY-MM-DD&end=YYYY-MM-DD`

### Product discovery/tracking (inconsistente)

- **GET** `api.php?action=all_products`
- **POST** `api.php?action=track_product` body `{product_id}`
- **POST** `api.php?action=untrack_product` body `{product_id}`

Status atual:
- **Quebra** porque a tabela `all_products` não existe no Supabase atual.

## Observabilidade (as-is)

- `audit_logs` registra: `LOGIN_SUCCESS`, `LOGIN_FAIL`, `LOGIN_SETUP`, `CSV_UPLOAD`, `DB_RESET`, `DB_RESET_ALL`.
- Upload escreve uma mensagem agregada (processados/inseridos/latest_date + erros).

## Proposta (v2) — contrato estável para frontend

> Não implementado nesta fase; objetivo é registrar a direção e reduzir acoplamento ao `action=`.

Sugestão de API REST simples:

- `GET /api/date-range`
- `GET /api/reports?start=&end=`
- `POST /api/imports` (upload)
- `GET /api/products`
- `PATCH /api/products/:id`
- `GET /api/product-groups`
- `POST /api/product-groups`
- `GET /api/balance?year=`

Padrões:
- erros sempre `{ error: { code, message, details? } }`
- paginação/filtros quando necessário
- logs estruturados por import (id correlacionável)

