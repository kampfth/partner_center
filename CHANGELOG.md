# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.0.0] - 2026-01-09 - Enterprise Refactor

### 🏗️ Major Architecture Changes

#### Data Dictionary Standardization
- **Created `docs/DATA_DICTIONARY.md`** — Single source of truth for all column names
- **Standard naming convention** — All columns now match Microsoft Partner Center CSV format exactly
- **Database migration applied** — Renamed columns in `v2.transactions`:
  - `purchase_date` → `transaction_date` (now `timestamptz` for time-based analytics)
  - `amount_usd` → `transaction_amount`
  - `customer_country` → `transaction_country_code`
- **Updated `daily_sales` view** — Uses new column names
- **Updated `get_product_summary` function** — Uses new column names

#### Backend Standardization
- **CsvParser.php** — Header mapping now uses standard names:
  - `transactiondate` → `transaction_date`
  - `transactionamount` → `transaction_amount`
  - `transactioncountrycode` → `transaction_country_code`
  - `externalreferenceidlabel` → `external_reference_label`
- **ImportService.php** — Transaction inserts use standard column names
- **AnalyticsService.php** — All queries use `transaction_date`, `transaction_amount`
- **ReportService.php** — Date range queries use `transaction_date`
- **BalanceService.php** — Year detection uses `transaction_date`
- **Tests updated** — All assertions use new standard names

### Why This Matters
- **No more column name confusion** — CSV → DB → API → Frontend all use consistent names
- **Easier debugging** — When you see `transaction_date` anywhere, it means the same thing
- **Future-proof** — Adding new CSV columns follows the same pattern
- **Professional codebase** — Enterprise-grade naming conventions

---

### Fixed (v2 - 2026-01-09 - Hotfix)
- **Groups creation 400 error** — Frontend was sending `productIds` but backend expected `product_ids`; fixed API payload in `partnerApi.ts`
- **MSFS 2020 vs 2024 shows 0** — Backend was checking `msfs_version` column but data is in `lever` column; updated `AnalyticsService.php` to detect version from lever ("Microsoft Flight Simulator" = 2020, "Microsoft Flight Simulator 2024" = 2024)
- **Balance page infinite loading** — Fixed race condition in useEffect hooks; improved initialization flow with proper state management
- **Weekday chart issues** — Fixed gray cursor background (added `cursor={false}`), wrong order (now Sunday-Saturday), black unreadable text (fixed tooltip colors), missing days (now shows all 7 days)
- **Hot Time chart issues** — Changed from 4-hour to 2-hour intervals (12 bars), fixed gray cursor and black text in tooltip
- **Dashboard cards CSS** — Fixed text truncation, borders cutting content, improved mobile sizing with responsive padding

### Added (v2 - 2026-01-09 - Hotfix)
- **Units line in Daily Sales chart** — Added cyan line showing units sold per day with dual Y-axis
- **Avg/Day card in Dashboard** — New stat card showing average sales per day (now 5 cards: Total Sales, Units Sold, Avg/Day, Avg/Unit, Period)
- **Smooth page transitions** — Added fade-in animations when navigating between pages
- **HTACCESS_DEPLOY.md** — Comprehensive .htaccess configuration documentation for Hostinger deployment

### Changed (v2 - 2026-01-09 - Hotfix)
- Dashboard grid now uses 5-column layout on desktop, 3 on tablet, 2 on mobile
- Hot Time chart now shows 12 bars (2-hour intervals) instead of 6 (4-hour intervals)
- Weekday chart now ordered Sunday to Saturday (English)
- Page loader now shows centered spinner instead of skeleton

### Fixed (v2 - 2026-01-09)
- **Balance page permission denied** — Applied migration to grant `service_role` full access to all v2 tables including balance tables
- **Graphics page "column lever does not exist"** — Removed `transactions.lever` dependency from AnalyticsService; MSFS version detection now uses only `msfs_version` column
- **Groups selection not working** — Fixed checkbox IDs/click targets in GroupManagementTab; redesigned to 2-column layout (create left, existing groups right)
- **Auth flash (dashboard visible before redirect)** — Added `GET /api/session` endpoint and frontend `AuthGate` component to gate routes until session check completes
- **Dashboard card spacing** — Adjusted StatCard padding/margins to match LEGADO style

### Added (v2 - 2026-01-09)
- **Bulk track/untrack** in Products tab — Select multiple products and track/untrack in batch
- **Product label editing** — UI for setting custom display labels (requires product to be tracked)
- **Session check endpoint** — `GET /api/session` returns `{ authenticated: boolean }` for frontend gating
- **Mobile-responsive Admin tabs** — Horizontal scroll on small screens, icons-only with text on larger screens

### Changed (v2 - 2026-01-09)
- GroupManagementTab now uses 2-column layout on desktop, stacked on mobile
- ProductsTab has selection checkboxes and bulk action buttons
- AdminPage tabs use overflow-x-auto for mobile friendliness

### Fixed (v2 Frontend - 2026-01-08)
- **Restored LEGADO visual design** — Apple Dark Design System with proper colors, fonts, and animations
- **Replaced generic pages** with fully-featured LEGADO pages:
  - `DashboardPage` — Sales overview, date selection, KPIs, daily chart, top products
  - `GraphicsPage` — Detailed reports with MSFS comparison, weekday/time charts, pie charts
  - `BalancePage` — Monthly revenue, expenses, withdrawals management
  - `AdminPage` — 6 tabs (Groups, Products, Upload, Balance, Sort Order, Danger Zone)
- **Correct navigation** — Dashboard, Graphics, Balance, Admin (bottom nav on mobile, top nav on desktop)
- **All chart components** ported from LEGADO with Recharts v3 compatibility fixes
- **Balance components** — BalanceView, BalanceGridDesktop, BalanceListMobile with full expense/withdrawal management
- **API client adapted** — All endpoints mapped from LEGADO `?action=X` style to v2 REST API
- **Types merged** — Complete TypeScript types for balance, products, groups, reports, audit
- **Dependencies updated** — All required shadcn/ui components, radix primitives, recharts, sonner

### Added (v2 Frontend)
- **Frontend v2 scaffold** in `v2/web/` — React 18 + TypeScript + Vite
- **Tailwind CSS v3** with shadcn/ui dark theme
- **TanStack Query v5** for data fetching with caching
- **Recharts** for sales charts (AreaChart)
- **Mobile-first responsive layout**:
  - `TopNav` (desktop) + `BottomNav` (mobile) navigation
  - `AppShell` wrapper with route outlet
  - Touch targets 44x44px minimum
- **Pages implemented**:
  - `DashboardPage` — KPIs, sales chart, top products
  - `ProductsPage` — Product discovery list with tracking toggle
  - `GroupsPage` — Create/delete groups, accordion list
  - `ImportsPage` — Drag & drop CSV/ZIP upload, import history
  - `ReportsPage` — Date range picker, summary table, charts
  - `NotFound` — 404 page
- **Reusable components**:
  - `LoadingState`, `ErrorState`, `EmptyState` for all fetch states
  - `PageHeader` for consistent page titles
  - `DateRangePicker` with presets
  - `KPICard`, `SalesChart`, `TopProductsList`, `SummaryTable`
- **API client** with typed endpoints matching `docs/CONTRACTS.md`
- **Custom hooks**: `useProducts`, `useGroups`, `useImports`, `useReports`

### Added (v2 Backend)
- **Backend v2 scaffold** in `v2/backend/` — PHP 8.1+ modular architecture
- **Router + Controllers + Services** pattern following `docs/BRIEF_BACKEND.md`
- **TOTP-only authentication** with session management and setup mode
- **Supabase REST client** targeting schema `v2` via Accept-Profile/Content-Profile headers
- **Endpoints implemented (P0/P1)**:
  - `GET /api/health` (public)
  - `GET /api/products`, `PATCH /api/products/{id}` (tracking toggle)
  - `GET /api/tracked-products`, `PATCH /api/tracked-products/{id}`
  - `GET /api/groups`, `POST /api/groups`, `DELETE /api/groups/{id}`
  - `POST /api/imports` (CSV/ZIP upload with discovery + dedupe)
  - `GET /api/imports` (import history)
  - `GET /api/reports`, `GET /api/reports/date-range`
- **Balance/Financial endpoints**:
  - `GET /api/balance`, `GET /api/balance/years`
  - `POST/PATCH/DELETE /api/expenses/{id}`
  - `POST/PATCH/DELETE /api/withdrawals/{id}`
  - `POST/PATCH/DELETE /api/revenue-adjustments/{id}`
  - `GET/POST /api/initial-cash`, `DELETE /api/initial-cash/{year}`
- **Partners endpoints**: `GET /api/partners`, `PUT /api/partners`
- **Settings endpoints**: `GET/PUT /api/settings/sort-order`, `GET /api/audit-logs`
- **Analytics endpoints**: `GET /api/analytics/weekday`, `GET /api/analytics/time-bucket`, `GET /api/analytics/msfs-version`
- **Admin endpoints**: `POST /api/admin/truncate`, `POST /api/admin/reset`
- **Login page** at `/login` with QR code setup for new installations
- **.htaccess example** for Hostinger deployment (`v2/backend/htaccess_root_example.txt`)
- **New database tables in schema v2**:
  - `balance_expenses`, `balance_withdrawals`, `balance_revenue_adjustments`
  - `balance_initial_cash`, `partners`, `app_settings`, `audit_logs`

### Changed
- `docs/07_runbook.md` updated with v2 backend instructions

### Previous Changes
- Phase 1: Discovery/Audit docs added (`/docs/00`–`/docs/05`).
- Phase 2: Rebuild plan + runbook added (`/docs/06`–`/docs/07`).
- v1 behavior change: CSV upload now always updates `all_products` and only persists `transactions` for products where `all_products.is_tracked=true` (replaces hardcoded whitelist).
- DB: added `public.all_products` table (discovery + tracking).

