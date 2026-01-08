# Frontend Agent Brief — Correção Crítica v2

> **Missão**: O frontend v2 está quebrado visualmente e faltando funcionalidades. Você deve substituí-lo usando o código do LEGADO como base, adaptando para a API v2.

---

## 1. Problema Atual

O frontend deployado em `https://partner.ekinteractive.com` tem os seguintes problemas:

### 1.1. Estilo Errado
- Tema genérico do shadcn (cores claras/escuras básicas)
- Falta o **Apple Dark Design System** do projeto original
- Fonte Inter não carregada
- Animações e polish faltando

### 1.2. Páginas Faltando
| Página | Status |
|--------|--------|
| Dashboard | ✓ Existe mas visual errado |
| GraphicsPage | ❌ **NÃO EXISTE** |
| BalancePage | ❌ **NÃO EXISTE** |
| AdminPage | ❌ **NÃO EXISTE** (tinha 6 tabs: Groups, Products, Upload, Balance, Sort, Danger) |

### 1.3. Navegação Errada
- v2 atual: Dashboard, Products, Groups, Imports, Reports
- LEGADO correto: Dashboard, Graphics, Balance, Admin

### 1.4. Sem Autenticação
- O site abre direto no Dashboard sem pedir login
- Deveria redirecionar para `/login` se não autenticado

---

## 2. Solução

**Substituir o frontend v2 pelo código do LEGADO**, adaptando apenas as chamadas de API.

O LEGADO está em: `LEGADO/src/`
O v2 está em: `v2/web/src/`

---

## 3. Arquivos do LEGADO para Copiar/Portar

### 3.1. CSS (COPIAR INTEGRALMENTE)

**Arquivo**: `LEGADO/src/index.css`

Este arquivo contém:
- Apple Dark Design System
- Cores corretas (--background: 0 0% 0%, --card: 0 0% 6%, etc.)
- Font Inter
- Animações (fade-in, shimmer)
- Scrollbar styling
- Focus states
- Date input styling

**Ação**: Substituir `v2/web/src/index.css` por este arquivo.

### 3.2. App.tsx (COPIAR E ADAPTAR)

**Arquivo**: `LEGADO/src/App.tsx`

Rotas corretas:
```tsx
<Route path="/" element={<DashboardPage />} />
<Route path="/graphics" element={<GraphicsPage />} />
<Route path="/balance" element={<BalancePage />} />
<Route path="/admin" element={<AdminPage />} />
```

Inclui:
- QueryClientProvider
- TooltipProvider
- Sonner (toasts)
- Lazy loading
- PageSkeleton

**Ação**: Substituir `v2/web/src/App.tsx` por este arquivo.

### 3.3. Páginas (PORTAR TODAS)

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/pages/DashboardPage.tsx` | Substituir v2 |
| `LEGADO/src/pages/GraphicsPage.tsx` | **CRIAR** em v2 |
| `LEGADO/src/pages/BalancePage.tsx` | **CRIAR** em v2 |
| `LEGADO/src/pages/AdminPage.tsx` | **CRIAR** em v2 |
| `LEGADO/src/pages/NotFound.tsx` | Substituir v2 |

### 3.4. Páginas Admin (CRIAR PASTA)

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/pages/admin/GroupManagementTab.tsx` | **CRIAR** |
| `LEGADO/src/pages/admin/ProductsTab.tsx` | **CRIAR** |
| `LEGADO/src/pages/admin/UploadTab.tsx` | **CRIAR** |
| `LEGADO/src/pages/admin/BalanceManagerTab.tsx` | **CRIAR** |

### 3.5. Páginas Settings (CRIAR PASTA)

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/pages/settings/SortOrderTab.tsx` | **CRIAR** |
| `LEGADO/src/pages/settings/DangerZoneTab.tsx` | **CRIAR** |

### 3.6. Componentes Balance (CRIAR PASTA)

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/components/balance/BalanceView.tsx` | **CRIAR** |
| `LEGADO/src/components/balance/BalanceGridDesktop.tsx` | **CRIAR** |
| `LEGADO/src/components/balance/BalanceListMobile.tsx` | **CRIAR** |
| `LEGADO/src/components/balance/balanceFormat.ts` | **CRIAR** |

### 3.7. Componentes Charts (CRIAR PASTA)

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/components/charts/SalesChart.tsx` | **CRIAR** |
| `LEGADO/src/components/charts/BarChartComponent.tsx` | **CRIAR** |
| `LEGADO/src/components/charts/HotTimeChart.tsx` | **CRIAR** |
| `LEGADO/src/components/charts/WeekdayBarChart.tsx` | **CRIAR** |
| `LEGADO/src/components/charts/ProductPieChart.tsx` | **CRIAR** |
| `LEGADO/src/components/charts/MsfsComparisonCard.tsx` | **CRIAR** |

### 3.8. Componentes Layout

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/components/layout/AppShell.tsx` | Substituir v2 |
| `LEGADO/src/components/layout/TopNav.tsx` | Substituir v2 |
| `LEGADO/src/components/layout/BottomNav.tsx` | Substituir v2 |

### 3.9. Componentes UI Faltando

Copiar de `LEGADO/src/components/ui/` para `v2/web/src/components/ui/`:

- `tabs.tsx` ❌ **FALTANDO**
- `select.tsx` ❌ **FALTANDO**
- `textarea.tsx` ❌ **FALTANDO**
- `sonner.tsx` ❌ **FALTANDO**
- `tooltip.tsx` ❌ **FALTANDO**
- `table.tsx` ❌ **FALTANDO**
- `separator.tsx` ❌ **FALTANDO**
- `progress.tsx` ❌ **FALTANDO**
- `chart.tsx` ❌ **FALTANDO**
- E outros que forem necessários

### 3.10. API Client

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/api/partnerApi.ts` | **ADAPTAR** para endpoints v2 |
| `LEGADO/src/api/apiClient.ts` | Substituir v2 |

### 3.11. Types

| Arquivo LEGADO | Ação |
|----------------|------|
| `LEGADO/src/types/index.ts` | Mesclar com v2 |
| `LEGADO/src/types/balance.ts` | **CRIAR** em v2 |
| `LEGADO/src/types/audit.ts` | **CRIAR** em v2 |

---

## 4. Adaptação de API (CRÍTICO)

O LEGADO usa endpoints `?action=X`, o v2 usa REST. Você DEVE adaptar as chamadas.

### 4.1. Mapeamento de Endpoints

| LEGADO (antigo) | v2 (novo) |
|-----------------|-----------|
| `GET /backend/api.php?action=products` | `GET /api/tracked-products` |
| `GET /backend/api.php?action=groups` | `GET /api/groups` |
| `POST /backend/api.php?action=create_group` | `POST /api/groups` |
| `GET /backend/api.php?action=report&start=X&end=Y` | `GET /api/reports?start=X&end=Y` |
| `GET /backend/api.php?action=date_range` | `GET /api/reports/date-range` |
| `POST /backend/api.php?action=update_product` | `PATCH /api/tracked-products/{id}` |
| `POST /backend/upload.php` | `POST /api/imports` |
| `GET /backend/api.php?action=available_products` | `GET /api/products` |

### 4.2. Produtos e Tracking

O LEGADO tinha `whitelist.php` para produtos rastreados.
O v2 usa `all_products.is_tracked`.

**Adaptar**:
- `ProductsTab.tsx` deve usar `GET /api/products` e `PATCH /api/products/{id}` para toggle tracking
- Produtos tracked vão para `GET /api/tracked-products`

### 4.3. Exemplo de Adaptação

**LEGADO** (`partnerApi.ts`):
```typescript
export async function fetchProducts(): Promise<Product[]> {
  const response = await apiClient.get('/backend/api.php?action=products');
  return response.data;
}
```

**v2** (adaptado):
```typescript
export async function fetchTrackedProducts(): Promise<TrackedProduct[]> {
  const response = await apiClient.get('/api/tracked-products');
  return response.data.data;
}
```

---

## 5. Endpoints v2 Disponíveis (Referência)

Consulte `docs/CONTRACTS.md` para detalhes completos.

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | Lista all_products (discovery) |
| PATCH | `/api/products/{id}` | Toggle tracking |
| GET | `/api/tracked-products` | Lista produtos tracked |
| PATCH | `/api/tracked-products/{id}` | Atualiza label/group |
| GET | `/api/groups` | Lista grupos |
| POST | `/api/groups` | Cria grupo |
| DELETE | `/api/groups/{id}` | Remove grupo |
| POST | `/api/imports` | Upload CSV/ZIP |
| GET | `/api/imports` | Histórico de imports |
| GET | `/api/reports?start=&end=` | Relatório por período |
| GET | `/api/reports/date-range` | Min/max datas |

### Endpoints de Balance (verificar se existem no backend v2)

Se não existirem, você precisará criar ou o Backend Agent precisa implementar:
- `GET /api/balance?year=YYYY`
- `POST /api/balance/expenses`
- `PATCH /api/balance/expenses/{id}`
- `DELETE /api/balance/expenses/{id}`
- `POST /api/balance/withdrawals`
- etc.

---

## 6. Navegação Correta

### 6.1. Rotas
```
/           → DashboardPage
/graphics   → GraphicsPage
/balance    → BalancePage
/admin      → AdminPage (com tabs)
/login      → Login (backend renderiza HTML)
/logout     → Logout (backend)
```

### 6.2. BottomNav (Mobile)
Ícones: Dashboard, Graphics, Balance, Admin

### 6.3. TopNav (Desktop)
Links: Dashboard, Graphics, Balance, Admin

---

## 7. Autenticação

O backend v2 tem autenticação via sessão PHP + TOTP.

### 7.1. Verificar Autenticação no Frontend

O frontend deve verificar se o usuário está autenticado:
- Fazer request para `/api/health` ou outro endpoint protegido
- Se retornar 401, redirecionar para `/login`

### 7.2. Exemplo de Route Guard

```typescript
// hooks/useAuth.ts
export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => {
        setIsAuthenticated(res.ok);
        if (!res.ok) {
          window.location.href = '/login';
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }, []);

  return isAuthenticated;
}
```

---

## 8. Build e Deploy

Após fazer todas as alterações:

### 8.1. Testar Localmente
```bash
cd v2/web
npm install
npm run dev
```

### 8.2. Build
```bash
cd v2
python scripts/build_dist.py
```

### 8.3. Atualizar Branch Deploy
```bash
git add .
git commit -m "fix: restore LEGADO frontend with v2 API adaptation"
git push origin feat/lovable-skin

# Atualizar branch de deploy
git subtree split --prefix=v2/dist -b deploy --rejoin
git push origin deploy --force
```

### 8.4. Deploy na Hostinger
- Ir em Advanced → Git → Deploy
- Ou esperar auto-deploy se configurado

---

## 9. Checklist de Entrega

### Estilo
- [ ] index.css com Apple Dark Design System
- [ ] Fonte Inter carregando
- [ ] Cores corretas (fundo preto, cards cinza escuro)
- [ ] Animações fade-in funcionando

### Páginas
- [ ] DashboardPage visual idêntico ao LEGADO
- [ ] GraphicsPage funcionando
- [ ] BalancePage funcionando (despesas, withdrawals)
- [ ] AdminPage com 6 tabs funcionando

### Funcionalidades
- [ ] Upload de CSV funciona
- [ ] Toggle tracking de produtos funciona
- [ ] Criação de grupos funciona
- [ ] Relatórios por período funcionam
- [ ] Gestão de despesas funciona
- [ ] Gestão de withdrawals funciona

### Mobile
- [ ] BottomNav aparece no mobile
- [ ] Sem overflow horizontal
- [ ] Touch targets 44x44px

### Autenticação
- [ ] Redireciona para /login se não autenticado
- [ ] Consegue fazer login com TOTP

---

## 10. Arquivos Finais Esperados

```
v2/web/src/
├── index.css                    # Apple Dark Design
├── App.tsx                      # Rotas corretas
├── main.tsx
├── api/
│   ├── apiClient.ts
│   └── partnerApi.ts            # Adaptado para v2
├── components/
│   ├── balance/
│   │   ├── BalanceView.tsx
│   │   ├── BalanceGridDesktop.tsx
│   │   ├── BalanceListMobile.tsx
│   │   └── balanceFormat.ts
│   ├── charts/
│   │   ├── SalesChart.tsx
│   │   ├── BarChartComponent.tsx
│   │   ├── HotTimeChart.tsx
│   │   ├── WeekdayBarChart.tsx
│   │   ├── ProductPieChart.tsx
│   │   └── MsfsComparisonCard.tsx
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── TopNav.tsx
│   │   └── BottomNav.tsx
│   └── ui/
│       └── (todos os componentes shadcn necessários)
├── hooks/
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   └── useAuth.ts               # Novo
├── pages/
│   ├── DashboardPage.tsx
│   ├── GraphicsPage.tsx
│   ├── BalancePage.tsx
│   ├── AdminPage.tsx
│   ├── NotFound.tsx
│   ├── admin/
│   │   ├── GroupManagementTab.tsx
│   │   ├── ProductsTab.tsx
│   │   ├── UploadTab.tsx
│   │   └── BalanceManagerTab.tsx
│   └── settings/
│       ├── SortOrderTab.tsx
│       └── DangerZoneTab.tsx
├── types/
│   ├── index.ts
│   ├── balance.ts
│   ├── product.ts
│   ├── report.ts
│   └── audit.ts
└── lib/
    └── utils.ts
```

---

## 11. Dependências Necessárias

Verificar se `v2/web/package.json` tem todas:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.x",
    "react-router-dom": "^6.x",
    "recharts": "^2.x",
    "lucide-react": "^0.x",
    "date-fns": "^2.x ou ^3.x",
    "sonner": "^1.x",
    "@radix-ui/react-tabs": "^1.x",
    "@radix-ui/react-select": "^2.x",
    "@radix-ui/react-tooltip": "^1.x",
    // ... outros do shadcn
  }
}
```

Se faltar algum, instalar:
```bash
npm install sonner @radix-ui/react-tabs @radix-ui/react-select @radix-ui/react-tooltip
```

---

## 12. Referência Rápida de Arquivos

Para cada arquivo que você precisar, veja no LEGADO:

```
LEGADO/src/index.css              → Copiar inteiro
LEGADO/src/App.tsx                → Copiar e adaptar imports
LEGADO/src/pages/*.tsx            → Copiar todos
LEGADO/src/pages/admin/*.tsx      → Copiar todos
LEGADO/src/pages/settings/*.tsx   → Copiar todos
LEGADO/src/components/balance/*   → Copiar todos
LEGADO/src/components/charts/*    → Copiar todos
LEGADO/src/components/layout/*    → Copiar todos
LEGADO/src/components/ui/*        → Copiar os faltantes
LEGADO/src/api/*                  → Adaptar para v2
LEGADO/src/types/*                → Copiar e mesclar
```

---

*Versão: 1.0 | Data: 2026-01-08*
