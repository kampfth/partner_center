# Frontend Agent Brief — Partner Center v2

> **Missão**: Reescrever o frontend React do zero, mobile-first, seguindo o contrato em `docs/CONTRACTS.md`.

---

## 1. Contexto

Você está construindo o frontend v2 do Partner Center.  
O código legado está em `LEGADO/src/` — use apenas como **referência de UX/fluxos**, não copie.

### Tecnologias
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS
- shadcn/ui (componentes base)
- React Router v6 (navegação)
- TanStack Query (data fetching)
- Recharts (gráficos)

### API Backend
- Base URL: `/api` (ou variável de ambiente)
- Consulte `docs/CONTRACTS.md` seção 3 para endpoints

---

## 2. Arquitetura Obrigatória

```
v2/web/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router + providers
│   ├── api/
│   │   ├── client.ts         # Fetch wrapper com error handling
│   │   └── endpoints.ts      # Funções tipadas por endpoint
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── AppShell.tsx  # Layout principal (nav + content)
│   │   │   ├── TopNav.tsx    # Navegação desktop
│   │   │   └── BottomNav.tsx # Navegação mobile
│   │   ├── products/         # Componentes de produtos
│   │   ├── groups/           # Componentes de grupos
│   │   ├── imports/          # Componentes de upload
│   │   └── reports/          # Componentes de relatórios
│   ├── pages/
│   │   ├── DashboardPage.tsx # Overview + KPIs
│   │   ├── ProductsPage.tsx  # Lista all_products + toggle tracking
│   │   ├── GroupsPage.tsx    # Gerenciar grupos
│   │   ├── ImportsPage.tsx   # Upload CSV + histórico
│   │   ├── ReportsPage.tsx   # Relatórios detalhados
│   │   └── NotFound.tsx
│   ├── hooks/
│   │   ├── useProducts.ts    # Query hooks para produtos
│   │   ├── useGroups.ts      # Query hooks para grupos
│   │   ├── useReports.ts     # Query hooks para reports
│   │   └── useImports.ts     # Query hooks para imports
│   ├── types/
│   │   └── index.ts          # Tipos do contrato (copiar de CONTRACTS.md)
│   ├── lib/
│   │   └── utils.ts          # Utilitários (cn, formatters)
│   └── index.css             # Tailwind + custom styles
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Regras de estrutura
- **Nenhum componente > 150 linhas** (extrair subcomponentes)
- Páginas: orquestram layout e chamam hooks
- Hooks: encapsulam TanStack Query
- Componentes: UI pura, recebem props

---

## 3. Páginas a Implementar

| Rota | Página | Descrição | Prioridade |
|------|--------|-----------|------------|
| `/` | DashboardPage | Overview com KPIs e gráfico principal | P0 |
| `/products` | ProductsPage | Lista all_products + toggle tracking | P0 |
| `/groups` | GroupsPage | Criar/gerenciar grupos | P1 |
| `/imports` | ImportsPage | Upload CSV + histórico | P0 |
| `/reports` | ReportsPage | Relatórios com filtro de data | P1 |

**P0** = MVP, **P1** = Essencial

---

## 4. Fluxos de UX Críticos

### 4.1. Products Page (P0)
```
┌─────────────────────────────────────┐
│ Products                    [Search]│
├─────────────────────────────────────┤
│ ○ Product A         Marketplace     │
│   First seen: 2025-10-01            │
│   [Toggle: OFF]                     │
├─────────────────────────────────────┤
│ ● Product B         Marketplace     │ ← Tracked (filled)
│   First seen: 2025-10-01            │
│   [Toggle: ON]                      │
└─────────────────────────────────────┘
```

**Comportamento**:
- Lista `GET /api/products`
- Search client-side por nome
- Toggle chama `PATCH /api/products/{id}` com `{ is_tracked: true/false }`
- Feedback visual imediato (optimistic update)
- Toast de sucesso/erro

### 4.2. Imports Page (P0)
```
┌─────────────────────────────────────┐
│ Import CSV                          │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │     Drag & drop CSV/ZIP       │  │
│  │         or click to select    │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│ Last Import: 2026-01-08             │
│ • Rows read: 1500                   │
│ • Products discovered: 3            │
│ • Transactions inserted: 450        │
│ • Skipped (duplicates): 12          │
│ • Untracked: 1038                   │
└─────────────────────────────────────┘
```

**Comportamento**:
- Upload via `POST /api/imports` (multipart/form-data)
- Progress indicator durante upload
- Exibir métricas do resultado
- Histórico com `GET /api/imports`

### 4.3. Groups Page (P1)
```
┌─────────────────────────────────────┐
│ Groups                              │
├─────────────────────────────────────┤
│ [+ Create Group]                    │
├─────────────────────────────────────┤
│ ▼ Flight Sim Bundle (3 products)   │
│   • Product A                       │
│   • Product B                       │
│   • Product C                       │
├─────────────────────────────────────┤
│ ▼ Scenery Pack (2 products)        │
│   • Product D                       │
│   • Product E                       │
└─────────────────────────────────────┘
```

**Criar grupo**:
1. Modal com input de nome
2. Lista de produtos tracked sem grupo (checkbox)
3. Validar: min 2 produtos
4. Submit: `POST /api/groups`

### 4.4. Dashboard (P0)
```
┌─────────────────────────────────────┐
│ Dashboard            [Date Range ▼] │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │$1.2K│ │ 150 │ │ 5   │            │
│ │Total│ │Units│ │Prods│            │
│ └─────┘ └─────┘ └─────┘            │
├─────────────────────────────────────┤
│ [        Line Chart               ] │
│ [        Daily Sales              ] │
├─────────────────────────────────────┤
│ Top Products/Groups                 │
│ 1. Flight Sim Bundle     $500.00   │
│ 2. Product A             $250.00   │
│ 3. Product B             $200.00   │
└─────────────────────────────────────┘
```

**Dados**:
- `GET /api/reports?start=&end=` para summary + daily
- `GET /api/reports/date-range` para limites do date picker

---

## 5. Estados Obrigatórios

Todo componente que faz fetch deve ter:

```tsx
// Loading
if (isLoading) return <LoadingState />;

// Error
if (error) return <ErrorState message={error.message} onRetry={refetch} />;

// Empty
if (data.length === 0) return <EmptyState message="No products found" />;

// Success
return <ProductList data={data} />;
```

### Componentes de estado
```tsx
// src/components/ui/LoadingState.tsx
export function LoadingState({ message = "Loading..." }) { ... }

// src/components/ui/ErrorState.tsx
export function ErrorState({ message, onRetry }) { ... }

// src/components/ui/EmptyState.tsx
export function EmptyState({ message, action? }) { ... }
```

---

## 6. Mobile-First Obrigatório

### Regras
- **Nenhum overflow horizontal** em telas < 375px
- Touch targets mínimo 44x44px
- Navegação via BottomNav no mobile
- Tabelas viram cards/listas no mobile
- Date picker adaptado para mobile

### Breakpoints
```css
/* Mobile first */
.component { /* mobile styles */ }

@media (min-width: 768px) {
  .component { /* tablet+ styles */ }
}

@media (min-width: 1024px) {
  .component { /* desktop styles */ }
}
```

### Navegação
```tsx
// Mobile: BottomNav fixa
// Desktop: TopNav/Sidebar

function AppShell() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  
  return (
    <div className="min-h-screen">
      {!isMobile && <TopNav />}
      <main className="pb-16 md:pb-0">
        <Outlet />
      </main>
      {isMobile && <BottomNav />}
    </div>
  );
}
```

---

## 7. API Client

### Estrutura
```typescript
// src/api/client.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Request failed');
  }

  return res.json();
}
```

### Endpoints tipados
```typescript
// src/api/endpoints.ts
import type { ApiResponse, DiscoveredProduct, TrackedProduct, Group, ... } from '@/types';

export const productsApi = {
  list: (tracked?: boolean) => 
    apiRequest<ApiResponse<DiscoveredProduct[]>>(
      `/products${tracked !== undefined ? `?tracked=${tracked}` : ''}`
    ),
  
  toggleTracking: (productId: string, isTracked: boolean) =>
    apiRequest<ApiResponse<{ product_id: string; is_tracked: boolean }>>(
      `/products/${productId}`,
      { method: 'PATCH', body: JSON.stringify({ is_tracked: isTracked }) }
    ),
};

export const groupsApi = {
  list: () => apiRequest<ApiResponse<Group[]>>('/groups'),
  create: (name: string, productIds: string[]) =>
    apiRequest<ApiResponse<Group>>(
      '/groups',
      { method: 'POST', body: JSON.stringify({ name, product_ids: productIds }) }
    ),
};

// ... etc
```

---

## 8. Hooks (TanStack Query)

```typescript
// src/hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/api/endpoints';

export function useProducts(tracked?: boolean) {
  return useQuery({
    queryKey: ['products', { tracked }],
    queryFn: () => productsApi.list(tracked),
  });
}

export function useToggleTracking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ productId, isTracked }: { productId: string; isTracked: boolean }) =>
      productsApi.toggleTracking(productId, isTracked),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
```

---

## 9. Tipos (copiar de CONTRACTS.md seção 4)

```typescript
// src/types/index.ts
// COPIAR INTEGRALMENTE de docs/CONTRACTS.md seção 4
```

---

## 10. DoD (Definition of Done)

- [ ] Scaffold completo (Vite + React + TS + Tailwind + shadcn)
- [ ] Rotas funcionando (/, /products, /groups, /imports, /reports)
- [ ] ProductsPage com toggle tracking funcional
- [ ] ImportsPage com upload e exibição de resultado
- [ ] GroupsPage com criação de grupo
- [ ] DashboardPage com KPIs e gráfico
- [ ] Navegação mobile (BottomNav) + desktop (TopNav)
- [ ] Estados loading/error/empty em todas as páginas
- [ ] Sem overflow horizontal no mobile (testar 375px)
- [ ] Nenhum componente > 150 linhas

---

## 11. Dependências (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "recharts": "^2.10.0",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 12. Referências do Legado

| Arquivo | O que extrair |
|---------|---------------|
| `LEGADO/src/App.tsx` | Estrutura de rotas, providers |
| `LEGADO/src/pages/AdminPage.tsx` | Tabs, layout de admin |
| `LEGADO/src/pages/admin/GroupManagementTab.tsx` | UX de criar grupo |
| `LEGADO/src/pages/admin/UploadTab.tsx` | UX de upload |
| `LEGADO/src/components/layout/` | AppShell, navegação |
| `LEGADO/src/api/partnerApi.ts` | Chamadas de API |
| `LEGADO/src/types/` | Tipos existentes |

**NÃO COPIE** — apenas use como referência para entender UX.

---

## 13. Checklist de Entrega

```
v2/web/
├── src/main.tsx            ✓ Entry point
├── src/App.tsx             ✓ Router + providers
├── src/api/client.ts       ✓ Fetch wrapper
├── src/api/endpoints.ts    ✓ Endpoints tipados
├── src/types/index.ts      ✓ Tipos do contrato
├── src/pages/*             ✓ 5 páginas
├── src/components/layout/* ✓ AppShell, navs
├── src/components/ui/*     ✓ shadcn components usados
├── src/hooks/*             ✓ Query hooks
├── index.html              ✓ HTML base
├── vite.config.ts          ✓ Config Vite
├── tailwind.config.ts      ✓ Config Tailwind
└── package.json            ✓ Dependências
```

---

## 14. Estilo Visual

- **Tema escuro por padrão** (dark mode)
- Cores: usar CSS variables do shadcn/ui
- Tipografia: system fonts (não precisa de custom fonts)
- Espaçamento: seguir escala do Tailwind (4, 8, 16, 24, 32)
- Border radius: `rounded-lg` (8px) como padrão
- Sombras: sutis (`shadow-sm`, `shadow-md`)

---

*Versão: 1.0 | Data: 2026-01-08*
