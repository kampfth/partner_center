# 05 — Frontend Map (v1 / React SPA)

## Páginas/telas e responsabilidades

Rotas definidas em `LEGADO/src/App.tsx`:

- **`/` — Dashboard**
  - Busca `date_range` para definir período default (mês do último sale).
  - Busca `report` para preencher KPIs e gráfico de vendas diárias.
  - UI: cards de estatísticas + gráfico + “Top products”.

- **`/graphics` — Graphics**
  - Busca `report` + `sort_order` + analytics (`sales_by_weekday`, `sales_by_time_bucket`, `sales_by_msfs_version`).
  - UI: cards e gráficos (Recharts) + tabela resumo.
  - Inclui ações utilitárias:
    - “Copy for Sheets” (TSV)
    - “Send via WhatsApp” (link `wa.me` com texto)

- **`/balance` — Balance**
  - Busca anos disponíveis (`balance_years`) e dados do ano (`balance`).
  - Permite CRUD de despesas e retiradas via dialogs.
  - Exibe planilha (desktop) e visão simplificada (mobile).

- **`/admin` — Admin (Tabs)**
  - Tabs: Groups, Products, Upload, Balance, Sort, Danger
  - Centraliza tarefas administrativas e manutenção.

## Componentes principais

- **Layout**
  - `components/layout/AppShell.tsx`: wrapper com `TopNav`, `BottomNav`, `Outlet`.
  - `TopNav.tsx`: header sticky; navegação desktop; label da página no mobile.
  - `BottomNav.tsx`: navegação mobile fixed (touch targets).

- **API client**
  - `src/api/apiClient.ts`: `get/post/upload` com detecção de HTML e redirect pro login; usa cookies (`credentials: include`).
  - `src/api/partnerApi.ts`: funções tipadas por endpoint/action.

- **Charts**
  - `src/components/charts/*`: gráficos Recharts (daily, pie, weekday, time buckets, MSFS comparison).

- **Balance UI**
  - `src/components/balance/*`: grid desktop, list mobile, formatação e helpers.

- **Admin Tabs**
  - `src/pages/admin/*`: cada tab encapsula UI + chamadas API.

## UX mobile-first (as-is)

Pontos positivos:
- `BottomNav` dedicado no mobile.
- Container com padding consistente (`container-mobile`).
- Uso de skeletons/loading states em páginas principais.
- Botões e targets com classes como `touch-target`.

Pontos de atenção:
- Tabelas longas (ex.: summary em Graphics) usam `overflow-x-auto` — ok, mas precisa checar “no horizontal scroll” em toda a app.
- Balance é uma visão naturalmente “wide”; precisa de foco em mobile (já existe `BalanceListMobile.tsx`, mas deve ser validado com datasets grandes).

## Checklist (acessibilidade e performance)

### Acessibilidade

- [ ] Inputs com `Label` e `htmlFor` (já existe em muitos locais).
- [ ] Estados de erro com ação de retry (`ErrorState`).
- [ ] Contraste em dark mode (shadcn/ui).
- [ ] Foco visível em elementos interativos (tailwind defaults + shadcn).
- [ ] Navegação por teclado nos tabs/dialogs (Radix ajuda).

### Performance

- [x] Code-splitting por rotas (`lazy` + `Suspense` em `App.tsx`).
- [ ] Evitar overfetch: Balance faz 12 RPCs/ano no backend (impacta TTFB, não o JS).
- [ ] Evitar render pesado em tabelas grandes (virtualização só se necessário).
- [ ] Bundle audit (já existe relato em `CLEANUP_REPORT.md`).

## “As-is vs Should-be” (frontend)

- **As-is**: Admin → Products usa fluxo `all_products` (descoberta/tracking).
- **Problema**: DB atual não tem tabela `all_products`, então essa tela tende a quebrar.
- **Should-be (rebuild)**: tracking deve ser consistente e dirigido pelo DB (sem whitelist hardcoded no backend).

