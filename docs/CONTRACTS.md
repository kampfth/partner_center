# Partner Center v2 — Contratos

> Documento compartilhado entre Backend e Frontend.  
> **Ambos devem seguir este contrato à risca.**

---

## 1. Visão Geral

O Partner Center v2 é um sistema para gestão de vendas do Microsoft Partner Center.  
Fluxo principal:
1. Upload de CSV → descoberta de produtos em `all_products`
2. Usuário marca produtos como "tracked"
3. Próximos uploads salvam transações apenas de produtos tracked
4. Relatórios agregam por produto ou grupo

---

## 2. Banco de Dados (schema `v2`)

### 2.1. Tabelas

#### `v2.all_products`
Catálogo de todos os produtos já vistos em CSVs.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| product_id | text | ID externo (PartnerProductID), UNIQUE |
| product_name | text | Nome do produto |
| lever | text | Canal de venda (ex: Marketplace) |
| first_seen_at | timestamptz | Primeiro upload que viu este produto |
| last_seen_at | timestamptz | Último upload que viu este produto |
| is_tracked | boolean | Se o usuário quer rastrear vendas |
| created_at | timestamptz | Data de criação |

#### `v2.products`
Produtos tracked (subset de all_products com metadados).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| product_id | text | FK → all_products.product_id, UNIQUE |
| product_name | text | Nome |
| lever | text | Canal |
| label | text | Label customizado (opcional) |
| group_id | uuid | FK → product_groups.id (nullable) |
| sort_order | int | Ordem de exibição |
| created_at | timestamptz | Data de criação |

#### `v2.product_groups`
Agrupamentos para relatórios.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| name | text | Nome do grupo, UNIQUE |
| created_at | timestamptz | Data de criação |

#### `v2.transactions`
Transações de venda (apenas de produtos tracked).

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| earning_id | text | ID único da transação (dedupe), UNIQUE |
| product_id | text | FK → products.product_id |
| customer_country | text | País do cliente |
| purchase_date | date | Data da compra |
| units | int | Quantidade |
| amount_usd | numeric(12,2) | Valor em USD |
| msfs_version | text | Versão MSFS (ex: MSFS2020, MSFS2024) |
| created_at | timestamptz | Data de inserção |

#### `v2.imports`
Log de uploads para auditoria.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid | PK |
| filename | text | Nome do arquivo |
| rows_read | int | Linhas lidas do CSV |
| products_discovered | int | Produtos novos descobertos |
| transactions_inserted | int | Transações inseridas |
| transactions_skipped | int | Duplicatas ignoradas |
| transactions_untracked | int | Transações de produtos não-tracked |
| errors | jsonb | Array de erros |
| started_at | timestamptz | Início do processamento |
| finished_at | timestamptz | Fim do processamento |
| status | text | 'processing', 'completed', 'failed' |

### 2.2. Views

#### `v2.daily_sales`
Agregação diária de vendas.

```sql
SELECT purchase_date as date, count(*) as total_units, sum(amount_usd) as total_amount
FROM v2.transactions GROUP BY purchase_date
```

### 2.3. Funções RPC

#### `v2.get_product_summary(start_date, end_date)`
Retorna resumo por produto/grupo para relatórios.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| product_id | text | ID do produto (null se grupo) |
| group_id | uuid | ID do grupo (null se produto) |
| display_name | text | Nome para exibição |
| units_sold | bigint | Total de unidades |
| total_amount | numeric | Total em USD |
| type | text | 'Product' ou 'Group' |

---

## 3. API REST v2

**Base URL**: `/api` (ou `/backend/api.php` em Hostinger)

### 3.1. Padrões

#### Headers obrigatórios
```
Content-Type: application/json
```

#### Formato de erro
```json
{
  "error": "Mensagem de erro",
  "code": "ERROR_CODE"
}
```

#### Códigos de erro padrão
| Código | HTTP | Descrição |
|--------|------|-----------|
| VALIDATION_ERROR | 400 | Dados inválidos |
| NOT_FOUND | 404 | Recurso não encontrado |
| CONFLICT | 409 | Conflito (ex: duplicata) |
| INTERNAL_ERROR | 500 | Erro interno |

### 3.2. Endpoints

---

#### `GET /api/health`
Health check.

**Response 200**:
```json
{ "status": "ok", "timestamp": "2026-01-08T12:00:00Z" }
```

---

#### `GET /api/products`
Lista todos os produtos descobertos (all_products).

**Query params**:
- `tracked` (optional): `true` | `false` — filtrar por status

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "product_id": "abc123",
      "product_name": "Product Name",
      "lever": "Marketplace",
      "first_seen_at": "2026-01-01T00:00:00Z",
      "last_seen_at": "2026-01-08T00:00:00Z",
      "is_tracked": false
    }
  ]
}
```

---

#### `PATCH /api/products/{product_id}`
Atualiza status de tracking de um produto.

**Path params**:
- `product_id`: ID externo do produto (text)

**Request body**:
```json
{ "is_tracked": true }
```

**Response 200**:
```json
{
  "data": {
    "product_id": "abc123",
    "is_tracked": true
  }
}
```

**Regras de negócio**:
- Se `is_tracked: true` e produto não existe em `products`, criar entrada em `products` copiando dados de `all_products`.
- Se `is_tracked: false` e produto existe em `products`, remover de `products` (cascade remove transactions).

---

#### `GET /api/tracked-products`
Lista produtos tracked com metadados (label, group).

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "product_id": "abc123",
      "product_name": "Product Name",
      "lever": "Marketplace",
      "label": "Custom Label",
      "group_id": "uuid-or-null",
      "group_name": "Group Name or null",
      "sort_order": 0
    }
  ]
}
```

---

#### `PATCH /api/tracked-products/{product_id}`
Atualiza metadados de produto tracked.

**Request body** (todos opcionais):
```json
{
  "label": "New Label",
  "group_id": "uuid-or-null",
  "sort_order": 1
}
```

**Response 200**:
```json
{
  "data": {
    "product_id": "abc123",
    "label": "New Label",
    "group_id": "uuid",
    "sort_order": 1
  }
}
```

---

#### `GET /api/groups`
Lista grupos.

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Group Name",
      "product_count": 3,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

#### `POST /api/groups`
Cria novo grupo.

**Request body**:
```json
{
  "name": "New Group",
  "product_ids": ["abc123", "def456"]
}
```

**Validações**:
- `name`: 1-100 caracteres, único
- `product_ids`: mínimo 2, todos devem ser tracked e sem grupo

**Response 201**:
```json
{
  "data": {
    "id": "uuid",
    "name": "New Group",
    "product_count": 2
  }
}
```

**Response 400** (erro):
```json
{
  "error": "Selecione pelo menos 2 produtos sem grupo",
  "code": "VALIDATION_ERROR"
}
```

---

#### `DELETE /api/groups/{group_id}`
Remove grupo (produtos voltam a ser ungrouped).

**Response 200**:
```json
{ "success": true }
```

---

#### `POST /api/imports`
Upload de CSV/ZIP.

**Request**: `multipart/form-data`
- `file`: arquivo CSV ou ZIP contendo CSVs

**Response 200**:
```json
{
  "data": {
    "import_id": "uuid",
    "filename": "2026-01.csv",
    "rows_read": 1500,
    "products_discovered": 3,
    "transactions_inserted": 450,
    "transactions_skipped": 12,
    "transactions_untracked": 1038,
    "status": "completed"
  }
}
```

**Regras de negócio**:
1. Sempre fazer upsert em `all_products` (atualiza `last_seen_at`)
2. Só inserir em `transactions` se `all_products.is_tracked = true`
3. Dedupe por `earning_id` (ignorar duplicatas)
4. Registrar em `imports` para auditoria

---

#### `GET /api/imports`
Lista histórico de imports.

**Query params**:
- `limit` (optional): max 100, default 20

**Response 200**:
```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "2026-01.csv",
      "rows_read": 1500,
      "transactions_inserted": 450,
      "status": "completed",
      "started_at": "2026-01-08T12:00:00Z",
      "finished_at": "2026-01-08T12:01:00Z"
    }
  ]
}
```

---

#### `GET /api/reports`
Relatório agregado por período.

**Query params**:
- `start` (required): YYYY-MM-DD
- `end` (required): YYYY-MM-DD

**Response 200**:
```json
{
  "data": {
    "daily": [
      { "date": "2026-01-01", "total_units": 50, "total_amount": 1234.56 }
    ],
    "summary": [
      {
        "product_id": null,
        "group_id": "uuid",
        "display_name": "Group Name",
        "units_sold": 100,
        "total_amount": 5000.00,
        "type": "Group"
      },
      {
        "product_id": "abc123",
        "group_id": null,
        "display_name": "Product Label",
        "units_sold": 25,
        "total_amount": 1250.00,
        "type": "Product"
      }
    ]
  }
}
```

---

#### `GET /api/reports/date-range`
Retorna range de datas disponíveis.

**Response 200**:
```json
{
  "data": {
    "min_date": "2025-10-01",
    "max_date": "2026-01-08"
  }
}
```

---

## 4. Tipos TypeScript (Frontend)

```typescript
// === Produtos ===

export interface DiscoveredProduct {
  id: string;
  product_id: string;
  product_name: string;
  lever: string;
  first_seen_at: string;
  last_seen_at: string;
  is_tracked: boolean;
}

export interface TrackedProduct {
  id: string;
  product_id: string;
  product_name: string;
  lever: string;
  label: string | null;
  group_id: string | null;
  group_name: string | null;
  sort_order: number;
}

// === Grupos ===

export interface Group {
  id: string;
  name: string;
  product_count: number;
  created_at: string;
}

export interface CreateGroupRequest {
  name: string;
  product_ids: string[];
}

// === Imports ===

export interface ImportResult {
  import_id: string;
  filename: string;
  rows_read: number;
  products_discovered: number;
  transactions_inserted: number;
  transactions_skipped: number;
  transactions_untracked: number;
  status: 'processing' | 'completed' | 'failed';
}

export interface ImportHistory {
  id: string;
  filename: string;
  rows_read: number;
  transactions_inserted: number;
  status: string;
  started_at: string;
  finished_at: string | null;
}

// === Reports ===

export interface DailySales {
  date: string;
  total_units: number;
  total_amount: number;
}

export interface ProductSummary {
  product_id: string | null;
  group_id: string | null;
  display_name: string;
  units_sold: number;
  total_amount: number;
  type: 'Product' | 'Group';
}

export interface ReportResponse {
  daily: DailySales[];
  summary: ProductSummary[];
}

export interface DateRange {
  min_date: string;
  max_date: string;
}

// === API Response Wrapper ===

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  code: string;
}
```

---

## 5. Regras de Negócio

### 5.1. Tracking de Produtos
- Todo produto descoberto em CSV vai para `all_products`
- Usuário pode marcar/desmarcar `is_tracked`
- Ao marcar como tracked, cria entrada em `products`
- Ao desmarcar, remove de `products` (e transações são deletadas via cascade)
- **Transações futuras** só são salvas para produtos tracked no momento do upload

### 5.2. Grupos
- Um produto tracked pode estar em 0 ou 1 grupo
- Grupo requer mínimo de 2 produtos
- Só produtos tracked e sem grupo podem ser adicionados a um novo grupo
- Efeito **retroativo**: mudar grupo de um produto afeta relatórios históricos
- Deletar grupo apenas desvincula produtos (não deleta produtos)

### 5.3. Deduplicação
- `earning_id` é a chave de dedupe em `transactions`
- Uploads repetidos do mesmo CSV não duplicam dados
- Contador `transactions_skipped` indica duplicatas ignoradas

### 5.4. Colunas do CSV processadas
Apenas estas colunas são lidas (resto é ignorado):

| CSV Header | Campo no BD |
|------------|-------------|
| PartnerProductId | product_id |
| PartnerProductName | product_name |
| EarningId | earning_id |
| CustomerCountry | customer_country |
| PurchaseDate | purchase_date |
| Units | units |
| Revenue | amount_usd |
| Lever | lever |
| ItemName | msfs_version (parse) |

---

## 6. Segurança

- Backend usa Supabase `service_role` key (bypassa RLS)
- Frontend **nunca** acessa Supabase diretamente
- Todas as tabelas têm RLS enabled + deny-by-default para `anon`/`authenticated`
- Autenticação: TOTP via Google Authenticator (implementação legada)

---

## 7. Observabilidade

- Todo upload registra em `imports` com métricas
- Erros de parsing são logados no campo `errors` (jsonb array)
- Backend deve logar requests com timestamp, endpoint, status, duration

---

*Versão: 1.0 | Data: 2026-01-08*
