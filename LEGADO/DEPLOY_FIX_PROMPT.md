# Prompt para Novo Agente - Correção de Deploy

## Problema Atual

Ao fazer upload dos arquivos para o servidor Hostinger via FTP, a página fica **toda branca** com os seguintes erros no console:

```
Refused to apply style from 'https://partner.ekinteractive.com/assets/index-Wt1rWM8P.css' 
because its MIME type ('text/html') is not a supported stylesheet MIME type

Failed to load module script: Expected a JavaScript-or-Wasm module script 
but the server responded with a MIME type of "text/html"
```

## Contexto do Projeto

Leia o arquivo `PROJECT_CONTEXT.md` para entender a estrutura completa do projeto.

**Resumo:**
- Frontend: React + Vite + TypeScript
- Backend: PHP
- Hosting: Hostinger (shared hosting, FTP)
- SPA routing via `.htaccess`

## O Que Está Acontecendo

O servidor está retornando **HTML** (provavelmente uma página 404) em vez dos arquivos CSS e JS. Isso indica que:

1. Os arquivos referenciados no HTML **não existem** no servidor
2. O Vite gera nomes de arquivos com **hash do conteúdo** (ex: `index-CVk7zHCa.css`)
3. Se o `index.html` foi atualizado mas os arquivos `.css` e `.js` não foram, dá erro

## Arquivos Críticos

A pasta `dist/` contém o build de produção pronto para upload:

```
dist/
├── .htaccess          ← IMPORTANTE: regras de rewrite para SPA
├── index.html         ← Entrada principal
├── index.php          ← Fallback PHP para SPA routing
├── app.html           ← Cópia do index.html
├── assets/
│   ├── index-*.css    ← CSS principal (nome com hash)
│   ├── index-*.js     ← JS principal (nome com hash)
│   └── *.js           ← Chunks do code-splitting
└── backend/
    ├── api.php
    ├── upload.php
    └── ...
```

## Tarefas

1. **Verificar estrutura do `dist/`** - Confirmar que todos os arquivos existem
2. **Verificar `index.html`** - Ver quais arquivos CSS/JS são referenciados
3. **Verificar `.htaccess`** - Garantir que as regras de rewrite estão corretas
4. **Se necessário, rebuild** - Rodar `python scripts/build_dist.py`

## Solução Provável

O usuário precisa:

1. **DELETAR** toda a pasta `assets/` no servidor FTP
2. **DELETAR** os arquivos `index.html`, `index.php`, `app.html` do servidor
3. Fazer upload **COMPLETO** da pasta `dist/`:
   - Subir `dist/.htaccess` → raiz do servidor
   - Subir `dist/index.html` → raiz do servidor
   - Subir `dist/index.php` → raiz do servidor
   - Subir `dist/app.html` → raiz do servidor (opcional)
   - Subir `dist/assets/*` → pasta `assets/` no servidor
   - Subir `dist/backend/*` → pasta `backend/` no servidor
4. **Limpar cache** do navegador (ou testar em aba anônima)

## Verificações Adicionais

### 1. Conferir referências no `index.html`

Abra `dist/index.html` e veja as tags `<link>` e `<script>`. Exemplo esperado:

```html
<link rel="stylesheet" href="/assets/index-CVk7zHCa.css">
<script type="module" src="/assets/index-D3vnUCPt.js"></script>
```

Os nomes dos arquivos DEVEM corresponder exatamente aos arquivos em `dist/assets/`.

### 2. Conferir `.htaccess`

O arquivo `dist/.htaccess` deve conter:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.php [L]
```

Isso garante que rotas como `/balance` não retornem 404.

### 3. Conferir se arquivos existem

Liste `dist/assets/` e confirme que os arquivos referenciados no `index.html` existem.

## Comandos Úteis

```bash
# Rebuild completo
python scripts/build_dist.py

# Ver conteúdo do index.html
cat dist/index.html

# Listar assets
ls -la dist/assets/
```

## Informações do Servidor

- **URL**: https://partner.ekinteractive.com
- **Hosting**: Hostinger
- **Deploy**: FTP manual

---

**Objetivo final**: A página deve carregar corretamente sem erros de MIME type no console.


