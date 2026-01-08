# PartnerCenter v1 — Project Overview

## O que é o sistema

O **PartnerCenter** é um painel privado (uso pessoal) para **importar relatórios CSV do Microsoft Flight Simulator Marketplace** e **visualizar vendas e finanças** (receita por período, gráficos, organização de produtos, despesas, retiradas e divisão por parceiros).

Arquitetura atual (v1/LEGADO):
- **Frontend**: SPA React (Vite + TypeScript + Tailwind + shadcn/ui + Recharts)
- **Backend**: PHP (sem framework) servindo **autenticação**, **API JSON** e **upload/parse** de CSV/ZIP
- **Banco**: Supabase (Postgres) acessado via **PostgREST** com **service_role** (somente no backend)

## Usuário alvo

- O **dono do sistema** (pessoa única), com baixa demanda e foco em produtividade.

## Principais capacidades (as-is)

- **Setup inicial**: configura Supabase (URL + service_role) e TOTP 2FA.
- **Autenticação**: login via **TOTP** (Google Authenticator / Authy) com sessão PHP e timeouts.
- **Upload**: envio de **CSV** ou **ZIP com CSVs**; parse e persistência no Supabase.
- **Deduplicação**: evita duplicatas de transações por **`earningId`** (PK).
- **Dashboard**:
  - Vendas diárias (via view `daily_sales`)
  - Resumo por produto/grupo (via RPC `get_product_summary`)
- **Graphics**: gráficos adicionais (dia da semana, “hot time”, MSFS 2020 vs 2024).
- **Balance**: visão tipo planilha com receita mensal, despesas, retiradas e cálculo por parceiro.
- **Admin**: upload, grupos, produtos, sort order e ações perigosas (reset/trim) via API.
- **Audit log**: registra eventos relevantes (login, upload, resets).

## Glossário (domínio)

- **CSV Microsoft (Marketplace report)**: arquivo exportado da Microsoft com transações; contém muitas colunas (na amostra: **120**), mas o sistema usa um subconjunto.
- **Transação**: linha de venda; identificada por **`earningId`** (v1 assume unicidade).
- **Produto**: item vendido; identificado por **`productId`**; tem `productName` e `lever`.
- **Lever**: no CSV aparece como `lever` (ex.: “Microsoft Flight Simulator”, “Microsoft Flight Simulator 2024”). No v1 também é usado como sinal para MSFS version.
- **Grupo de produto**: agrupamento manual para somar produtos no resumo (`product_groups`).
- **Sort order**: ordem de exibição customizada do resumo (armazenada em `app_settings.key=sort_order`).
- **Receita (auto)**: receita calculada a partir de transações importadas (via RPC/consulta).
- **Ajuste de receita (manual)**: correção manual mensal (`balance_revenue_adjustments`).
- **Despesa**: custo mensal manual (`balance_expenses`), categorias `fixed`/`variable`.
- **Retirada (withdrawal)**: retirada de valor por parceiro/mês (`balance_withdrawals`). Regra v1: uma retirada “compartilhada” cria **duas linhas** (uma para cada parceiro) com o mesmo valor.
- **Saldo inicial**: dinheiro carregado do ano anterior (`balance_initial_cash`).

