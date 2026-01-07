# PartnerCenter

Private sales dashboard (PHP backend + static frontend build) backed by Supabase.

## Security model (important)

- This app uses **Supabase service_role key on the server** (PHP) to read/write data.
- **Never** expose the service_role key to the browser.
- Server secrets live in **project-root `.env`** and are blocked from HTTP access via `.htaccess`.

## Server setup (Hostinger / FTP)

1. Upload project files (except `.env`).
2. Run `/backend/setup.php` once to generate:
   - `/.env`
   - `/backend/secrets.php`
3. After setup, `backend/.htaccess` blocks access to `setup.php`.

If you prefer generating `.env` locally, use:

```bash
python scripts/create_env.py --url https://YOUR_PROJECT.supabase.co --service-role-key YOUR_KEY --out .env --force
```

## Supabase lockdown

Run the SQL in `docs/supabase_lockdown.sql` in Supabase SQL Editor to ensure **anon/authenticated roles cannot access data** (RLS + privilege revoke).


