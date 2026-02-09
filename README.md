# Portal de Relatorios - Partners Comunicacao

Portal web desenvolvido para a **Partners Comunicacao Integrada**, permitindo que clientes acessem seus relatorios de marketing digital e arquivos de forma segura e centralizada.

**Stack:** Next.js 14 | TypeScript 5.3 | Supabase (PostgreSQL) | Tailwind CSS 3.4

---

## Indice

- [Visao Geral](#visao-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Banco de Dados](#banco-de-dados)
- [API Routes](#api-routes)
- [Autenticacao e Seguranca](#autenticacao-e-seguranca)
- [Componentes Frontend](#componentes-frontend)
- [Painel Administrativo](#painel-administrativo)
- [Configuracao e Instalacao](#configuracao-e-instalacao)
- [Variaveis de Ambiente](#variaveis-de-ambiente)
- [Deploy](#deploy)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)

---

## Visao Geral

O **Portal de Relatorios** e uma aplicacao web que centraliza o acesso de clientes da Partners Comunicacao aos seus relatorios gerados pelo Reportei e pastas do Google Drive. O sistema conta com:

- **Area do cliente**: login seguro, visualizacao de relatorios via iframe e acesso a arquivos no Drive.
- **Painel administrativo**: metricas de acesso, gerenciamento de clientes (CRUD), monitoramento de seguranca e log de auditoria.
- **Persistencia em nuvem**: todos os dados sao armazenados no Supabase (PostgreSQL), garantindo funcionamento em plataformas serverless como Netlify e Vercel.

---

## Funcionalidades

### Area do Cliente

| Funcionalidade | Descricao |
|---|---|
| **Login seguro** | Autenticacao com usuario/senha validados contra o banco via bcrypt |
| **Visualizacao de relatorio** | Relatorio Reportei exibido em iframe fullscreen |
| **Acesso ao Google Drive** | Botao para abrir a pasta do Drive do cliente em nova aba |
| **Sessao persistente** | Sessao valida por 8 horas, com validacao server-side |
| **Logout** | Encerra a sessao no servidor e limpa dados locais |
| **Redirecionamento automatico** | Se ja autenticado, redireciona direto para o dashboard |
| **Tratamento de erros** | Fallback visual quando o iframe nao carrega, com opcao de abrir em nova aba |

### Painel Administrativo

#### Aba Metricas

| Funcionalidade | Descricao |
|---|---|
| **Total de acessos (logins)** | Contagem total de logins de clientes no periodo |
| **Clientes ativos** | Quantidade de clientes unicos que acessaram |
| **Acessos ao Drive** | Contagem de vezes que clientes abriram o Drive |
| **Media por dia** | Media diaria de logins no periodo selecionado |
| **Logins por cliente** | Ranking de acessos com barra de progresso visual |
| **Logins por data** | Historico de logins agrupados por dia (fuso de Brasilia) |
| **Acessos ao Drive por cliente** | Ranking de acessos ao Drive por cliente |
| **Historico de logins recentes** | Tabela com ultimos 50 logins (cliente, usuario, data/hora) |
| **Filtros de periodo** | Hoje, 7 dias, 30 dias, mes atual ou periodo personalizado |

#### Aba Clientes

| Funcionalidade | Descricao |
|---|---|
| **Listar clientes** | Tabela com todos os clientes cadastrados |
| **Criar cliente** | Formulario para cadastrar novo cliente com username, senha, nome, URLs |
| **Editar cliente** | Alterar dados do cliente (senha opcional - deixar vazio mantem a atual) |
| **Ativar/Desativar** | Toggle para bloquear/liberar acesso do cliente |
| **Excluir cliente** | Remocao permanente com confirmacao |
| **Definir como admin** | Checkbox para dar permissao de administrador |

#### Aba Seguranca

| Funcionalidade | Descricao |
|---|---|
| **Sessoes ativas** | Lista de todas as sessoes ativas com IP, data de login e expiracao |
| **Forcar logout** | Encerrar remotamente todas as sessoes de um cliente |
| **Tentativas de login** | Historico de tentativas (sucesso/falha) com IP e data |
| **Rate limiting** | Bloqueio automatico apos 10 tentativas falhadas em 15 minutos |

#### Aba Auditoria

| Funcionalidade | Descricao |
|---|---|
| **Log de acoes do admin** | Registra quem fez o que, quando e em quem |
| **Acoes rastreadas** | Criacao, edicao, exclusao de clientes e logout forcado |
| **Detalhes legiveis** | Mostra exatamente o que foi alterado (ex: Senha atualizada) |
| **Deteccao inteligente** | Registra apenas campos que realmente mudaram na edicao |

---

## Arquitetura

```
+-------------------------------------------------------------+
|                        FRONTEND                              |
|    Next.js 14 (App Router) + React 18 + Tailwind CSS        |
|                                                              |
|  +----------+  +--------------+  +---------------------+    |
|  |  Login   |  |  Dashboard   |  |   Admin Panel       |    |
|  |  Page    |  |  (Cliente)   |  |   (Metricas,        |    |
|  |  (/)     |  |  + Iframe    |  |    Clientes,        |    |
|  |          |  |  + Header    |  |    Seguranca,       |    |
|  |          |  |  (/dashboard)|  |    Auditoria)       |    |
|  +----+-----+  +------+-------+  +--------+------------+    |
|       |               |                   |                  |
|       +---------------+-------------------+                  |
|                       |                                      |
|              sessionStorage (token)                          |
+---------------------------+----------------------------------+
                            | HTTP (fetch)
+---------------------------+----------------------------------+
|                    API ROUTES (Backend)                       |
|                                                              |
|  /api/auth/login     -> Autenticacao (bcrypt + sessao)       |
|  /api/auth/logout    -> Encerrar sessao                      |
|  /api/auth/session   -> Validar sessao                       |
|  /api/log-access     -> Registrar acesso/drive               |
|  /api/admin/stats    -> Metricas de acesso                   |
|  /api/admin/clients  -> CRUD de clientes                     |
|  /api/admin/sessions -> Sessoes ativas + force logout        |
|  /api/admin/attempts -> Tentativas de login                  |
|  /api/admin/audit    -> Log de auditoria                     |
|  /api/seed           -> Popular banco (uso unico)            |
|                                                              |
|  LIB (Services):                                             |
|  supabase.ts       -> Cliente Supabase (service_role)        |
|  sessionManager.ts -> CRUD de sessoes                        |
|  accessLogs.ts     -> Logs + estatisticas                    |
|  loginAttempts.ts  -> Tentativas + rate limiting             |
|  auditLog.ts       -> Log de auditoria                      |
|  auth.ts           -> Sessao client-side                     |
|  clients.ts        -> Interfaces TypeScript                  |
+---------------------------+----------------------------------+
                            | supabase-js (HTTPS)
+---------------------------+----------------------------------+
|                     SUPABASE (Cloud)                         |
|                                                              |
|  PostgreSQL Database                                         |
|  Tabelas: clients, access_logs, login_attempts,              |
|           sessions, admin_audit_log                          |
|                                                              |
|  + Row Level Security (RLS)                                  |
|  + Indices de performance                                    |
|  + Trigger de updated_at automatico                          |
|  + Funcao de limpeza de sessoes expiradas                    |
+--------------------------------------------------------------+
```

### Fluxo de Autenticacao

1. Cliente envia usuario/senha no formulario
2. Frontend faz POST para /api/auth/login
3. API verifica rate limiting (max 10 falhas por IP em 15min)
4. Busca cliente no Supabase por username
5. Valida senha com bcrypt.compare()
6. Cria sessao com token aleatorio de 96 chars
7. Registra tentativa de login e access_log
8. Retorna token + dados do cliente
9. Frontend salva token no sessionStorage
10. Redireciona para /dashboard (cliente) ou /admin (administrador)

---

## Estrutura de Pastas

```
portal-relatorios-partners/
+-- public/
|   +-- favicon.svg
+-- src/
|   +-- app/
|   |   +-- layout.tsx                 # Layout raiz
|   |   +-- page.tsx                   # Pagina de login (/)
|   |   +-- globals.css                # Estilos globais
|   |   +-- dashboard/page.tsx         # Dashboard do cliente
|   |   +-- admin/page.tsx             # Painel administrativo
|   |   +-- api/
|   |       +-- auth/login/route.ts    # POST - Autenticacao
|   |       +-- auth/logout/route.ts   # POST - Encerrar sessao
|   |       +-- auth/session/route.ts  # POST - Validar sessao
|   |       +-- log-access/route.ts    # POST - Registrar acesso
|   |       +-- seed/route.ts          # GET  - Popular banco
|   |       +-- admin/stats/route.ts   # GET  - Metricas
|   |       +-- admin/clients/route.ts # CRUD - Clientes
|   |       +-- admin/sessions/route.ts# GET/DELETE - Sessoes
|   |       +-- admin/attempts/route.ts# GET  - Tentativas
|   |       +-- admin/audit/route.ts   # GET  - Auditoria
|   +-- components/
|   |   +-- LoginForm.tsx              # Formulario de login
|   |   +-- Header.tsx                 # Cabecalho do dashboard
|   |   +-- ReportFrame.tsx            # Iframe do relatorio
|   +-- lib/
|       +-- supabase.ts                # Cliente Supabase
|       +-- auth.ts                    # Sessao client-side
|       +-- clients.ts                 # Interfaces TypeScript
|       +-- sessionManager.ts          # Sessoes server-side
|       +-- accessLogs.ts              # Logs + estatisticas
|       +-- loginAttempts.ts           # Tentativas + rate limit
|       +-- auditLog.ts               # Log de auditoria
+-- supabase-schema.sql                # Schema do banco
+-- package.json
+-- next.config.js
+-- tailwind.config.ts
+-- tsconfig.json
+-- .env.local                         # Variaveis de ambiente
```

---

## Banco de Dados

O sistema utiliza **Supabase** (PostgreSQL) com 5 tabelas:

### clients - Clientes/Usuarios

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico (auto-gerado) |
| username | TEXT UNIQUE | Nome de usuario para login |
| password_hash | TEXT | Hash bcrypt da senha (12 rounds) |
| name | TEXT | Nome de exibicao do cliente |
| report_url | TEXT | URL do dashboard Reportei |
| drive_url | TEXT | URL da pasta do Google Drive |
| is_admin | BOOLEAN | Se e administrador |
| is_active | BOOLEAN | Se a conta esta ativa |
| logo_url | TEXT | URL do logo do cliente (reservado) |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Ultima atualizacao (trigger automatico) |

### access_logs - Logs de Acesso

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| client_id | UUID FK | Referencia ao cliente |
| username | TEXT | Usuario que acessou |
| client_name | TEXT | Nome do cliente |
| ip | TEXT | Endereco IP |
| user_agent | TEXT | Navegador/dispositivo |
| action | TEXT | Tipo: login ou open_drive |
| created_at | TIMESTAMPTZ | Data/hora do acesso |

### sessions - Sessoes Ativas

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| client_id | UUID FK | Referencia ao cliente |
| token | TEXT UNIQUE | Token de sessao (96 chars hex) |
| ip | TEXT | IP do login |
| user_agent | TEXT | Navegador |
| expires_at | TIMESTAMPTZ | Expiracao (8h apos login) |
| created_at | TIMESTAMPTZ | Data de criacao |

### login_attempts - Tentativas de Login

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| username | TEXT | Usuario tentado |
| success | BOOLEAN | Se o login foi bem-sucedido |
| ip | TEXT | IP da tentativa |
| user_agent | TEXT | Navegador |
| created_at | TIMESTAMPTZ | Data/hora da tentativa |

### admin_audit_log - Log de Auditoria

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador unico |
| admin_id | UUID FK | Admin que executou a acao |
| action | TEXT | Tipo da acao |
| target | TEXT | Nome do cliente afetado |
| details | JSONB | Detalhes da acao |
| created_at | TIMESTAMPTZ | Data/hora da acao |

### Indices de Performance

- idx_access_logs_created_at, idx_access_logs_username, idx_access_logs_client_id
- idx_login_attempts_username, idx_login_attempts_created_at
- idx_sessions_token, idx_sessions_client_id, idx_sessions_expires_at
- idx_admin_audit_log_created_at

### Seguranca no Banco

- Row Level Security (RLS) habilitado em todas as tabelas
- Acesso apenas via service_role key (backend)
- Trigger automatico para updated_at na tabela clients
- Funcao cleanup_expired_sessions() para limpeza periodica

---

## API Routes

### Autenticacao

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | /api/auth/login | Login com usuario/senha | Publica |
| POST | /api/auth/logout | Encerrar sessao | Token |
| POST | /api/auth/session | Validar sessao ativa | Token |

### Logs

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| POST | /api/log-access | Registrar acesso (login/drive) | Token |

### Admin

| Metodo | Rota | Descricao | Auth |
|--------|------|-----------|------|
| GET | /api/admin/stats | Metricas de acesso com filtro | Admin |
| GET | /api/admin/clients | Listar clientes | Admin |
| POST | /api/admin/clients | Criar novo cliente | Admin |
| PUT | /api/admin/clients | Atualizar cliente | Admin |
| DELETE | /api/admin/clients?id=X | Excluir cliente | Admin |
| GET | /api/admin/sessions | Listar sessoes ativas | Admin |
| DELETE | /api/admin/sessions?clientId=X | Forcar logout | Admin |
| GET | /api/admin/attempts | Tentativas de login | Admin |
| GET | /api/admin/audit | Log de auditoria | Admin |

### Utilitarios

| Metodo | Rota | Descricao |
|--------|------|-----------|
| GET | /api/seed | Popular banco com dados iniciais (uso unico) |

---

## Autenticacao e Seguranca

### Medidas de Seguranca

| Medida | Implementacao |
|--------|--------------|
| **Hashing de senhas** | bcrypt com 12 rounds de salt |
| **Tokens de sessao** | 96 caracteres hexadecimais aleatorios (crypto.randomBytes) |
| **Sessoes server-side** | Token validado no banco a cada requisicao |
| **Rate limiting** | Bloqueio apos 10 tentativas falhadas em 15 min por IP |
| **Contas desativaveis** | Admin pode desativar conta sem excluir |
| **Force logout** | Admin pode encerrar sessoes remotamente |
| **Auditoria completa** | Todas as acoes admin sao registradas com detalhes |
| **Supabase service_role** | Chave secreta nunca exposta no frontend |
| **RLS** | Row Level Security habilitado em todas as tabelas |
| **Expiracao de sessao** | 8 horas (server-side) + verificacao client-side |

---

## Componentes Frontend

### LoginForm (src/components/LoginForm.tsx)

- Formulario com campos de usuario e senha
- Toggle de visibilidade da senha (icone de olho)
- Loading spinner durante autenticacao
- Mensagem de erro com animacao slide-up
- Redirecionamento automatico: admin para /admin, cliente para /dashboard

### Header (src/components/Header.tsx)

- Logo da Partners Comunicacao
- Nome do cliente logado (desktop e mobile)
- Botao "Acessar Arquivos" (abre Drive + registra log)
- Botao "Sair" (logout server-side + limpeza local)
- Design responsivo com versao mobile

### ReportFrame (src/components/ReportFrame.tsx)

- Iframe fullscreen para exibir relatorio Reportei
- Loading state com spinner animado
- Error state com fallback visual e botao para abrir em nova aba
- Sandbox de seguranca: allow-same-origin allow-scripts allow-popups allow-forms

---

## Painel Administrativo

O painel admin (/admin) possui 4 abas:

### Metricas
- Cards resumo: Total de acessos, Clientes ativos, Acessos ao Drive, Media por dia
- Logins por cliente: Ranking com barras de progresso
- Logins por data: Historico diario (ajustado para fuso de Brasilia UTC-3)
- Acessos ao Drive por cliente: Ranking separado
- Historico recente: Tabela dos ultimos 50 logins
- Filtros: Hoje, 7 dias, 30 dias, mes atual, periodo personalizado

### Clientes
- Tabela: Nome, username, status, tipo, data de criacao
- Modal de criacao/edicao: Formulario completo com validacao
- Acoes: Editar, ativar/desativar, excluir (com confirmacao)

### Seguranca
- Sessoes ativas: Tabela com usuario, IP, login, expiracao, force logout
- Tentativas de login: Historico com status sucesso/falha, IP, data

### Auditoria
- Log detalhado: Admin, acao legivel, alvo (nome do cliente), detalhes legiveis, data
- Acoes rastreadas: Criou/Atualizou/Excluiu cliente, Forcou logout
- Deteccao inteligente: so registra campos que realmente mudaram

---

## Configuracao e Instalacao

### Pre-requisitos
- Node.js 18+
- npm 9+
- Conta no Supabase (https://supabase.com)

### 1. Clonar o repositorio
```bash
git clone <url-do-repositorio>
cd portal-relatorios-partners
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variaveis de ambiente
Crie o arquivo .env.local na raiz:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 4. Criar tabelas no Supabase
- Acesse o SQL Editor no painel do Supabase
- Execute o conteudo do arquivo supabase-schema.sql

### 5. Popular o banco com dados iniciais
```bash
npm run dev
```
Acesse http://localhost:3000/api/seed (executar apenas 1 vez)

### 6. Acessar o sistema
- Admin: usuario admin / senha admin@partners2024
- Cliente (exemplo): usuario sebrae / senha sebrae2024

---

## Variaveis de Ambiente

| Variavel | Descricao | Onde encontrar |
|----------|-----------|---------------|
| NEXT_PUBLIC_SUPABASE_URL | URL do projeto Supabase | Supabase > Settings > API |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chave anonima (publica) | Supabase > Settings > API |
| SUPABASE_SERVICE_ROLE_KEY | Chave service_role (secreta) | Supabase > Settings > API |

IMPORTANTE: A SUPABASE_SERVICE_ROLE_KEY e secreta e deve ser usada apenas no backend.

---

## Deploy

### Scripts disponiveis
```bash
npm run dev      # Desenvolvimento (localhost:3000)
npm run build    # Build de producao
npm run start    # Servidor de producao
npm run lint     # Verificar erros
```

### Deploy na Vercel (recomendado)
1. Conecte o repositorio na Vercel
2. Configure as variaveis de ambiente
3. Deploy automatico a cada push

### Deploy na Netlify
1. Conecte o repositorio na Netlify
2. Build command: npm run build
3. Publish directory: .next
4. Configure as variaveis de ambiente
5. Instale o plugin @netlify/plugin-nextjs

---

## Tecnologias Utilizadas

| Tecnologia | Versao | Uso |
|------------|--------|-----|
| Next.js | 14.2 | Framework React com App Router e API Routes |
| React | 18.2 | Biblioteca de UI |
| TypeScript | 5.3 | Tipagem estatica |
| Tailwind CSS | 3.4 | Estilizacao utility-first |
| Supabase | 2.39 | Banco de dados PostgreSQL (cloud) |
| bcryptjs | 2.4 | Hashing de senhas |
| PostCSS | 8.4 | Processamento de CSS |
| ESLint | 8.56 | Linting de codigo |

### Design System
- Cores primarias: Roxo (#5B21B6 a #7C3AED) + Amarelo (#FACC15)
- Fonte: Poppins (Google Fonts), system-ui fallback
- Bordas: rounded-xl a rounded-3xl
- Animacoes: fadeIn, slideUp, spinner, pulse-glow

---

Projeto privado - Partners Comunicacao Integrada - 2026.
