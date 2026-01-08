# Backend Agent Brief — Partner Center v2

> **Missão**: Reescrever o backend PHP do zero, modular, seguindo o contrato em `docs/CONTRACTS.md`.

---

## 1. Contexto

Você está construindo o backend v2 do Partner Center.  
O código legado está em `LEGADO/backend/` — use apenas como **referência de regras de negócio**, não copie.

### Tecnologias
- PHP 8.1+ (compatível com Hostinger shared hosting)
- Supabase PostgreSQL via REST API (`service_role` key)
- Sem frameworks pesados (Slim, Laravel, etc.) — router simples custom

### Schema do banco
- Todas as tabelas estão no schema `v2` do Supabase
- Consulte `docs/CONTRACTS.md` seção 2 para schema completo

---

## 2. Arquitetura Obrigatória

```
v2/backend/
├── public/
│   └── index.php          # Entry point único (router)
├── src/
│   ├── bootstrap.php      # Autoload, env, inicialização
│   ├── Http/
│   │   ├── Router.php     # Router simples (regex ou match)
│   │   ├── Request.php    # Wrapper de $_GET, $_POST, $_FILES
│   │   ├── Response.php   # JSON responses padronizadas
│   │   └── Middleware/
│   │       └── Auth.php   # Verificação de sessão/TOTP
│   ├── Controllers/
│   │   ├── HealthController.php
│   │   ├── ProductsController.php
│   │   ├── GroupsController.php
│   │   ├── ImportsController.php
│   │   └── ReportsController.php
│   ├── Services/
│   │   ├── ProductService.php
│   │   ├── GroupService.php
│   │   ├── ImportService.php
│   │   └── ReportService.php
│   └── Db/
│       └── SupabaseClient.php   # HTTP client para Supabase REST
├── .htaccess                     # Rewrite para index.php
└── env.example
```

### Regras de estrutura
- **Nenhum arquivo > 200 linhas**
- Controllers: recebem Request, chamam Service, retornam Response
- Services: lógica de negócio, validações, chamam Db
- Db: apenas HTTP requests para Supabase REST API

---

## 3. Endpoints a Implementar

Consulte `docs/CONTRACTS.md` seção 3 para detalhes completos.

| Método | Rota | Controller | Prioridade |
|--------|------|------------|------------|
| GET | /api/health | HealthController | P0 |
| GET | /api/products | ProductsController | P0 |
| PATCH | /api/products/{id} | ProductsController | P0 |
| GET | /api/tracked-products | ProductsController | P1 |
| PATCH | /api/tracked-products/{id} | ProductsController | P1 |
| GET | /api/groups | GroupsController | P1 |
| POST | /api/groups | GroupsController | P1 |
| DELETE | /api/groups/{id} | GroupsController | P2 |
| POST | /api/imports | ImportsController | P0 |
| GET | /api/imports | ImportsController | P2 |
| GET | /api/reports | ReportsController | P1 |
| GET | /api/reports/date-range | ReportsController | P1 |

**P0** = MVP, **P1** = Essencial, **P2** = Nice-to-have

---

## 4. Regras de Negócio Críticas

### 4.1. Upload/Import (ImportsController)
Referência: `LEGADO/backend/upload.php`

```
1. Receber arquivo (CSV ou ZIP)
2. Se ZIP, extrair e processar cada CSV
3. Para cada linha do CSV:
   a. Validar campos obrigatórios (earning_id, product_id, transaction_date)
   b. SEMPRE upsert em v2.all_products (atualiza last_seen_at)
   c. Verificar se product_id está em all_products.is_tracked = true
   d. Se tracked: inserir em v2.transactions (ignorar se earning_id duplicado)
   e. Se não tracked: incrementar contador untracked
4. Registrar em v2.imports com métricas
5. Retornar ImportResult
```

#### Colunas do CSV a processar
```php
$requiredCols = [
    'earningId',           // → earning_id (dedupe key)
    'transactionDate',     // → purchase_date
    'transactionAmount',   // → amount_usd
    'lever',               // → lever
    'productName',         // → product_name
    'productId',           // → product_id
    'transactionCountryCode', // → customer_country
    'externalReferenceIdLabel' // → msfs_version (parse)
];
```

#### MSFS Version parsing
```php
// externalReferenceIdLabel contém "MSFS2020" ou "MSFS2024" no texto
function parseMsfsVersion(string $label): ?string {
    if (stripos($label, 'MSFS2024') !== false) return 'MSFS2024';
    if (stripos($label, 'MSFS2020') !== false) return 'MSFS2020';
    return null;
}
```

### 4.2. Tracking (ProductsController)
```
PATCH /api/products/{product_id} { is_tracked: true }
  → Se não existe em v2.products: INSERT copiando dados de all_products
  → UPDATE all_products SET is_tracked = true

PATCH /api/products/{product_id} { is_tracked: false }
  → DELETE FROM v2.products WHERE product_id = ? (cascade deleta transactions)
  → UPDATE all_products SET is_tracked = false
```

### 4.3. Grupos (GroupsController)
```
POST /api/groups { name, product_ids[] }
  Validações:
  - name: 1-100 chars, único
  - product_ids: mínimo 2
  - todos os product_ids devem existir em v2.products
  - todos devem ter group_id = NULL

  Ação:
  - INSERT em v2.product_groups
  - UPDATE v2.products SET group_id = ? WHERE product_id IN (...)
```

### 4.4. Reports (ReportsController)
```
GET /api/reports?start=YYYY-MM-DD&end=YYYY-MM-DD
  → Chamar RPC v2.get_product_summary(start, end) para summary
  → Query v2.daily_sales filtrado por date range para daily
```

---

## 5. Supabase Client

### Configuração
```php
// .env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  // service_role key (NÃO anon)
```

### Métodos necessários
```php
class SupabaseClient {
    public function select(string $table, string $query): array;
    public function insert(string $table, array $data, bool $upsert = false): array;
    public function update(string $table, array $data, string $filter): array;
    public function delete(string $table, string $filter): array;
    public function rpc(string $function, array $params): array;
}
```

### Importante: Schema v2
Todas as queries devem usar schema `v2`:
```php
// Header obrigatório para Supabase REST
'Accept-Profile' => 'v2',
'Content-Profile' => 'v2'
```

---

## 6. Autenticação

Referência: `LEGADO/backend/auth.php`

- Sessão PHP com TOTP (Google Authenticator)
- Middleware `Auth` verifica `$_SESSION['authenticated']`
- Endpoints públicos: `/api/health`
- Todos os outros requerem auth

**Para MVP**: pode simplificar para sessão básica; TOTP é P2.

---

## 7. Respostas Padronizadas

### Sucesso
```php
Response::json(['data' => $result], 200);
```

### Erro
```php
Response::error('Mensagem', 'ERROR_CODE', 400);
// { "error": "Mensagem", "code": "ERROR_CODE" }
```

### Códigos HTTP
- 200: OK
- 201: Created
- 400: Bad Request (validação)
- 404: Not Found
- 409: Conflict (duplicata)
- 429: Rate Limited
- 500: Internal Error

---

## 8. DoD (Definition of Done)

- [ ] Router funcional com todas as rotas P0 e P1
- [ ] Upload CSV processa corretamente (discovery + tracking + dedupe)
- [ ] Tracking toggle funciona (criar/remover de products)
- [ ] Grupos podem ser criados com validação
- [ ] Reports retornam dados corretos com agregação por grupo
- [ ] Nenhum arquivo > 200 linhas
- [ ] Erros retornam JSON padronizado
- [ ] Logs de import salvos em v2.imports

---

## 9. Testes Manuais

### Upload
```bash
curl -X POST http://localhost/api/imports \
  -F "file=@test.csv"
```

### Toggle tracking
```bash
curl -X PATCH http://localhost/api/products/abc123 \
  -H "Content-Type: application/json" \
  -d '{"is_tracked": true}'
```

### Criar grupo
```bash
curl -X POST http://localhost/api/groups \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Group", "product_ids": ["abc123", "def456"]}'
```

---

## 10. Referências do Legado

| Arquivo | O que extrair |
|---------|---------------|
| `LEGADO/backend/upload.php` | Lógica de parsing CSV, colunas, batch insert |
| `LEGADO/backend/api.php` | Endpoints existentes, validações |
| `LEGADO/backend/supabase.php` | HTTP client para Supabase |
| `LEGADO/backend/auth.php` | Sessão e TOTP |
| `LEGADO/backend/validation.php` | Funções de validação |

**NÃO COPIE** — apenas use como referência para entender regras.

---

## 11. Checklist de Entrega

```
v2/backend/
├── public/index.php        ✓ Entry point com router
├── src/bootstrap.php       ✓ Inicialização
├── src/Http/Router.php     ✓ Roteamento
├── src/Http/Request.php    ✓ Request wrapper
├── src/Http/Response.php   ✓ Response helper
├── src/Controllers/*       ✓ 5 controllers
├── src/Services/*          ✓ 4 services
├── src/Db/SupabaseClient   ✓ Supabase REST client
├── .htaccess               ✓ Rewrite rules
└── env.example             ✓ Exemplo de configuração
```

---

*Versão: 1.0 | Data: 2026-01-08*
