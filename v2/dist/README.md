# Partner Center v2 - Deploy Package

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
