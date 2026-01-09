# .htaccess Configuration for Hostinger Deploy

This document contains the `.htaccess` configuration needed for deploying the PartnerCenter v2 application on Hostinger.

## Root .htaccess (public_html/.htaccess)

Copy the following content to your `public_html/.htaccess` file:

```apache
# PartnerCenter v2 - .htaccess Configuration
# Last updated: 2026-01-09

<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # --- v2 API routing ---
    # Route /api/* to v2 backend
    RewriteCond %{REQUEST_URI} ^/api(/.*)?$ [OR]
    RewriteCond %{REQUEST_URI} ^/login$ [OR]
    RewriteCond %{REQUEST_URI} ^/logout$
    RewriteRule ^(.*)$ v2/backend/public/index.php [QSA,L]

    # --- Frontend SPA fallback ---
    # Skip existing files and directories (assets, images, etc.)
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    # Route all other requests to frontend index.html
    RewriteRule ^(.*)$ index.html [QSA,L]
</IfModule>

# --- Security Headers ---
<IfModule mod_headers.c>
    # Prevent MIME type sniffing
    Header set X-Content-Type-Options "nosniff"
    # XSS Protection
    Header set X-XSS-Protection "1; mode=block"
    # Clickjacking protection
    Header set X-Frame-Options "SAMEORIGIN"
    # Referrer policy
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# --- Security: Deny access to sensitive files ---
<FilesMatch "\.(env|php|json|log|sql|md)$">
    Require all denied
</FilesMatch>

# Allow index.php explicitly (for backend routing)
<Files "index.php">
    Require all granted
</Files>

# Block access to backend source and var directories
<DirectoryMatch "v2/backend/(src|var|tests)">
    Require all denied
</DirectoryMatch>

# --- Compression ---
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# --- Caching for static assets ---
<IfModule mod_expires.c>
    ExpiresActive On
    
    # Images
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/x-icon "access plus 1 year"
    
    # CSS and JavaScript (hashed filenames from Vite)
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    
    # Fonts
    ExpiresByType font/woff2 "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType application/font-woff2 "access plus 1 year"
    
    # HTML - no cache (SPA entry point)
    ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# --- CORS for API ---
<IfModule mod_headers.c>
    <FilesMatch "\.(php)$">
        Header set Access-Control-Allow-Origin "*"
        Header set Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        Header set Access-Control-Allow-Headers "Content-Type, Authorization, X-Requested-With"
    </FilesMatch>
</IfModule>
```

## Backend .htaccess (v2/backend/public/.htaccess)

If needed, create a `.htaccess` in `v2/backend/public/`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /v2/backend/public/

    # Route all requests to index.php
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.php [QSA,L]
</IfModule>

# PHP settings (if allowed by host)
<IfModule mod_php.c>
    php_value upload_max_filesize 10M
    php_value post_max_size 10M
    php_value max_execution_time 60
</IfModule>
```

## Deployment Checklist

1. **Upload dist files**: Copy contents of `v2/dist/` to `public_html/`
2. **Configure .htaccess**: Apply the root .htaccess configuration above
3. **Set environment**: Ensure `v2/backend/.env` is configured with:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `APP_SECRET` (for sessions)
4. **Test routes**:
   - `https://yourdomain.com/` - Should load frontend
   - `https://yourdomain.com/api/health` - Should return JSON
   - `https://yourdomain.com/login` - Should show login page
5. **Verify permissions**: Backend `var/` directory should be writable (755 or 775)

## Troubleshooting

### 500 Internal Server Error
- Check `.htaccess` syntax
- Verify PHP version (8.1+ required)
- Check error logs in Hostinger panel

### API returns 404
- Ensure RewriteEngine is enabled
- Check that `v2/backend/public/index.php` exists
- Verify file permissions

### Frontend routes return 404
- Ensure the SPA fallback rule is present
- Check that `index.html` exists in root

### CORS errors
- The CORS headers in .htaccess should handle this
- For stricter security, replace `*` with your specific domain
