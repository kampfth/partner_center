# Partner Center - Project Context for AI Agent

## Overview

**Partner Center** is a financial dashboard for managing sales data from Microsoft Flight Simulator marketplace. It's used by two business partners (Kampf and Leo) to track product sales, expenses, withdrawals, and profit distribution.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** as bundler
- **Tailwind CSS** for styling
- **shadcn/ui** component library (Radix UI primitives)
- **Recharts** for data visualization
- **React Router** for navigation (SPA)

### Backend
- **PHP** (vanilla, no framework)
- **Supabase** as database (PostgreSQL)
- API endpoints in `backend/api.php`

### Hosting
- **Hostinger** shared hosting
- FTP deployment
- SPA routing handled via `.htaccess` rewrite rules

---

## Project Structure

```
PartnerCenter/
├── src/                          # React frontend source
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # TopNav, BottomNav, PageLoader
│   │   ├── balance/              # Balance page components
│   │   └── charts/               # Chart components (Recharts)
│   ├── pages/
│   │   ├── DashboardPage.tsx     # Main dashboard with KPIs
│   │   ├── GraphicsPage.tsx      # Advanced charts (was ReportPage)
│   │   ├── BalancePage.tsx       # Financial spreadsheet view
│   │   ├── AdminPage.tsx         # Admin settings
│   │   └── admin/                # Admin tab components
│   ├── api/
│   │   └── partnerApi.ts         # API client functions
│   └── types/
│       └── index.ts              # TypeScript interfaces
├── backend/
│   ├── api.php                   # Main API endpoint (all actions)
│   ├── upload.php                # CSV file upload handler
│   ├── supabase.php              # Supabase client class
│   ├── config.php                # Environment config
│   └── auth.php                  # Authentication middleware
├── dist/                         # Production build output (for FTP)
├── scripts/
│   └── build_dist.py             # Build script for deployment
└── database_migrations/          # SQL migration files
```

---

## Key Pages & Features

### 1. Dashboard (`/`)
- Total revenue, units sold, average price
- Daily sales bar chart
- Product distribution pie chart

### 2. Graphics (`/graphics`)
- MSFS 2020 vs 2024 comparison
- Sales by day of week
- Hot Time (sales by 4-hour UTC buckets)
- Product summary table

### 3. Balance (`/balance`)
- Spreadsheet-like view showing:
  - **Products** (rows) × **Months** (columns) = Revenue per product/month
  - **Expenses** section (manually added)
  - **Withdrawals** section (per partner)
  - **Summary**: Revenue, Expenses, Net, Per Partner
- Year selector
- Month status indicators:
  - *Italic*: Current month (latest with data)
  - **Bold + green bg**: Closed months
  - Normal: Future months

### 4. Admin (`/admin`)
- **Partners**: Manage Kampf & Leo
- **Groups**: Product groups (bundle multiple products)
- **Sort Order**: Order of products in reports
- **Balance Settings**: Initial cash per year
- **Products**: Track/untrack products from CSVs
- **Upload**: CSV file upload

---

## Database Tables (Supabase)

| Table | Purpose |
|-------|---------|
| `transactions` | Sales data from CSV imports |
| `products` | Tracked products (appear in reports) |
| `all_products` | All products found in CSVs |
| `product_groups` | Group definitions |
| `product_group_items` | Products in each group |
| `partners` | Business partners (Kampf, Leo) |
| `balance_expenses` | Manual expenses |
| `balance_withdrawals` | Partner withdrawals |
| `app_settings` | Settings like sort_order, initial_cash |

---

## API Endpoints (`backend/api.php`)

All endpoints use `?action=` query parameter:

### Data Fetching
- `dashboard` - Dashboard stats
- `balance&year=YYYY` - Balance data for year
- `products` - Tracked products list
- `all_products` - All discovered products
- `report&start=&end=` - Product summary report

### Charts
- `sales_by_weekday&start=&end=` - Sales by day of week
- `sales_by_time_bucket&start=&end=` - Sales by 4-hour buckets
- `sales_by_msfs_version&start=&end=` - MSFS 2020 vs 2024

### CRUD Operations
- `create_expense` / `update_expense` / `delete_expense`
- `create_withdrawal` / `update_withdrawal` / `delete_withdrawal`
- `track_product` / `untrack_product`

---

## Current Issue

### Problem
When deploying to Hostinger, the page loads blank with console errors:

```
Refused to apply style from '.../assets/index-Wt1rWM8P.css' 
because its MIME type ('text/html') is not a supported stylesheet MIME type

Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html"
```

### Root Cause
The server is returning HTML (likely a 404 page) instead of the actual CSS/JS files. This happens because:

1. **Old asset files** still referenced in HTML but new ones uploaded
2. **Asset file names changed** (Vite uses content hashing: `index-CVk7zHCa.css`)
3. **Incomplete upload** - some files missing
4. **Cache issues** - browser or server caching old references

### Solution Steps
1. **Delete ALL files** in the `assets/` folder on the server
2. Upload the **entire `dist/` folder** fresh:
   - `dist/index.html` → server root
   - `dist/index.php` → server root  
   - `dist/app.html` → server root
   - `dist/.htaccess` → server root (IMPORTANT for SPA routing)
   - `dist/assets/*` → server `assets/` folder
   - `dist/backend/*` → server `backend/` folder
3. Clear browser cache or test in incognito

### Important Files for Routing
```
.htaccess (in root) - SPA routing rules:
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.php [L]
```

---

## Build Process

Run from project root:
```bash
python scripts/build_dist.py
```

This:
1. Runs `npm run build` (Vite build)
2. Copies frontend from `dist-frontend/` to `dist/`
3. Copies `backend/` to `dist/backend/`
4. Copies `.htaccess`, `index.php`, etc.
5. Creates `app.html` from Vite's `index.html`

---

## Withdrawal Logic

**Important business rule:**
- When ONE withdrawal is created, it applies to BOTH partners
- Example: $10k withdrawal → $10k for Kampf + $10k for Leo = $20k total
- Backend creates 2 entries in `balance_withdrawals`
- Frontend shows individual rows per partner

---

## Recent Changes

1. **Fixed withdrawal display bug**: Variable name collision in `api.php` was overwriting the `$withdrawals` array with a number
2. **Added hover interaction**: Withdrawal values now show Edit/Delete buttons on hover
3. **Removed Products page**: Moved to Admin tab
4. **Renamed Reports to Graphics**
5. **Month status indicators**: Italic for current, bold+green for closed

---

## Environment

- Local dev: `npm run dev` (Vite dev server on port 5173)
- Backend requires PHP with `file_get_contents` and cURL for Supabase
- Supabase credentials in `backend/config.php`


