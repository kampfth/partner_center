# PartnerCenter - Documentação Completa do Projeto

## Visão Geral

O **PartnerCenter** é um dashboard privado de vendas desenvolvido para gerenciar e visualizar dados de transações de parceiros. O sistema é composto por um backend PHP que atua como API e proxy de segurança, e um frontend React (build estático) que consome essas APIs. Todo o armazenamento de dados é feito no Supabase (PostgreSQL).

### Características Principais

- **Autenticação 2FA**: Login exclusivo via Google Authenticator (TOTP)
- **Upload de dados**: Processamento de arquivos CSV/ZIP com transações
- **Visualização de vendas**: Dashboard com relatórios e gráficos de vendas diárias
- **Gerenciamento de produtos**: Organização de produtos em grupos
- **Auditoria**: Logs de todas as ações do sistema
- **Segurança máxima**: Service role key nunca exposta ao frontend

---

## Arquitetura

### Stack Tecnológico

- **Backend**: PHP 7.3+ (compatível com shared hosting como Hostinger)
- **Frontend**: React (build estático via Vite)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Google Authenticator (TOTP 2FA)
- **Estilo**: Tailwind CSS

### Modelo de Segurança

1. **Service Role Key no servidor**: A chave `SUPABASE_SERVICE_ROLE_KEY` fica apenas no servidor PHP (arquivo `.env` bloqueado por `.htaccess`)
2. **RLS ativado**: Row Level Security no Supabase bloqueia acesso direto de anon/authenticated
3. **Sessões PHP**: Autenticação baseada em sessões server-side
4. **Rate Limiting**: Proteção contra abuso (file-based, compatível com shared hosting)
5. **Headers de segurança**: CSP, X-Frame-Options, HSTS, etc.

---

## Estrutura do Banco de Dados (Supabase)

### Tabelas Principais

#### `transactions`
Armazena todas as transações de vendas.
- `earning_id` (UUID, PK): ID único da transação
- `transaction_date` (timestamp): Data da transação
- `transaction_amount` (decimal): Valor da transação
- `lever` (text): Nível/alavancagem
- `product_name` (text): Nome do produto
- `product_id` (UUID, FK): Referência ao produto
- `transaction_country_code` (text): Código do país
- `external_reference_id_label` (text): Referência externa

#### `products`
Catálogo de produtos.
- `product_id` (UUID, PK): ID único do produto
- `product_name` (text): Nome do produto
- `lever` (text): Nível/alavancagem
- `label` (text): Rótulo customizado para exibição
- `group_id` (UUID, FK, nullable): Grupo ao qual pertence

#### `product_groups`
Grupos para organizar produtos.
- `id` (UUID, PK): ID único do grupo
- `name` (text): Nome do grupo

#### `daily_sales`
Agregação de vendas por dia (view ou tabela materializada).
- `date` (date): Data
- Campos agregados (total, quantidade, etc.)

#### `audit_logs`
Logs de auditoria de todas as ações.
- `id` (UUID, PK)
- `event_type` (text): Tipo de evento (LOGIN_SUCCESS, CSV_UPLOAD, DB_RESET, etc.)
- `description` (text): Descrição detalhada
- `ip_address` (text): IP do usuário
- `created_at` (timestamp): Data/hora do evento

#### `app_settings`
Configurações da aplicação (key-value).
- `key` (text, PK): Chave da configuração
- `value` (jsonb): Valor (ex: `sort_order` armazena array de nomes)

### Funções RPC

- `get_product_summary(start_date, end_date)`: Retorna resumo de vendas por produto em um período

---

## Workflow e Funcionalidades

### 1. Setup Inicial (`/backend/setup.php`)

**Fluxo:**
1. Verifica se `.env` e `backend/secrets.php` existem
2. Se não existirem, exibe formulário de setup em 2 etapas:
   - **Etapa 1**: Configuração do Supabase (URL + Service Role Key)
   - **Etapa 2**: Configuração do 2FA (gera QR Code, usuário escaneia e confirma com código)
3. Salva `.env` na raiz do projeto e `secrets.php` em `backend/`
4. Após setup, redireciona para login

**Proteção**: Rate limiting (30 tentativas por 15 minutos por IP)

### 2. Autenticação (`/backend/login.php`)

**Fluxo:**
- Usuário acessa qualquer página protegida → redirecionado para `/backend/login.php`
- Sistema verifica se existe `2fa_secret` em `secrets.php`:
  - **Se não existir (primeira vez)**: Exibe QR Code para configurar 2FA
  - **Se existir**: Exibe apenas campo de código 2FA
- Usuário insere código TOTP de 6 dígitos
- Se válido: cria sessão PHP, define `$_SESSION['authenticated'] = true`
- Redireciona para `/` (dashboard principal)

**Proteção**: 
- Rate limiting (10 tentativas por 15 minutos por IP)
- Timeout de sessão: 2h idle, 8h máximo absoluto
- Regeneração de session ID após login

### 3. Dashboard Principal (`/` ou `/index.php`)

**Fluxo:**
- `index.php` verifica:
  1. Se `.env` e `secrets.php` existem → redireciona para setup
  2. Se usuário está autenticado → redireciona para login
  3. Se autenticado → carrega `app.html` (frontend React)

**Frontend React** (build estático):
- Aplicação SPA que consome APIs do backend PHP
- Rotas e componentes gerenciados pelo React Router (inferido pela estrutura)

### 4. Upload de Dados (`/backend/upload.php`)

**Funcionalidade**: Processa arquivos CSV ou ZIP contendo transações.

**Fluxo:**
1. Usuário faz upload de arquivo CSV ou ZIP (máx 50MB)
2. Sistema valida tipo de arquivo (extensão + MIME type)
3. Se ZIP: extrai todos os CSVs (máx 50 arquivos)
4. Para cada CSV:
   - Lê headers obrigatórios: `earningId`, `transactionDate`, `transactionAmount`, `lever`, `productName`, `productId`, `transactionCountryCode`, `externalReferenceIdLabel`
   - Filtra por whitelist de `product_id` (arquivo `backend/whitelist.php`)
   - Valida campos obrigatórios (pula linhas inválidas)
   - Processa em batches de 1000 registros
   - Insere produtos (upsert) e transações no Supabase
5. Retorna estatísticas: total processado, inserido, data mais recente, erros

**Proteção**:
- Rate limiting: 30 uploads por hora (por IP e por sessão)
- Validação de origem (same-origin)
- Whitelist de produtos (apenas produtos permitidos são processados)

### 5. API REST (`/backend/api.php`)

Todos os endpoints retornam JSON e requerem autenticação.

#### Endpoints Disponíveis

**GET `/backend/api.php?action=products`**
- Retorna lista de produtos com seus grupos
- Query: `?select=*,product_groups(name,id)&order=product_name.asc`

**GET `/backend/api.php?action=groups`**
- Retorna lista de grupos de produtos
- Query: `?order=name.asc`

**POST `/backend/api.php?action=create_group`**
- Cria um novo grupo e associa produtos a ele
- Body: `{ "name": "Nome do Grupo", "productIds": ["uuid1", "uuid2", ...] }`

**POST `/backend/api.php?action=update_product`**
- Atualiza produto (label, group_id)
- Body: `{ "product_id": "uuid", "label": "Novo Label", "group_id": "uuid" | null }`

**GET `/backend/api.php?action=report&start=YYYY-MM-DD&end=YYYY-MM-DD`**
- Retorna relatório de vendas no período
- Resposta: `{ "daily": [...], "summary": [...] }`
- `daily`: vendas diárias (tabela `daily_sales`)
- `summary`: resumo por produto (RPC `get_product_summary`)

**POST `/backend/api.php?action=add_product`**
- Adiciona produto manualmente
- Body: `{ "productId": "uuid", "productName": "Nome", "lever": "Nível" }`

**GET `/backend/api.php?action=get_login_history`**
- Retorna últimos 50 logs de auditoria
- Query: `?order=created_at.desc&limit=50`

**POST `/backend/api.php?action=save_sort_order`**
- Salva ordem de classificação customizada
- Body: `{ "order": ["produto1", "grupo1", "produto2", ...] }`

**GET `/backend/api.php?action=get_sort_order`**
- Retorna ordem de classificação salva

**POST `/backend/api.php?action=truncate_table`**
- Limpa uma tabela específica (perigoso!)
- Body: `{ "table": "transactions" | "products" | "product_groups" | "audit_logs" }`
- Proteção: Rate limit mais restritivo (20 por hora)

**POST `/backend/api.php?action=reset_all`**
- Limpa todas as tabelas (muito perigoso!)
- Proteção: Rate limit muito restritivo (10 por hora)

**Proteção Geral da API:**
- Rate limiting: 600 requisições por minuto (por IP e por sessão)
- Validação de origem (same-origin)
- Validação de entrada (UUIDs, strings, arrays, datas)
- Headers de segurança

---

## Páginas e Rotas

### Backend (PHP)

1. **`/backend/setup.php`** - Setup inicial do sistema (2 etapas)
2. **`/backend/login.php`** - Página de login 2FA
3. **`/backend/api.php`** - API REST (JSON)
4. **`/backend/upload.php`** - Endpoint de upload de CSV/ZIP

### Frontend (React SPA)

**Rota principal**: `/` (via `index.php`)

O frontend React é um build estático, então as rotas são gerenciadas pelo React Router. Baseado nas APIs disponíveis, o frontend provavelmente possui:

1. **Dashboard/Home** (`/`)
   - Visão geral de vendas
   - Gráficos de vendas diárias
   - Resumo por produto

2. **Produtos** (`/products` ou seção na mesma página)
   - Lista de produtos
   - Agrupamento por grupos
   - Edição de labels
   - Criação/edição de grupos
   - Ordenação customizada (drag & drop?)

3. **Relatórios** (`/reports` ou modal/filtro)
   - Filtro por data (start/end)
   - Visualização de vendas diárias
   - Resumo por produto

4. **Upload** (`/upload` ou seção)
   - Interface de upload de arquivo
   - Feedback de progresso/resultado

5. **Configurações/Admin** (`/settings` ou seção)
   - Histórico de login (audit logs)
   - Opções de reset (truncate tables)
   - Logout

**Nota**: Como o frontend é um build estático, não temos acesso ao código fonte React. As rotas acima são inferidas pelas funcionalidades das APIs.

---

## Descrição Detalhada de Cada Página

### 1. Página de Setup (`/backend/setup.php`)

**Função**: Configuração inicial do sistema. Executada apenas uma vez na primeira instalação.

**Quando é exibida**: Automaticamente quando `.env` ou `backend/secrets.php` não existem.

**Estrutura**:
- **Etapa 1 - Configuração do Banco de Dados**:
  - **Campo "Supabase URL"**: Input de texto para URL do projeto Supabase (ex: `https://xyz.supabase.co`)
  - **Campo "Service Role Key"**: Input de texto para a chave service_role do Supabase
  - **Botão "Test & Next"**: Valida conexão e avança para etapa 2
  - **Mensagem de erro**: Exibida se conexão falhar

- **Etapa 2 - Configuração do 2FA**:
  - **QR Code**: Imagem gerada para escanear com Google Authenticator
  - **Código secreto**: Texto monospace exibido abaixo do QR (alternativa manual)
  - **Campo "Enter Code"**: Input para código TOTP de 6 dígitos do app autenticador
  - **Botão "Finish Setup"**: Salva configuração e redireciona para login

**Comportamento**:
- Se setup já foi completado: exibe mensagem informando que setup já foi feito
- Após etapa 1: redireciona para `setup.php?step=2`
- Após etapa 2: salva arquivos `.env` e `secrets.php`, redireciona para `/backend/login.php`

---

### 2. Página de Login (`/backend/login.php`)

**Função**: Autenticação do usuário via código 2FA (Google Authenticator).

**Quando é exibida**: Automaticamente quando usuário não está autenticado (redirecionamento automático).

**Estrutura**:
- **Título**: "Restricted Access"
- **Subtítulo**: 
  - Se primeira vez: "Initial Passkey Setup (2FA)"
  - Se já configurado: "Two-Factor Authentication"

- **Modo Setup (primeira vez apenas)**:
  - **QR Code**: Imagem para escanear com app autenticador
  - **Código secreto**: Texto exibido abaixo do QR
  - **Instrução**: "Scan with Google Authenticator or Authy"

- **Campo de código 2FA** (sempre presente):
  - Label: "2FA Code (6 digits)"
  - Input: Campo de texto centralizado, fonte monospace, espaçamento largo entre caracteres
  - Aceita apenas 6 dígitos numéricos

- **Botão de submit**:
  - Se modo setup: "Setup 2FA & Login"
  - Se login normal: "Login"

- **Mensagem de erro**: Exibida abaixo do título se código inválido ou rate limit excedido

**Comportamento**:
- Após código válido: cria sessão PHP, redireciona para `/` (dashboard)
- Em caso de erro: exibe mensagem e mantém na página
- Rate limit: Após 10 tentativas falhadas em 15 minutos, bloqueia temporariamente

---

### 3. Dashboard Principal (`/` via `index.php`)

**Função**: Página principal do sistema após login. Exibe visão geral de vendas e métricas.

**Quando é exibida**: Apenas após autenticação bem-sucedida.

**Entry Point (`index.php`)**:
- Verifica se sistema está configurado (`.env` e `secrets.php` existem)
- Verifica se usuário está autenticado
- Se tudo OK: carrega `app.html` (frontend React SPA)

**Frontend React - Estrutura Esperada**:

#### 3.1. Dashboard/Home (`/`)

**Função**: Visão geral de vendas e métricas principais.

**Elementos exibidos**:

1. **Cards de Resumo** (topo da página):
   - Total de vendas (período atual ou todos os tempos)
   - Total de produtos cadastrados
   - Total de transações
   - Última data de upload (data mais recente nas transações)

2. **Gráfico de Vendas Diárias**:
   - Tipo: Linha temporal ou gráfico de barras
   - Eixo X: Datas (campo `date` de `daily`)
   - Eixo Y: Valores de vendas (campo `total_sales` ou `transaction_amount`)
   - Dados: Endpoint `/backend/api.php?action=report&start=YYYY-MM-DD&end=YYYY-MM-DD`
   - Período padrão: Mês atual (primeiro dia do mês até hoje)

3. **Filtros de Data**:
   - Campo "Data Inicial": Date picker (formato YYYY-MM-DD)
   - Campo "Data Final": Date picker (formato YYYY-MM-DD)
   - Botões de período rápido: "Hoje", "Esta Semana", "Este Mês", "Último Mês"
   - Botão "Aplicar" ou atualização automática ao alterar datas

4. **Tabela de Resumo por Produto**:
   - **Colunas**:
     - Nome do Produto (`product_name` ou `label`)
     - Total de Vendas (`total_sales` - soma de `transaction_amount`)
     - Quantidade de Transações (`transaction_count`)
     - Média por Transação (`average_amount`)
     - Grupo (se aplicável)
   - **Funcionalidades**:
     - Ordenável por qualquer coluna (clique no header)
     - Dados: Campo `summary` do endpoint `report`
     - Possível agrupamento visual por grupos de produtos

**Ações disponíveis**:
- Navegação para outras seções (Produtos, Upload, Relatórios, Configurações)
- Atualização de dados (botão refresh ou automático)

---

#### 3.2. Página/Seção de Produtos (`/products`)

**Função**: Gerenciar catálogo de produtos, organizá-los em grupos e editar labels.

**Elementos exibidos**:

1. **Lista de Produtos**:
   - **Estrutura**: Tabela ou cards agrupados
   - **Agrupamento**: Produtos organizados por `product_groups` (se houver)
   - **Produtos sem grupo**: Exibidos em seção "Sem Grupo" ou similar
   - **Dados**: Endpoint `/backend/api.php?action=products`

2. **Colunas/Informações por Produto**:
   - Nome do Produto (`product_name`)
   - Label Customizado (`label` - se diferente de `product_name`)
   - Lever (`lever` - nível/alavancagem)
   - Grupo (`product_groups.name` - se aplicável)
   - Ações (botões de ação por produto)

3. **Ações por Produto**:
   - **Editar Label**: Botão/modal para alterar `label` do produto
     - Endpoint: `POST /backend/api.php?action=update_product`
     - Body: `{ "product_id": "uuid", "label": "Novo Label" }`
   - **Mover para Grupo**: Dropdown para selecionar grupo existente ou "Sem Grupo"
     - Endpoint: `POST /backend/api.php?action=update_product`
     - Body: `{ "product_id": "uuid", "group_id": "uuid" | null }`
   - **Remover de Grupo**: Botão para remover produto do grupo atual
     - Endpoint: `POST /backend/api.php?action=update_product`
     - Body: `{ "product_id": "uuid", "group_id": null }`

4. **Gerenciamento de Grupos**:
   - **Botão "Criar Grupo"**: Abre modal/formulário
     - Campo "Nome do Grupo": Input de texto
     - Seleção de Produtos: Checkboxes ou multi-select com lista de produtos
     - Botão "Criar": Envia requisição
     - Endpoint: `POST /backend/api.php?action=create_group`
     - Body: `{ "name": "Nome", "productIds": ["uuid1", "uuid2", ...] }`
   
   - **Editar Nome do Grupo**: Botão/ícone de edição ao lado do nome do grupo
     - Modal com input para novo nome
     - Endpoint: Atualização via API (se disponível) ou recriação
   
   - **Deletar Grupo**: Botão/ícone de deletar
     - Confirmação antes de deletar
     - Remove `group_id` de todos os produtos do grupo

5. **Ordenação Customizada**:
   - **Drag & Drop**: Permite arrastar produtos/grupos para reordenar
   - **Salvar Ordem**: Botão para salvar ordem atual
     - Endpoint: `POST /backend/api.php?action=save_sort_order`
     - Body: `{ "order": ["Grupo A", "Produto 1", "Produto 2", ...] }`
   - **Carregar Ordem**: Ao carregar página, aplica ordem salva
     - Endpoint: `GET /backend/api.php?action=get_sort_order`

**Funcionalidades adicionais**:
- Busca/filtro de produtos (por nome, lever, grupo)
- Contador de produtos por grupo
- Visualização em lista ou cards

---

#### 3.3. Página/Seção de Upload (`/upload`)

**Função**: Fazer upload de arquivos CSV ou ZIP contendo transações para processamento.

**Elementos exibidos**:

1. **Área de Upload**:
   - **Drag & Drop**: Área onde usuário pode arrastar arquivo
   - **Botão "Escolher Arquivo"**: Abre seletor de arquivo do sistema
   - **Tipos aceitos**: CSV ou ZIP
   - **Limite**: 50MB (exibir aviso se exceder)
   - **Feedback visual**: Destaque quando arquivo está sobre a área

2. **Informações do Upload**:
   - Nome do arquivo selecionado
   - Tamanho do arquivo
   - Tipo (CSV ou ZIP)
   - Botão "Fazer Upload" (desabilitado até arquivo ser selecionado)

3. **Progresso do Upload**:
   - Barra de progresso durante upload
   - Indicador de porcentagem
   - Mensagem de status ("Enviando...", "Processando...")

4. **Resultado do Upload**:
   - **Mensagem de Sucesso**:
     - Total de linhas processadas (`processed`)
     - Total de transações inseridas (`inserted`)
     - Data mais recente encontrada (`latest_date`)
     - Número de arquivos CSV processados (`csv_files_processed` - se foi ZIP)
   
   - **Mensagem de Erro** (se houver):
     - Mensagem de erro principal (`error`)
     - Lista de erros detalhados (`details` - array de strings)
     - Exemplos: "File too large", "Invalid file type", "No CSV files found in ZIP"
   
   - **Estatísticas em Cards/Tabela**:
     - Cards com métricas principais
     - Tabela com detalhes de cada arquivo processado (se ZIP)

5. **Histórico de Uploads** (opcional):
   - Lista de uploads recentes
   - Dados: Endpoint `GET /backend/api.php?action=get_login_history` (filtrar por `CSV_UPLOAD`)
   - Colunas: Data/Hora, Arquivo, Processados, Inseridos, Status

**Ações disponíveis**:
- Selecionar arquivo
- Fazer upload
- Limpar seleção
- Ver histórico (se implementado)

**Endpoint**: `POST /backend/upload.php` (FormData com campo `file`)

---

#### 3.4. Página/Seção de Relatórios (`/reports`)

**Função**: Visualizar relatórios detalhados de vendas com filtros de data e gráficos.

**Elementos exibidos**:

1. **Filtros de Período**:
   - **Data Inicial**: Date picker (formato YYYY-MM-DD)
   - **Data Final**: Date picker (formato YYYY-MM-DD)
   - **Botões de Período Rápido**:
     - "Hoje" (data atual)
     - "Esta Semana" (segunda até hoje)
     - "Este Mês" (primeiro dia do mês até hoje)
     - "Último Mês" (mês anterior completo)
     - "Últimos 30 Dias"
     - "Últimos 90 Dias"
   - **Botão "Gerar Relatório"**: Aplica filtros e busca dados

2. **Gráfico de Vendas Diárias**:
   - **Tipo**: Gráfico de linha temporal ou barras
   - **Eixo X**: Datas (campo `date` de `daily`)
   - **Eixo Y**: Valores de vendas
   - **Dados**: Campo `daily` do endpoint `report`
   - **Informações no gráfico**:
     - Tooltip ao passar mouse: Data, Total de Vendas, Quantidade de Transações
     - Zoom e pan (se biblioteca suportar)
   - **Legenda**: Se houver múltiplas séries

3. **Tabela de Resumo por Produto**:
   - **Colunas**:
     - Nome do Produto (`product_name` ou `label`)
     - Total de Vendas (`total_sales` - formato monetário)
     - Quantidade de Transações (`transaction_count`)
     - Média por Transação (`average_amount` - formato monetário)
     - Percentual do Total (opcional)
   - **Funcionalidades**:
     - Ordenável por qualquer coluna (clique no header)
     - Paginação (se muitos produtos)
     - Busca/filtro por nome de produto
     - Agrupamento visual por grupos (se aplicável)
   - **Dados**: Campo `summary` do endpoint `report`

4. **Tabela de Vendas Diárias** (opcional, abaixo do gráfico):
   - **Colunas**:
     - Data (`date`)
     - Total de Vendas (`total_sales`)
     - Quantidade de Transações (`transaction_count`)
     - Média por Dia (`average_amount`)
   - **Funcionalidades**:
     - Ordenável por data ou valores
     - Exportável (se implementado)
   - **Dados**: Campo `daily` do endpoint `report`

5. **Ações de Exportação** (opcional):
   - **Botão "Exportar CSV"**: Gera arquivo CSV com dados do relatório
   - **Botão "Exportar PDF"**: Gera PDF com gráfico e tabelas (se implementado)

**Endpoint**: `GET /backend/api.php?action=report&start=YYYY-MM-DD&end=YYYY-MM-DD`

**Comportamento**:
- Ao carregar página: Exibe dados do mês atual por padrão
- Ao alterar filtros: Atualiza gráfico e tabelas automaticamente ou ao clicar "Gerar Relatório"

---

#### 3.5. Página/Seção de Configurações/Admin (`/settings`)

**Função**: Gerenciar configurações do sistema, visualizar logs de auditoria e ações administrativas.

**Elementos exibidos**:

1. **Histórico de Login/Auditoria**:
   - **Título**: "Histórico de Atividades" ou similar
   - **Tabela de Logs**:
     - **Colunas**:
       - Data/Hora (`created_at` - formatado como DD/MM/YYYY HH:MM:SS)
       - Tipo de Evento (`event_type`)
       - Descrição (`description`)
       - Endereço IP (`ip_address`)
     - **Tipos de Evento** (com ícones/cores diferentes):
       - `LOGIN_SUCCESS`: Login bem-sucedido
       - `LOGIN_FAIL`: Tentativa de login falhada
       - `LOGIN_SETUP`: Setup inicial de 2FA
       - `CSV_UPLOAD`: Upload de arquivo CSV/ZIP
       - `DB_RESET`: Reset de tabela específica
       - `DB_RESET_ALL`: Reset completo do sistema
     - **Funcionalidades**:
       - Ordenação por data (mais recente primeiro - padrão)
       - Filtro por tipo de evento (dropdown)
       - Busca por descrição ou IP
       - Paginação (50 registros por vez)
   - **Dados**: Endpoint `GET /backend/api.php?action=get_login_history`

2. **Ações Administrativas**:
   - **Seção**: "Ações Perigosas" ou "Manutenção" (com avisos visuais)
   
   - **Limpar Tabela**:
     - **Dropdown**: Selecionar tabela
       - Opções: "Transações", "Produtos", "Grupos de Produtos", "Logs de Auditoria"
     - **Botão "Limpar Tabela"**: 
       - Cor vermelha para indicar perigo
       - Abre modal de confirmação dupla
       - Modal exibe: "Tem certeza? Esta ação não pode ser desfeita."
       - Campo de confirmação: Digitar nome da tabela para confirmar
       - Botões: "Cancelar" e "Confirmar"
     - **Endpoint**: `POST /backend/api.php?action=truncate_table`
     - **Body**: `{ "table": "transactions" | "products" | "product_groups" | "audit_logs" }`
   
   - **Reset Completo**:
     - **Botão "Reset All"**: 
       - Cor vermelha, destaque visual de perigo
       - Abre modal de confirmação dupla
       - Modal exibe: "ATENÇÃO: Esta ação irá limpar TODAS as tabelas (transações, produtos, grupos). Esta ação NÃO pode ser desfeita."
       - Campo de confirmação: Digitar "RESET" para confirmar
       - Botões: "Cancelar" e "Confirmar Reset"
     - **Endpoint**: `POST /backend/api.php?action=reset_all`
     - **Aviso**: Após reset, log de auditoria é criado mas dados são perdidos

3. **Informações do Sistema** (opcional):
   - Versão do sistema
   - Última atualização
   - Estatísticas gerais (total de registros, etc.)

4. **Logout**:
   - **Botão "Logout"**: 
     - Localizado no topo da página ou menu
     - Ao clicar: Destrói sessão PHP e redireciona para `/backend/login.php`
     - Endpoint: Não há endpoint específico, pode ser link para `/backend/logout.php` (se existir) ou ação via JavaScript que limpa sessão

**Avisos e Confirmações**:
- Todas as ações administrativas devem ter confirmação dupla
- Mensagens de aviso claras sobre perda de dados
- Feedback visual após ações (sucesso/erro)

---

### 4. Navegação Global (Menu/Sidebar)

**Função**: Navegação entre seções do sistema.

**Elementos** (se implementado como menu lateral ou topo):

1. **Logo/Branding**: "EK Partner Panel" ou logo da empresa
2. **Links de Navegação**:
   - Dashboard (ícone: gráfico/casa)
   - Produtos (ícone: lista/caixa)
   - Upload (ícone: upload/arquivo)
   - Relatórios (ícone: relatório/gráfico)
   - Configurações (ícone: engrenagem)
3. **Indicador de Página Ativa**: Destaque visual no link da página atual
4. **Botão Logout**: No canto superior direito ou no menu
5. **Responsividade**: Menu hamburger em telas pequenas

---

### 5. Endpoints de API (não são páginas visuais)

**`/backend/api.php`**:
- Endpoint REST que retorna JSON
- Não tem interface visual
- Consumido pelo frontend React via `fetch()` ou `axios`

**`/backend/upload.php`**:
- Endpoint de upload que retorna JSON
- Não tem interface visual
- Consumido pelo frontend React via `FormData` e `fetch()`

---

## Estrutura de Dados das APIs

### Resposta do Endpoint `products`

```json
[
  {
    "product_id": "uuid",
    "product_name": "Nome do Produto",
    "lever": "Nível",
    "label": "Rótulo Customizado",
    "group_id": "uuid-do-grupo",
    "product_groups": {
      "id": "uuid-do-grupo",
      "name": "Nome do Grupo"
    }
  }
]
```

### Resposta do Endpoint `groups`

```json
[
  {
    "id": "uuid",
    "name": "Nome do Grupo"
  }
]
```

### Resposta do Endpoint `report`

```json
{
  "daily": [
    {
      "date": "2024-01-15",
      "total_sales": 1234.56,
      "transaction_count": 42
    }
  ],
  "summary": [
    {
      "product_id": "uuid",
      "product_name": "Nome do Produto",
      "total_sales": 5678.90,
      "transaction_count": 123,
      "average_amount": 46.17
    }
  ]
}
```

### Resposta do Endpoint `get_login_history`

```json
[
  {
    "id": "uuid",
    "event_type": "LOGIN_SUCCESS",
    "description": "User logged in successfully",
    "ip_address": "192.168.1.1",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Resposta do Endpoint `upload` (sucesso)

```json
{
  "success": true,
  "processed": 5000,
  "inserted": 4850,
  "latest_date": "2024-01-15",
  "csv_files_processed": 3,
  "errors": []
}
```

### Resposta do Endpoint `upload` (erro)

```json
{
  "error": "Mensagem de erro",
  "details": ["Erro 1", "Erro 2"]
}
```

### Resposta do Endpoint `get_sort_order`

```json
[
  {
    "key": "sort_order",
    "value": ["Grupo A", "Produto 1", "Produto 2", "Grupo B"]
  }
]
```

---

## Fluxo de Dados

### Upload de Transações

```
Usuário → Upload CSV/ZIP → upload.php
  ↓
Validação (tipo, tamanho, origem)
  ↓
Extração (se ZIP) → Processamento CSV
  ↓
Filtro por Whitelist (product_id)
  ↓
Validação de campos obrigatórios
  ↓
Batch Insert (1000 registros)
  ↓
Supabase (products + transactions)
  ↓
Audit Log
  ↓
Resposta JSON (estatísticas)
```

### Visualização de Dados

```
Frontend React → GET /api.php?action=products
  ↓
Backend PHP → Verifica autenticação
  ↓
Supabase (service_role) → SELECT products
  ↓
Resposta JSON → Frontend
  ↓
Renderização React
```

### Relatórios

```
Frontend → GET /api.php?action=report&start=...&end=...
  ↓
Backend → Verifica autenticação
  ↓
Supabase → SELECT daily_sales + RPC get_product_summary
  ↓
Resposta JSON → Frontend
  ↓
Gráficos/Tabelas React
```

---

## Segurança

### Camadas de Proteção

1. **Autenticação 2FA obrigatória**
   - Google Authenticator (TOTP)
   - Sem senha tradicional

2. **Sessões PHP seguras**
   - HttpOnly, Secure (se HTTPS), SameSite=Strict
   - Timeout: 2h idle, 8h máximo
   - Regeneração de ID após login

3. **Service Role Key protegida**
   - Nunca exposta ao frontend
   - Armazenada em `.env` (bloqueado por `.htaccess`)
   - Apenas backend PHP acessa Supabase

4. **RLS no Supabase**
   - Row Level Security ativado em todas as tabelas
   - Sem políticas permissivas para anon/authenticated
   - Privilégios revogados de anon/authenticated

5. **Rate Limiting**
   - Login: 10 tentativas / 15 min
   - API: 600 requisições / minuto
   - Upload: 30 uploads / hora
   - Ações perigosas: limites mais restritivos

6. **Validação de Origem**
   - Same-origin enforcement para POST
   - Verificação de Origin/Referer

7. **Headers de Segurança**
   - CSP (Content Security Policy)
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - HSTS (se HTTPS)
   - Referrer-Policy
   - Permissions-Policy

8. **Validação de Entrada**
   - UUIDs validados
   - Strings com limites de tamanho
   - Arrays com limites de itens
   - Datas no formato YYYY-MM-DD

9. **Whitelist de Produtos**
   - Apenas produtos na whitelist são processados no upload
   - Arquivo `backend/whitelist.php` contém array de UUIDs permitidos

---

## Arquivos Importantes

### Backend

- `backend/config.php` - Carrega variáveis de ambiente do `.env`
- `backend/auth.php` - Gerenciamento de sessões e autenticação
- `backend/login.php` - Página de login 2FA
- `backend/setup.php` - Setup inicial
- `backend/api.php` - API REST principal
- `backend/upload.php` - Processamento de uploads
- `backend/supabase.php` - Cliente Supabase (REST API)
- `backend/validation.php` - Funções de validação
- `backend/ratelimit.php` - Rate limiting file-based
- `backend/whitelist.php` - Lista de product_ids permitidos
- `backend/GoogleAuthenticator.php` - Biblioteca 2FA
- `backend/secrets.php` - Armazena `2fa_secret` (gerado no setup)

### Frontend

- `app.html` - HTML do build React (carregado após autenticação)
- `index.html` - HTML do build React (desenvolvimento?)
- `index.php` - Entry point que verifica auth e carrega `app.html`
- `assets/` - JS e CSS do build React

### Configuração

- `.env` - Variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
- `env.example` - Template do `.env`
- `.htaccess` - Bloqueia acesso a `.env` e outros arquivos sensíveis

### Documentação

- `docs/supabase_lockdown.sql` - SQL para configurar RLS e segurança no Supabase

---

## Requisitos para Integração com Lovable

### O que o Lovable precisa criar:

1. **Frontend React** com as seguintes páginas/seções:
   - Dashboard com gráficos de vendas
   - Lista de produtos (com grupos)
   - Interface de upload de CSV/ZIP
   - Relatórios com filtros de data
   - Configurações/admin

2. **Integração com APIs existentes**:
   - Todas as chamadas devem ir para `/backend/api.php?action=...`
   - Upload deve ir para `/backend/upload.php`
   - Autenticação é gerenciada pelo backend (sessões PHP)

3. **Design**:
   - Usar Tailwind CSS (já está no projeto)
   - Tema escuro (slate-900, slate-800) baseado no login.php
   - Interface moderna e responsiva

### O que NÃO precisa ser criado:

- Backend PHP (já existe e funciona)
- Autenticação 2FA (já implementada)
- Setup inicial (já implementado)
- Banco de dados (já configurado no Supabase)

### Pontos de Atenção:

1. **Autenticação**: O frontend não gerencia login. Se o usuário não estiver autenticado, o `index.php` redireciona automaticamente para `/backend/login.php`. O frontend apenas consome as APIs (que já verificam autenticação).

2. **CORS**: Não há CORS configurado, então o frontend deve estar no mesmo domínio ou usar proxy.

3. **Sessões**: As sessões PHP são gerenciadas automaticamente. O frontend não precisa fazer nada especial, apenas fazer requisições normais (cookies são enviados automaticamente).

4. **Build**: O frontend React deve ser buildado como estático e os arquivos colocados na raiz do projeto (substituindo `app.html` e `assets/`).

---

## Exemplo de Uso das APIs

### Listar Produtos
```javascript
fetch('/backend/api.php?action=products')
  .then(r => r.json())
  .then(data => console.log(data));
```

### Criar Grupo
```javascript
fetch('/backend/api.php?action=create_group', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Meu Grupo',
    productIds: ['uuid1', 'uuid2']
  })
})
  .then(r => r.json())
  .then(data => console.log(data));
```

### Upload de Arquivo
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/backend/upload.php', {
  method: 'POST',
  body: formData
})
  .then(r => r.json())
  .then(data => console.log(data));
```

### Relatório
```javascript
fetch('/backend/api.php?action=report&start=2024-01-01&end=2024-01-31')
  .then(r => r.json())
  .then(data => {
    console.log('Daily:', data.daily);
    console.log('Summary:', data.summary);
  });
```

---

## Conclusão

O PartnerCenter é um sistema completo de dashboard de vendas com foco em segurança. O backend PHP está totalmente funcional e o frontend React precisa ser desenvolvido/integrado. O Lovable pode criar o frontend React que consome as APIs existentes, mantendo a mesma estrutura de autenticação e segurança já implementada.

