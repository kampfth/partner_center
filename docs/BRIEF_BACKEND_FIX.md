# Backend Agent Brief — Endpoints Faltando v2

> **Missão**: O backend v2 está incompleto. Faltam endpoints de Balance, Analytics, Sort Order, Partners, e outros que o frontend LEGADO precisa.

---

## 1. Problema Atual

O backend v2 (`v2/backend/`) tem apenas endpoints básicos:
- Products (all_products + tracked)
- Groups
- Imports
- Reports

**Faltam** os endpoints de:
- Balance (despesas, withdrawals, revenue adjustments)
- Partners
- Sort Order
- Analytics (weekday, time bucket, msfs version)
- Initial Cash
- Login History
- Danger Zone (truncate, reset)

---

## 2. Referência: Endpoints do LEGADO

O LEGADO (`LEGADO/backend/api.php`) tem todos esses endpoints via `?action=X`.
Você precisa implementar os equivalentes REST no v2.

---

## 3. Endpoints a Implementar

### 3.1. Balance Controller (CRIAR)

**Arquivo**: `v2/backend/src/Controllers/BalanceController.php`

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/balance?year=YYYY` | Retorna balance completo do ano |
| `GET /api/balance/years` | Lista anos disponíveis |

### 3.2. Expenses (dentro de Balance ou separado)

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/expenses` | Criar despesa |
| `PATCH /api/expenses/{id}` | Atualizar despesa |
| `DELETE /api/expenses/{id}` | Deletar despesa |

### 3.3. Withdrawals

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/withdrawals` | Criar withdrawal |
| `PATCH /api/withdrawals/{id}` | Atualizar withdrawal |
| `DELETE /api/withdrawals/{id}` | Deletar withdrawal |

### 3.4. Revenue Adjustments

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/revenue-adjustments` | Criar ajuste |
| `PATCH /api/revenue-adjustments/{id}` | Atualizar ajuste |
| `DELETE /api/revenue-adjustments/{id}` | Deletar ajuste |

### 3.5. Initial Cash

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/initial-cash` | Lista initial cash por ano |
| `POST /api/initial-cash` | Define initial cash |
| `DELETE /api/initial-cash/{year}` | Remove initial cash |

### 3.6. Partners Controller (CRIAR)

**Arquivo**: `v2/backend/src/Controllers/PartnersController.php`

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/partners` | Lista parceiros |
| `PUT /api/partners` | Atualiza parceiros (batch) |

### 3.7. Settings Controller (CRIAR)

**Arquivo**: `v2/backend/src/Controllers/SettingsController.php`

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/settings/sort-order` | Retorna ordem de exibição |
| `PUT /api/settings/sort-order` | Salva ordem de exibição |
| `GET /api/audit-logs` | Histórico de login |

### 3.8. Analytics Controller (CRIAR)

**Arquivo**: `v2/backend/src/Controllers/AnalyticsController.php`

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/analytics/weekday?start=&end=` | Vendas por dia da semana |
| `GET /api/analytics/time-bucket?start=&end=` | Vendas por horário |
| `GET /api/analytics/msfs-version?start=&end=` | Vendas por versão MSFS |

### 3.9. Admin Controller (CRIAR)

**Arquivo**: `v2/backend/src/Controllers/AdminController.php`

| Endpoint | Descrição |
|----------|-----------|
| `POST /api/admin/truncate` | Limpa tabela específica |
| `POST /api/admin/reset` | Reset completo |

---

## 4. Tabelas Supabase Necessárias (schema v2)

Verificar se existem no schema `v2`. Se não, criar:

### 4.1. balance_expenses
```sql
CREATE TABLE v2.balance_expenses (
    id SERIAL PRIMARY KEY,
    year_month TEXT NOT NULL,          -- '2026-01'
    category TEXT NOT NULL,            -- 'fixed' ou 'variable'
    name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2. balance_withdrawals
```sql
CREATE TABLE v2.balance_withdrawals (
    id SERIAL PRIMARY KEY,
    year_month TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3. balance_revenue_adjustments
```sql
CREATE TABLE v2.balance_revenue_adjustments (
    id SERIAL PRIMARY KEY,
    year_month TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4. balance_initial_cash
```sql
CREATE TABLE v2.balance_initial_cash (
    year INT PRIMARY KEY,
    amount NUMERIC(12,2) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5. partners
```sql
CREATE TABLE v2.partners (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    share_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6. app_settings
```sql
CREATE TABLE v2.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7. audit_logs
```sql
CREATE TABLE v2.audit_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Implementação: Balance Service

**Arquivo**: `v2/backend/src/Services/BalanceService.php`

O balance é calculado assim:

```php
class BalanceService
{
    public function getBalance(int $year): array
    {
        // 1. Buscar transações do ano (sum por mês)
        $monthlyRevenue = $this->getMonthlyRevenue($year);
        
        // 2. Buscar despesas do ano
        $expenses = $this->getExpenses($year);
        
        // 3. Buscar withdrawals do ano
        $withdrawals = $this->getWithdrawals($year);
        
        // 4. Buscar revenue adjustments
        $adjustments = $this->getRevenueAdjustments($year);
        
        // 5. Buscar initial cash
        $initialCash = $this->getInitialCash($year);
        
        // 6. Buscar partners
        $partners = $this->getPartners();
        
        // 7. Calcular balance por mês
        return $this->calculateBalance(
            $year,
            $monthlyRevenue,
            $expenses,
            $withdrawals,
            $adjustments,
            $initialCash,
            $partners
        );
    }
}
```

---

## 6. Referência: Código do LEGADO

Veja como o LEGADO implementa cada action em `LEGADO/backend/api.php`:

### Balance (linhas ~450-600)
```php
case 'balance':
    $year = intval($_GET['year'] ?? date('Y'));
    // ... implementação completa
```

### Expenses (linhas ~600-700)
```php
case 'create_expense':
case 'update_expense':
case 'delete_expense':
```

### Withdrawals, Revenue Adjustments, Partners, etc.
Procure por `case 'X':` no arquivo.

---

## 7. Atualizar routes.php

Adicionar todas as novas rotas em `v2/backend/src/routes.php`:

```php
// Balance
$router->get('/api/balance', fn($r) => (new BalanceController())->index($r));
$router->get('/api/balance/years', fn($r) => (new BalanceController())->years($r));

// Expenses
$router->post('/api/expenses', fn($r) => (new BalanceController())->createExpense($r));
$router->patch('/api/expenses/{id}', fn($r, $p) => (new BalanceController())->updateExpense($r, $p));
$router->delete('/api/expenses/{id}', fn($r, $p) => (new BalanceController())->deleteExpense($r, $p));

// Withdrawals
$router->post('/api/withdrawals', fn($r) => (new BalanceController())->createWithdrawal($r));
$router->patch('/api/withdrawals/{id}', fn($r, $p) => (new BalanceController())->updateWithdrawal($r, $p));
$router->delete('/api/withdrawals/{id}', fn($r, $p) => (new BalanceController())->deleteWithdrawal($r, $p));

// Revenue Adjustments
$router->post('/api/revenue-adjustments', fn($r) => (new BalanceController())->createAdjustment($r));
$router->patch('/api/revenue-adjustments/{id}', fn($r, $p) => (new BalanceController())->updateAdjustment($r, $p));
$router->delete('/api/revenue-adjustments/{id}', fn($r, $p) => (new BalanceController())->deleteAdjustment($r, $p));

// Initial Cash
$router->get('/api/initial-cash', fn($r) => (new BalanceController())->getInitialCash($r));
$router->post('/api/initial-cash', fn($r) => (new BalanceController())->setInitialCash($r));
$router->delete('/api/initial-cash/{year}', fn($r, $p) => (new BalanceController())->deleteInitialCash($r, $p));

// Partners
$router->get('/api/partners', fn($r) => (new PartnersController())->index($r));
$router->put('/api/partners', fn($r) => (new PartnersController())->update($r));

// Settings
$router->get('/api/settings/sort-order', fn($r) => (new SettingsController())->getSortOrder($r));
$router->put('/api/settings/sort-order', fn($r) => (new SettingsController())->saveSortOrder($r));
$router->get('/api/audit-logs', fn($r) => (new SettingsController())->getAuditLogs($r));

// Analytics
$router->get('/api/analytics/weekday', fn($r) => (new AnalyticsController())->byWeekday($r));
$router->get('/api/analytics/time-bucket', fn($r) => (new AnalyticsController())->byTimeBucket($r));
$router->get('/api/analytics/msfs-version', fn($r) => (new AnalyticsController())->byMsfsVersion($r));

// Admin
$router->post('/api/admin/truncate', fn($r) => (new AdminController())->truncate($r));
$router->post('/api/admin/reset', fn($r) => (new AdminController())->reset($r));
```

---

## 8. Checklist de Entrega

### Migrations (se tabelas não existem)
- [ ] v2.balance_expenses
- [ ] v2.balance_withdrawals
- [ ] v2.balance_revenue_adjustments
- [ ] v2.balance_initial_cash
- [ ] v2.partners
- [ ] v2.app_settings
- [ ] v2.audit_logs

### Controllers
- [ ] BalanceController.php
- [ ] PartnersController.php
- [ ] SettingsController.php
- [ ] AnalyticsController.php
- [ ] AdminController.php

### Services
- [ ] BalanceService.php
- [ ] AnalyticsService.php

### Routes
- [ ] Todas as rotas adicionadas em routes.php

### Testes
- [ ] GET /api/balance?year=2026 retorna dados
- [ ] POST /api/expenses cria despesa
- [ ] GET /api/analytics/weekday retorna dados

---

## 9. Ordem de Implementação Sugerida

1. **Migrations** — criar tabelas no Supabase
2. **BalanceController** + BalanceService (maior e mais complexo)
3. **SettingsController** (sort order, audit logs)
4. **PartnersController**
5. **AnalyticsController**
6. **AdminController** (truncate, reset)

---

## 10. Rebuild e Deploy

Após implementar:

```bash
cd v2
python scripts/build_dist.py

git add .
git commit -m "feat: add balance, analytics, partners, settings endpoints"
git push origin feat/lovable-skin

git subtree split --prefix=v2/dist -b deploy --rejoin
git push origin deploy --force
```

---

*Versão: 1.0 | Data: 2026-01-08*
