# Data Dictionary - PartnerCenter

> **Standard**: All naming follows Microsoft Partner Center CSV export format.
> **Convention**: `snake_case` for database and API, `camelCase` for TypeScript interfaces.

---

## 1. Canonical Column Names (Source of Truth)

These are the **official** column names from Microsoft Partner Center CSV exports:

| CSV Header (Original)        | Standard Name (DB/API)      | TypeScript Property    | Data Type       |
|-----------------------------|-----------------------------|------------------------|-----------------|
| `Earning ID`                | `earning_id`                | `earningId`            | `string` (PK)   |
| `Transaction date`          | `transaction_date`          | `transactionDate`      | `timestamp`     |
| `Transaction amount`        | `transaction_amount`        | `transactionAmount`    | `decimal`       |
| `Lever`                     | `lever`                     | `lever`                | `string`        |
| `Product name`              | `product_name`              | `productName`          | `string`        |
| `Product ID`                | `product_id`                | `productId`            | `string`        |
| `Transaction country code`  | `transaction_country_code`  | `transactionCountryCode` | `string`      |
| `External reference ID label` | `external_reference_label` | `externalReferenceLabel` | `string`     |

---

## 2. Database Schema (Single Schema: `public`)

### 2.1 `transactions` (Core Sales Data)

| Column                      | Type                    | Nullable | Default         | Notes                           |
|-----------------------------|-------------------------|----------|-----------------|--------------------------------|
| `earning_id`                | `text`                  | NO       | -               | **PK** - Unique per transaction |
| `product_id`                | `text`                  | NO       | -               | FK → `products.product_id`     |
| `transaction_date`          | `timestamptz`           | NO       | -               | Date/time of sale              |
| `transaction_amount`        | `numeric(12,2)`         | NO       | `0`             | USD amount                     |
| `transaction_country_code`  | `text`                  | YES      | -               | ISO country code               |
| `lever`                     | `text`                  | YES      | -               | Microsoft marketplace lever    |
| `msfs_version`              | `text`                  | YES      | -               | Derived: `MSFS2020`/`MSFS2024` |
| `created_at`                | `timestamptz`           | NO       | `now()`         | Record creation time           |

### 2.2 `products` (Tracked Products)

| Column         | Type           | Nullable | Default         | Notes                          |
|----------------|----------------|----------|-----------------|-------------------------------|
| `id`           | `uuid`         | NO       | `uuid_generate_v4()` | **PK**                   |
| `product_id`   | `text`         | NO       | -               | **UNIQUE** - MS Product ID    |
| `product_name` | `text`         | NO       | -               | Display name                  |
| `lever`        | `text`         | NO       | `'Unknown'`     | Marketplace lever             |
| `label`        | `text`         | YES      | -               | Custom label                  |
| `group_id`     | `uuid`         | YES      | -               | FK → `product_groups.id`      |
| `sort_order`   | `integer`      | NO       | `0`             | Display order                 |
| `created_at`   | `timestamptz`  | NO       | `now()`         | Record creation time          |

### 2.3 `all_products` (Discovery Table)

| Column          | Type           | Nullable | Default         | Notes                         |
|-----------------|----------------|----------|-----------------|------------------------------|
| `id`            | `uuid`         | NO       | `uuid_generate_v4()` | **PK**                  |
| `product_id`    | `text`         | NO       | -               | **UNIQUE** - MS Product ID   |
| `product_name`  | `text`         | NO       | -               | Display name                 |
| `lever`         | `text`         | NO       | `'Unknown'`     | Marketplace lever            |
| `first_seen_at` | `timestamptz`  | NO       | `now()`         | First CSV appearance         |
| `last_seen_at`  | `timestamptz`  | NO       | `now()`         | Last CSV appearance          |
| `is_tracked`    | `boolean`      | NO       | `false`         | If true, transactions saved  |
| `created_at`    | `timestamptz`  | NO       | `now()`         | Record creation time         |

### 2.4 `product_groups`

| Column       | Type           | Nullable | Default              | Notes           |
|--------------|----------------|----------|----------------------|-----------------|
| `id`         | `uuid`         | NO       | `uuid_generate_v4()` | **PK**          |
| `name`       | `text`         | NO       | -                    | **UNIQUE**      |
| `created_at` | `timestamptz`  | NO       | `now()`              | Creation time   |

### 2.5 `partners`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `id`         | `text`         | NO       | `gen_random_uuid()` | **PK**              |
| `name`       | `text`         | NO       | -               | Partner name             |
| `share`      | `numeric(3,2)` | NO       | `0.50`          | Revenue share (0-1)      |
| `created_at` | `timestamptz`  | YES      | `now()`         | Creation time            |

### 2.6 `balance_expenses`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `id`         | `serial`       | NO       | auto            | **PK**                   |
| `year_month` | `text`         | NO       | -               | Format: `YYYY-MM`        |
| `category`   | `text`         | NO       | -               | `fixed` or `variable`    |
| `name`       | `text`         | NO       | -               | Expense description      |
| `amount`     | `numeric(12,2)`| NO       | -               | USD amount               |
| `created_at` | `timestamptz`  | YES      | `now()`         | Creation time            |
| `updated_at` | `timestamptz`  | YES      | `now()`         | Last update              |

### 2.7 `balance_withdrawals`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `id`         | `serial`       | NO       | auto            | **PK**                   |
| `year_month` | `text`         | NO       | -               | Format: `YYYY-MM`        |
| `partner_id` | `text`         | YES      | -               | FK → `partners.id`       |
| `amount`     | `numeric(12,2)`| NO       | -               | USD amount               |
| `note`       | `text`         | YES      | -               | Optional note            |
| `created_at` | `timestamptz`  | YES      | `now()`         | Creation time            |
| `updated_at` | `timestamptz`  | YES      | `now()`         | Last update              |

### 2.8 `balance_revenue_adjustments`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `id`         | `serial`       | NO       | auto            | **PK**                   |
| `year_month` | `text`         | NO       | -               | Format: `YYYY-MM`        |
| `name`       | `text`         | NO       | -               | Adjustment description   |
| `amount`     | `numeric(12,2)`| NO       | -               | USD (can be negative)    |
| `created_at` | `timestamptz`  | YES      | `now()`         | Creation time            |
| `updated_at` | `timestamptz`  | YES      | `now()`         | Last update              |

### 2.9 `balance_initial_cash`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `year`       | `integer`      | NO       | -               | **PK**                   |
| `amount`     | `numeric(12,2)`| NO       | `0`             | Starting cash            |
| `note`       | `text`         | YES      | -               | Optional note            |
| `created_at` | `timestamptz`  | YES      | `now()`         | Creation time            |
| `updated_at` | `timestamptz`  | YES      | `now()`         | Last update              |

### 2.10 `imports`

| Column                  | Type           | Nullable | Default         | Notes                    |
|-------------------------|----------------|----------|-----------------|--------------------------|
| `id`                    | `uuid`         | NO       | `uuid_generate_v4()` | **PK**              |
| `filename`              | `text`         | NO       | -               | Original filename        |
| `rows_read`             | `integer`      | NO       | `0`             | Total CSV rows           |
| `products_discovered`   | `integer`      | NO       | `0`             | New products found       |
| `transactions_inserted` | `integer`      | NO       | `0`             | New transactions         |
| `transactions_skipped`  | `integer`      | NO       | `0`             | Duplicates skipped       |
| `transactions_untracked`| `integer`      | NO       | `0`             | Untracked products       |
| `errors`                | `jsonb`        | YES      | `[]`            | Error messages           |
| `started_at`            | `timestamptz`  | NO       | `now()`         | Import start             |
| `finished_at`           | `timestamptz`  | YES      | -               | Import end               |
| `status`                | `text`         | NO       | `'processing'`  | `processing`/`completed`/`failed` |

### 2.11 `app_settings`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `key`        | `text`         | NO       | -               | **PK**                   |
| `value`      | `jsonb`        | NO       | -               | Setting value            |
| `updated_at` | `timestamptz`  | YES      | `now()`         | Last update              |

### 2.12 `audit_logs`

| Column       | Type           | Nullable | Default         | Notes                    |
|--------------|----------------|----------|-----------------|--------------------------|
| `id`         | `serial`       | NO       | auto            | **PK**                   |
| `event_type` | `text`         | NO       | -               | Event category           |
| `description`| `text`         | YES      | -               | Event description        |
| `ip_address` | `text`         | YES      | -               | Client IP                |
| `user_agent` | `text`         | YES      | -               | Browser user agent       |
| `details`    | `jsonb`        | YES      | -               | Additional data          |
| `created_at` | `timestamptz`  | YES      | `now()`         | Event time               |

---

## 3. API Endpoints

### 3.1 Reports
| Method | Endpoint                  | Request                          | Response                    |
|--------|---------------------------|----------------------------------|-----------------------------|
| GET    | `/api/reports`            | `?start=YYYY-MM-DD&end=YYYY-MM-DD` | `{ data: ReportResponse }` |
| GET    | `/api/reports/date-range` | -                                | `{ data: DateRange }`       |

### 3.2 Products
| Method | Endpoint                        | Request                    | Response                    |
|--------|--------------------------------|----------------------------|-----------------------------|
| GET    | `/api/products`                | -                          | `{ data: AllProduct[] }`    |
| PATCH  | `/api/products/:product_id`    | `{ is_tracked: boolean }`  | `{ data: AllProduct }`      |
| GET    | `/api/tracked-products`        | -                          | `{ data: Product[] }`       |
| PATCH  | `/api/tracked-products/:id`    | `ProductUpdate`            | `{ data: Product }`         |

### 3.3 Groups
| Method | Endpoint           | Request                              | Response                |
|--------|--------------------|--------------------------------------|-------------------------|
| GET    | `/api/groups`      | -                                    | `{ data: Group[] }`     |
| POST   | `/api/groups`      | `{ name, product_ids: string[] }`    | `{ data: Group }`       |

### 3.4 Balance
| Method | Endpoint              | Request           | Response                      |
|--------|-----------------------|-------------------|-------------------------------|
| GET    | `/api/balance`        | `?year=YYYY`      | `{ data: BalanceResponse }`   |
| GET    | `/api/balance/years`  | -                 | `{ data: { years: number[] }}` |

### 3.5 Analytics
| Method | Endpoint                    | Request                          | Response                        |
|--------|----------------------------|----------------------------------|---------------------------------|
| GET    | `/api/analytics/weekday`   | `?start=YYYY-MM-DD&end=...`      | `{ data: SalesByWeekday[] }`    |
| GET    | `/api/analytics/time-bucket`| `?start=YYYY-MM-DD&end=...`     | `{ data: SalesByTimeBucket[] }` |
| GET    | `/api/analytics/msfs-version`| `?start=YYYY-MM-DD&end=...`    | `{ data: SalesByMsfsVersion[] }`|

---

## 4. CSV Import Mapping

```php
// CsvParser.php - Header normalization
const HEADER_MAP = [
    'earningid'               => 'earning_id',
    'transactiondate'         => 'transaction_date',
    'transactionamount'       => 'transaction_amount',
    'lever'                   => 'lever',
    'productname'             => 'product_name',
    'productid'               => 'product_id',
    'transactioncountrycode'  => 'transaction_country_code',
    'externalreferenceidlabel'=> 'external_reference_label',
];
```

---

## 5. MSFS Version Detection

The `msfs_version` column is derived from `external_reference_label`:

| External Reference Label Contains | msfs_version |
|-----------------------------------|--------------|
| `MSFS2024`                        | `MSFS2024`   |
| `MSFS2020`                        | `MSFS2020`   |
| Neither                           | `null`       |

For analytics, the `lever` column is used as fallback:

| Lever Value                       | Displayed As |
|-----------------------------------|--------------|
| `Microsoft Flight Simulator 2024` | `2024`       |
| `Microsoft Flight Simulator`      | `2020`       |
| Other                             | `Unknown`    |

---

## 6. Naming Conventions Summary

| Layer      | Convention    | Example                    |
|------------|---------------|----------------------------|
| Database   | `snake_case`  | `transaction_date`         |
| API JSON   | `snake_case`  | `"transaction_date": ...`  |
| TypeScript | `camelCase`   | `transactionDate`          |
| PHP        | `snake_case`  | `$data['transaction_date']`|

---

## 7. Migration Notes

### From v2 Schema to Unified Public Schema

The following renames are required:

| v2 Column Name   | New Standard Name         |
|------------------|---------------------------|
| `purchase_date`  | `transaction_date`        |
| `amount_usd`     | `transaction_amount`      |
| `customer_country` | `transaction_country_code` |

### Deprecation

- Schema `v2` will be deprecated
- All tables will live in `public` schema
- Backend `SupabaseClient` will use `public` schema

---

## 8. Views and Functions

### 8.1 `daily_sales` (View)

```sql
CREATE VIEW daily_sales AS
SELECT 
    DATE(transaction_date) AS date,
    COUNT(*) AS total_units,
    SUM(transaction_amount) AS total_amount
FROM transactions
GROUP BY DATE(transaction_date)
ORDER BY date;
```

### 8.2 `get_product_summary` (Function)

```sql
CREATE FUNCTION get_product_summary(start_date date, end_date date)
RETURNS TABLE (
    product_id text,
    group_id uuid,
    display_name text,
    units_sold bigint,
    total_amount numeric,
    type text
)
```

---

*Last Updated: 2026-01-09*
