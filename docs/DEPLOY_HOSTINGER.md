# Deploy via Git na Hostinger

## Resumo

O repositório tem duas branches importantes:
- `feat/lovable-skin` — código fonte completo (dev)
- `deploy` — apenas os arquivos de produção (para Hostinger)

A branch `deploy` contém **somente** o conteúdo de `v2/dist/` na raiz, pronta para deploy direto.

---

## Passo a Passo na Hostinger

### 1. Acessar o Painel

1. Faça login em [hpanel.hostinger.com](https://hpanel.hostinger.com)
2. Selecione seu domínio/website
3. No menu lateral, vá em **Advanced** → **Git**

### 2. Conectar Repositório GitHub

1. Clique em **Create a new repository** ou **Manage**
2. Selecione **GitHub** como provider
3. Autorize a Hostinger a acessar seu GitHub (se ainda não fez)
4. Selecione o repositório: `kampfth/partner_center`
5. **Branch**: selecione `deploy` (IMPORTANTE!)
6. **Directory**: deixe como `/` (raiz do public_html)

### 3. Configurar Auto-Deploy (Opcional)

- Marque **Auto deployment** para deploy automático a cada push
- Ou deixe desmarcado para deploy manual via botão "Deploy"

### 4. Primeiro Deploy

1. Clique em **Deploy** para fazer o primeiro deploy
2. Aguarde a Hostinger baixar os arquivos da branch `deploy`
3. Verifique se os arquivos apareceram em `public_html/`

### 5. Configurar o .env

**IMPORTANTE**: O arquivo `.env` não está no Git (por segurança). Você precisa criar manualmente:

1. No painel Hostinger, vá em **Files** → **File Manager**
2. Navegue até `public_html/backend/`
3. Crie um arquivo chamado `.env` com o conteúdo:

```
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-role-key-aqui
```

4. Salve o arquivo

### 6. Testar

1. Acesse seu domínio no navegador
2. Vá para `/login`
3. Na primeira vez, aparecerá um QR code para configurar o TOTP
4. Escaneie com Google Authenticator
5. Digite o código de 6 dígitos

---

## Atualizações Futuras

### Workflow de Atualização

1. **Desenvolva** na branch `feat/lovable-skin`
2. **Faça build**: `python v2/scripts/build_dist.py`
3. **Commit** as mudanças (incluindo v2/dist/)
4. **Atualize a branch deploy**:
   ```bash
   git subtree split --prefix=v2/dist -b deploy --rejoin
   git push origin deploy --force
   ```
5. **Na Hostinger**: clique em "Deploy" (ou espere auto-deploy)

### Script Rápido

Adicione ao seu workflow:

```bash
# Após fazer mudanças e build
git add .
git commit -m "feat: sua mudança"
git push origin feat/lovable-skin

# Atualizar branch de deploy
git subtree split --prefix=v2/dist -b deploy --rejoin
git push origin deploy --force
```

---

## Troubleshooting

### "Repository not found"
- Verifique se autorizou a Hostinger no GitHub
- O repo deve ser público ou você deve ter dado acesso

### "Deploy failed"
- Verifique se selecionou a branch `deploy` (não `main` ou `feat/lovable-skin`)
- Verifique os logs de deploy na Hostinger

### "500 Error" após deploy
- Verifique se criou o `.env` em `backend/.env`
- Verifique se as credenciais Supabase estão corretas

### "403 Forbidden"
- Verifique permissões: pastas 755, arquivos 644
- Verifique se mod_rewrite está habilitado

### Login não funciona
- Verifique se o arquivo `backend/var/` existe e é gravável
- Limpe cookies e tente novamente

---

## Estrutura no Servidor

Após o deploy, seu `public_html/` terá:

```
public_html/
├── .htaccess           # Routing SPA + API
├── index.html          # Frontend React
├── README.md
├── assets/
│   ├── index-xxx.css
│   └── index-xxx.js
└── backend/
    ├── .htaccess
    ├── .env            # (criar manualmente)
    ├── .env.example
    ├── index.php
    ├── src/
    ├── tests/
    └── var/
```

---

## Links Úteis

- [Documentação Git da Hostinger](https://support.hostinger.com/en/articles/4455887-how-to-use-git-at-hostinger)
- [GitHub do Projeto](https://github.com/kampfth/partner_center)
- Branch de deploy: `deploy`
- Branch de desenvolvimento: `feat/lovable-skin`
