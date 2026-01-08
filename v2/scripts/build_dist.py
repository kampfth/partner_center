#!/usr/bin/env python3
"""
Build script for Partner Center v2
Generates v2/dist/ ready for FTP upload to Hostinger
"""

import os
import shutil
import subprocess
import sys

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
V2_DIR = os.path.dirname(SCRIPT_DIR)
WEB_DIR = os.path.join(V2_DIR, 'web')
BACKEND_DIR = os.path.join(V2_DIR, 'backend')
DIST_DIR = os.path.join(V2_DIR, 'dist')

def run_cmd(cmd, cwd=None):
    """Run a command and check for errors"""
    print(f"[CMD] {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"[ERROR] Command failed with code {result.returncode}")
        sys.exit(1)

def clean_dist():
    """Remove existing dist folder"""
    if os.path.exists(DIST_DIR):
        print(f"[CLEAN] Removing {DIST_DIR}")
        shutil.rmtree(DIST_DIR)
    os.makedirs(DIST_DIR)

def build_frontend():
    """Build React frontend"""
    print("\n[BUILD] Frontend (npm install + build)")
    run_cmd("npm install", cwd=WEB_DIR)
    run_cmd("npm run build", cwd=WEB_DIR)
    
    # Copy built files to dist
    frontend_dist = os.path.join(WEB_DIR, 'dist')
    if not os.path.exists(frontend_dist):
        print("[ERROR] Frontend build output not found")
        sys.exit(1)
    
    # Copy all frontend files to dist root
    for item in os.listdir(frontend_dist):
        src = os.path.join(frontend_dist, item)
        dst = os.path.join(DIST_DIR, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    
    print(f"[OK] Frontend copied to {DIST_DIR}")

def copy_backend():
    """Copy backend PHP files"""
    print("\n[BUILD] Backend")
    backend_dist = os.path.join(DIST_DIR, 'backend')
    os.makedirs(backend_dist, exist_ok=True)
    
    # Copy public/ contents to backend/
    public_dir = os.path.join(BACKEND_DIR, 'public')
    for item in os.listdir(public_dir):
        src = os.path.join(public_dir, item)
        dst = os.path.join(backend_dist, item)
        if os.path.isdir(src):
            shutil.copytree(src, dst)
        else:
            shutil.copy2(src, dst)
    
    # Copy src/ to backend/src/
    src_dir = os.path.join(BACKEND_DIR, 'src')
    dst_src = os.path.join(backend_dist, 'src')
    shutil.copytree(src_dir, dst_src)
    
    # Copy var/ for secrets (empty dir with .gitkeep)
    var_dir = os.path.join(BACKEND_DIR, 'var')
    if os.path.exists(var_dir):
        dst_var = os.path.join(backend_dist, 'var')
        shutil.copytree(var_dir, dst_var)
    
    # Copy tests/ if exists (optional, for debugging)
    tests_dir = os.path.join(BACKEND_DIR, 'tests')
    if os.path.exists(tests_dir):
        dst_tests = os.path.join(backend_dist, 'tests')
        shutil.copytree(tests_dir, dst_tests)
    
    print(f"[OK] Backend copied to {backend_dist}")

def create_root_htaccess():
    """Create root .htaccess for SPA routing + API proxy"""
    htaccess_content = """# Partner Center v2 - Hostinger
# SPA routing + API proxy

RewriteEngine On
RewriteBase /

# Force HTTPS (uncomment in production)
# RewriteCond %{HTTPS} off
# RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# API requests -> backend/index.php
RewriteCond %{REQUEST_URI} ^/api [NC]
RewriteRule ^api/(.*)$ backend/index.php [L,QSA]

# Login/logout -> backend/index.php
RewriteCond %{REQUEST_URI} ^/login [NC,OR]
RewriteCond %{REQUEST_URI} ^/logout [NC]
RewriteRule ^(.*)$ backend/index.php [L,QSA]

# Static files (assets, images, etc.) → serve directly
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Everything else -> index.html (SPA)
RewriteRule ^ index.html [L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Disable directory listing
Options -Indexes

# Protect sensitive files
<FilesMatch "\\.(env|gitignore|md|json|lock)$">
    Order allow,deny
    Deny from all
</FilesMatch>
"""
    
    htaccess_path = os.path.join(DIST_DIR, '.htaccess')
    with open(htaccess_path, 'w', encoding='utf-8') as f:
        f.write(htaccess_content)
    
    print(f"[OK] Created {htaccess_path}")

def create_env_example():
    """Create .env.example for backend"""
    env_content = """# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...your-service-role-key

# App Configuration
APP_ENV=production
APP_DEBUG=false

# Session
SESSION_LIFETIME=3600
"""
    
    env_path = os.path.join(DIST_DIR, 'backend', '.env.example')
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(env_content)
    
    print(f"[OK] Created {env_path}")

def create_readme():
    """Create deployment README"""
    readme_content = """# Partner Center v2 - Deploy Package

## Upload para Hostinger

1. **Upload via FTP**: Envie todo o conteúdo desta pasta para `public_html/`
   (ou o diretório raiz do seu domínio)

2. **Criar .env**: No servidor, crie `backend/.env` com suas credenciais:
   ```
   SUPABASE_URL=https://seu-projeto.supabase.co
   SUPABASE_SERVICE_KEY=sua-service-role-key
   ```

3. **Primeiro acesso**: Acesse `/login` no navegador
   - Na primeira vez, será exibido um QR code para configurar o TOTP
   - Escaneie com Google Authenticator ou similar
   - Digite o código de 6 dígitos para fazer login

4. **Verificar**: Acesse a raiz do site para ver o dashboard

## Estrutura

```
/
├── index.html          # Frontend SPA
├── assets/             # JS/CSS
├── backend/
│   ├── index.php       # API entry point
│   ├── .htaccess       # Rewrite rules
│   ├── .env            # (criar manualmente)
│   └── src/            # PHP classes
└── .htaccess           # Root rewrite rules
```

## Troubleshooting

- **403 Forbidden**: Verifique permissões (755 para pastas, 644 para arquivos)
- **500 Error**: Verifique se .env existe e tem as credenciais corretas
- **API não funciona**: Verifique se mod_rewrite está habilitado
- **Login loop**: Limpe cookies e tente novamente

## Suporte

Documentação completa em `docs/` do repositório.
"""
    
    readme_path = os.path.join(DIST_DIR, 'README.md')
    with open(readme_path, 'w', encoding='utf-8') as f:
        f.write(readme_content)
    
    print(f"[OK] Created {readme_path}")

def print_summary():
    """Print build summary"""
    print("\n" + "=" * 60)
    print("[OK] Build complete!")
    print("=" * 60)
    print(f"\nDeploy folder: {DIST_DIR}")
    print("\nContents:")
    
    for root, dirs, files in os.walk(DIST_DIR):
        # Skip node_modules and .git
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
        
        level = root.replace(DIST_DIR, '').count(os.sep)
        indent = '  ' * level
        folder_name = os.path.basename(root) or 'dist'
        print(f"{indent}{folder_name}/")
        
        sub_indent = '  ' * (level + 1)
        for file in files[:10]:  # Limit files shown per folder
            print(f"{sub_indent}{file}")
        if len(files) > 10:
            print(f"{sub_indent}... and {len(files) - 10} more files")
    
    print("\n" + "=" * 60)
    print("Próximos passos:")
    print("1. Upload v2/dist/* para public_html/ via FTP")
    print("2. Criar backend/.env com credenciais Supabase")
    print("3. Acessar /login para configurar TOTP")
    print("=" * 60)

def main():
    print("=" * 60)
    print("Partner Center v2 - Build Script")
    print("=" * 60)
    
    clean_dist()
    build_frontend()
    copy_backend()
    create_root_htaccess()
    create_env_example()
    create_readme()
    print_summary()

if __name__ == '__main__':
    main()
