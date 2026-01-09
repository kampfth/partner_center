# Partner Center

> Enterprise-grade sales management system for Microsoft Partner Center data.

## 🏗️ Architecture

```
PartnerCenter/
├── docs/                    # Documentation (source of truth)
│   ├── DATA_DICTIONARY.md   # Column naming standard
│   ├── 00_project_overview.md
│   └── ...
├── v2/                      # Production codebase
│   ├── backend/             # PHP 8.1+ REST API
│   ├── web/                 # React 19 + TypeScript + Vite
│   └── dist/                # Build output (deploy to Hostinger)
└── LEGADO/                  # Legacy v1 (reference only)
```

## 📋 Key Documents

| Document | Purpose |
|----------|---------|
| `docs/DATA_DICTIONARY.md` | **Single source of truth** for all column names |
| `docs/04_api_contract.md` | API endpoints and payloads |
| `CHANGELOG.md` | Version history and breaking changes |

## 🔧 Development

### Prerequisites
- Node.js 18+
- PHP 8.1+
- Supabase project (schema `v2`)

### Build
```bash
cd v2
python scripts/build_dist.py
```

### Deploy
1. Upload `v2/dist/*` to Hostinger `public_html/`
2. Create `backend/.env` with Supabase credentials
3. Access `/login` to configure TOTP

## 📊 Data Flow

```
Microsoft Partner Center CSV
         ↓
    CSV Import (CsvParser.php)
         ↓
    Supabase v2.transactions
         ↓
    REST API (PHP Controllers)
         ↓
    React Frontend
```

## 🏷️ Naming Convention

All column names follow Microsoft Partner Center CSV format:

| CSV Header | Database | API | TypeScript |
|------------|----------|-----|------------|
| `Transaction date` | `transaction_date` | `transaction_date` | `transactionDate` |
| `Transaction amount` | `transaction_amount` | `transaction_amount` | `transactionAmount` |
| `Earning ID` | `earning_id` | `earning_id` | `earningId` |

See `docs/DATA_DICTIONARY.md` for complete mapping.

## 🔐 Security

- TOTP-only authentication (no passwords)
- Supabase Row Level Security (RLS)
- Rate limiting on auth endpoints
- CORS restricted to production domain

## 📱 Mobile First

All UI components are designed mobile-first:
- Touch targets ≥ 44x44px
- No horizontal overflow
- Bottom navigation on mobile
- Responsive data tables

## License

Private - EK Interactive
