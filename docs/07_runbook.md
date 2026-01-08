# 07 — Runbook (local/dev + deploy)

Este runbook cobre o **v1/LEGADO** (como referência) e o **v2** (novo) quando existir.

## Pré-requisitos

- Node.js LTS (para frontend)
- PHP (para backend; ideal 8.x, compatível com 7.4+ dependendo do host)
- Acesso ao projeto Supabase (SQL Editor / MCP)

## Variáveis de ambiente

### v1 (LEGADO)

- Arquivo: `LEGADO/.env` (no servidor)
- Exemplo: `LEGADO/env.example`

Campos:
- `APP_ENV=production`
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...` (**server-side only**)

Gerar `.env` localmente:

```bash
python LEGADO/scripts/create_env.py --url https://YOUR_PROJECT_REF.supabase.co --service-role-key YOUR_KEY --out LEGADO/.env --force
```

### v2

- Arquivo: `v2/backend/.env`
- Exemplo: `v2/backend/env.example`

Campos:
- `APP_ENV=production`
- `SUPABASE_URL=https://xxx.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=eyJ...` (**server-side only**, nunca anon key)
- `AUTH_TOTP_SECRET=` (opcional; se vazio, setup mode gera e persiste em `var/secrets.php`)

Criar `.env` no servidor (via SSH ou FTP):
```
APP_ENV=production
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
AUTH_TOTP_SECRET=
```

## Rodar local (v1/LEGADO)

### Frontend (dev)

```bash
cd LEGADO
npm install
npm run dev
```

Observação: o frontend dev usa o backend em `/backend/*`. Em dev local, normalmente você precisa rodar o PHP server na mesma origem, ou usar proxy.

### Backend (PHP)

Opção simples (para dev): PHP built-in server (na raiz do projeto, para servir `index.php` e `backend/*`):

```bash
cd LEGADO
php -S localhost:8080
```

Depois abrir `http://localhost:8080`.

> Nota: em produção o roteamento SPA depende de `.htaccess`. No PHP built-in, rotas podem se comportar diferente.

## Banco / migrações (Supabase)

### Verificar schema atual

Use o MCP do Supabase (ou SQL Editor) para checar tabelas, views e funções.

### Aplicar migrations

No v1, há SQLs em `LEGADO/database_migrations/`, mas nem todas estão aplicadas.

No v2, todas as mudanças devem virar migrations rastreáveis (via `supabase migrations` ou via MCP `apply_migration`).

## Importar CSV

### v1

1. Fazer login em `/backend/login.php`
2. Ir em Admin → Upload
3. Enviar CSV/ZIP

### v2

1. Configurar `.env` em `v2/backend/` (veja seção Variáveis de ambiente)
2. Acessar `/login` — se for primeiro acesso, aparece QR code para configurar TOTP
3. Após login, ir em Admin → Upload
4. Enviar CSV/ZIP

Comportamento:
- Upload sempre atualiza `v2.all_products` (discovery)
- Só salva transações em `v2.transactions` para produtos com `is_tracked=true`
- Dedupe por `earning_id` (duplicatas são ignoradas)

## Build e deploy (v1/LEGADO — Hostinger/FTP)

1. Gerar build:

```bash
cd LEGADO
python scripts/build_dist.py
```

2. Deploy via FTP:
- enviar conteúdo de `LEGADO/dist/` para a raiz do host
- garantir upload de:
  - `dist/.htaccess`
  - `dist/index.php`
  - `dist/app.html`
  - `dist/assets/*`
  - `dist/backend/*`

3. Troubleshooting “tela branca”:
- apagar pasta `assets/` no servidor e reenviar tudo (hashes do Vite precisam bater)
- ver detalhes em `LEGADO/DEPLOY_FIX_PROMPT.md`

## Rodar local (v2)

### Backend PHP

```bash
cd v2/backend
cp env.example .env
# Editar .env com suas credenciais Supabase

# Rodar PHP built-in server
php -S localhost:8080 -t public
```

Acessar `http://localhost:8080/api/health` para verificar se está funcionando.

### Testar endpoints

```bash
# Health check (público)
curl http://localhost:8080/api/health

# Listar produtos (requer auth - redireciona para /login)
curl http://localhost:8080/api/products

# Upload CSV (requer auth + cookie de sessão)
curl -X POST http://localhost:8080/api/imports -F "file=@test.csv" -b "PHPSESSID=xxx"
```

## Build e deploy v2 (Hostinger)

1. Enviar via FTP:
   - `v2/backend/` inteiro para `public_html/v2/backend/`
   - Criar `v2/backend/.env` no servidor (não commitar!)

2. Configurar `.htaccess` na raiz (`public_html/.htaccess`):
   - Ver exemplo em `v2/backend/htaccess_root_example.txt`
   - Redireciona `/api/*` e `/login` para `v2/backend/public/index.php`

3. Primeiro acesso:
   - Acessar `https://partner.ekinteractive.com/login`
   - Escanear QR code com Google Authenticator
   - Inserir código 2FA para completar setup

## Segurança operacional (checklist rápido)

- Nunca commitar `.env`
- Nunca commitar `backend/secrets.php` ou `v2/backend/var/secrets.php`
- Supabase:
  - RLS habilitado
  - grants revogados para `anon`/`authenticated`
  - funções RPC sem EXECUTE público
- v2 Backend:
  - Usar apenas `service_role` key (nunca anon)
  - TOTP obrigatório para todos os endpoints exceto `/api/health`

