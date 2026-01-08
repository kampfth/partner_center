# Partner Center v2

Sistema modular para gestão de vendas Microsoft Partner Center.

## Estrutura

```
v2/
├── backend/          # PHP API (Hostinger)
│   ├── public/       # Entry points (index.php, api.php)
│   └── src/          # Classes/services modulares
└── web/              # React frontend (Vite + TypeScript)
```

## Convenções

### Backend (PHP 8.1+)
- **Nenhum arquivo > 200 linhas**
- Router simples (sem `?action=` monolítico)
- Controllers por domínio: `ProductsController`, `GroupsController`, `ImportsController`, `ReportsController`
- Services para lógica de negócio
- Supabase REST API via service_role key

### Frontend (React 18 + TypeScript + Vite)
- Mobile-first (sem overflow horizontal)
- Consumir API REST v2 (endpoints em `/api/*`)
- Estados: loading, error, empty, success
- shadcn/ui + Tailwind CSS

## Banco de Dados

Schema isolado: `v2.*` no Supabase (não mexe no `public.*` legado).

Tabelas principais:
- `v2.all_products` — catálogo descoberto (tracking flag)
- `v2.products` — produtos tracked (com label/group)
- `v2.product_groups` — agrupamentos
- `v2.transactions` — vendas (só tracked)
- `v2.imports` — audit de uploads

## Referências

- `docs/CONTRACTS.md` — contratos de API e tipos
- `docs/BRIEF_BACKEND.md` — brief do agente backend
- `docs/BRIEF_FRONTEND.md` — brief do agente frontend
- `LEGADO/` — código v1 para referência de regras de negócio
