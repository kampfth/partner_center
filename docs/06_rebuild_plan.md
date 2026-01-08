# 06 — Rebuild Plan (v2)

## Objetivo

Recriar o sistema com **código limpo e modular**, mantendo a **lógica de negócio** do v1 e corrigindo o que está quebrado (principalmente o workflow de `all_products`/tracking e hardening de segurança).

## Decisões de stack (com justificativa curta)

### Frontend

- **React + TypeScript + Vite** (mantém o que já funciona no v1)
  - Motivo: UI já é boa e mobile-first; Vite gera build estático simples de publicar.
- **Tailwind + shadcn/ui + Radix**
  - Motivo: velocidade de UI sem overcode; acessibilidade e componentes consistentes.
- **TanStack Query**
  - Motivo: cache e estados de loading/error bem resolvidos para app “low demand”.

### Backend

- **PHP (backend-only) como API + upload/parse**
  - Motivo: compatível com o deploy atual (shared hosting/FTP), sem infra extra.
  - v2 será reescrito de forma modular (rotas/handlers/serviços), sem framework pesado.

### Banco

- **Supabase Postgres**
  - Motivo: já existe e tem dados reais; custo operacional baixo.
  - Direção: **deny-by-default** (RLS + revoke grants) e uso exclusivo do `service_role` no backend.

## Regras de negócio a preservar (essenciais)

### 1) CSV → descoberta vs tracking

**Definição (v2, confirmado):**
- Em todo upload, o sistema deve **descobrir e registrar** todos os produtos presentes no CSV em `all_products`.
- O sistema só deve **persistir transações** (`transactions`) dos produtos **marcados como tracked**.
- Produtos “off” têm seus IDs/nome preservados em `all_products`, mas suas transações são descartadas.
- Se um produto for ativado no futuro, **apenas os próximos uploads** irão persistir suas transações (sem backfill automático).

### 2) Colunas salvas

Manter o subconjunto já adotado no v1 (as 8 colunas):
- `earningId`, `transactionDate`, `transactionAmount`, `lever`, `productName`, `productId`, `transactionCountryCode`, `externalReferenceIdLabel`

### 3) Dedupe

- Dedupe principal por `transactions.earning_id` (PK) e inserts com ignore-duplicates.

### 4) Withdrawals compartilhadas

- Uma retirada criada para um mês aplica-se a ambos os parceiros (duas linhas em `balance_withdrawals`), como no v1.

## Estrutura de pastas proposta (v2)

O repositório mantém o v1 como legado e cria um v2 limpo:

```
/
  LEGADO/                # v1 congelado
  v2/
    backend/             # PHP v2
      public/            # entrypoints (index.php, api.php, upload.php)
      src/
        Http/
        Auth/
        Csv/
        Domain/
        Db/
        Observability/
      tests/
    web/                 # React v2
      src/
      public/
  docs/
  CHANGELOG.md
  .cursorrules
```

## Migração de DB (estratégia)

### Opção escolhida: **manter DB e evoluir (migrations aditivas)**

Motivos:
- Já existe histórico real (49k transações).
- Minimiza risco e trabalho.

### Mudanças de schema necessárias (mínimo)

1) Criar `all_products` (corrigir o “quebrado” do v1):
- `product_id` text PK/UNIQUE
- `product_name` text
- `lever` text nullable
- `first_seen_at` timestamptz default now()
- `last_seen_at` timestamptz default now()
- `is_tracked` boolean default false

2) (Opcional mas recomendado) Remover dependência de whitelist:
- O upload passa a filtrar por `all_products.is_tracked=true` (ou `products` se preferir compat).

3) Hardening:
- aplicar RLS + revoke grants corretamente para `anon/authenticated`
- remover EXECUTE em RPCs públicas (anon/authenticated)
- garantir que policies permissivas não existam

## Milestones (plano incremental)

### M1 — Ingestão com tracking + dedupe (core)

- Criar migração de `all_products`
- Implementar upload v2:
  - atualiza `all_products` sempre
  - salva em `transactions` apenas se tracked
  - logs e métricas (processed, discovered, tracked, inserted, duplicates_ignored, filtered_out)
- Testes unitários para:
  - parsing de header obrigatório
  - dedupe por `earningId`
  - filtro tracked

### M2 — API estável + contratos

- Definir um contrato v2 (REST simples) e manter compatibilidade mínima com o v1 se necessário.
- Consolidar endpoints de reports/balance com validações.

### M3 — Frontend mobile-first

- Implementar telas equivalentes (Dashboard, Graphics, Balance, Admin)
- Products tab: discovery + toggle tracked (principal)
- Estados de loading/empty/error consistentes

### M4 — Segurança/observabilidade + runbook final

- Hardening Supabase + revisão secrets
- Runbook completo e reprodutível

## Definition of Done (DoD)

- Upload CSV real funciona:
  - sempre atualiza `all_products`
  - só persiste transações dos tracked
  - dedupe correto por `earningId`
  - logs úteis e métricas retornadas
- Dashboard/Graphics/Balance funcionais e mobile-first sem overflow lateral.
- API consistente com `docs/04_api_contract.md` (ou uma seção “v2 contract”).
- Docs atualizados e setup local simples (runbook).

