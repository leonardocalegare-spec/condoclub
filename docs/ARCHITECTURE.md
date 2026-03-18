# Arquitetura do Sistema — CondoClub

## 1. Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES (Browser)                     │
│                                                             │
│   ┌──────────────────────┐   ┌────────────────────────┐   │
│   │   Frontend (React)   │   │  Admin Panel (React)   │   │
│   │   Porta 3000 / CDN   │   │  Porta 3002 / CDN      │   │
│   └──────────┬───────────┘   └────────────┬───────────┘   │
└──────────────┼─────────────────────────────┼───────────────┘
               │ HTTP/HTTPS                  │
               ▼                             ▼
┌──────────────────────────────────────────────────────────────┐
│                  BACKEND API (Node.js + Express)              │
│                       Porta 3001                             │
│                                                              │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │   Rotas      │  │  Middleware │  │   Controllers    │   │
│  │  /api/auth   │  │  Auth (JWT) │  │  auth, users,    │   │
│  │  /api/users  │  │  Validate   │  │  condos,         │   │
│  │  /api/condos │  │  ErrorHndlr │  │  suppliers,      │   │
│  │  /api/...    │  └─────────────┘  │  services,orders │   │
│  └──────────────┘                   └──────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │               Prisma ORM (Data Access)              │    │
│  └────────────────────────┬────────────────────────────┘    │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │    PostgreSQL 16        │
               │    (Banco de Dados)     │
               └────────────────────────┘
```

## 2. Modelo de Dados

### Entidades Principais

| Entidade | Descrição |
|----------|-----------|
| **User** | Usuário do sistema. Pode ser morador, síndico, fornecedor ou admin. |
| **Condo** | Condomínio cadastrado na plataforma. |
| **Supplier** | Empresa fornecedora de serviços. |
| **Service** | Serviço oferecido por um fornecedor com preço e categoria. |
| **Order** | Pedido feito por um morador contendo um ou mais serviços. |
| **OrderItem** | Item individual de um pedido (serviço + quantidade + preço). |
| **Commission** | Registro de comissão gerada por pedido para o CondoClub. |

### Diagrama Simplificado

```
User ──────── Condo
 │
 └────────── Supplier
                │
               Service ◄──── OrderItem ──── Order ──── Commission
                                                │
                                              User (morador)
```

### Enumerações

- **Role**: `PLATFORM_ADMIN` | `CONDO_MANAGER` | `RESIDENT` | `SUPPLIER`
- **ServiceCategory**: `VEHICLE_WASH` | `CLEANING` | `MAINTENANCE` | `DELIVERY` | `INSURANCE` | `HOME_SERVICES` | `GYM` | `INTERNET` | `COURSES` | `OTHER`
- **OrderStatus**: `PENDING` | `PAID` | `IN_PROGRESS` | `COMPLETED` | `CANCELLED`
- **CommissionStatus**: `PENDING` | `PAID`

## 3. Referência da API

Base URL: `http://localhost:3001/api`

### Autenticação

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /auth/register | — | Cadastro de novo usuário |
| POST | /auth/login | — | Login, retorna JWT |
| GET | /auth/me | JWT | Perfil do usuário autenticado |

### Usuários

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | /users | PLATFORM_ADMIN | Listar todos os usuários |
| GET | /users/:id | JWT | Obter usuário por ID |
| PUT | /users/:id | JWT (próprio ou admin) | Atualizar dados do usuário |
| DELETE | /users/:id | PLATFORM_ADMIN | Remover usuário |

### Condomínios

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /condos | PLATFORM_ADMIN | Criar condomínio |
| GET | /condos | Público | Listar condomínios ativos |
| GET | /condos/:id | Público | Detalhes do condomínio |
| PUT | /condos/:id | PLATFORM_ADMIN, CONDO_MANAGER | Atualizar condomínio |
| DELETE | /condos/:id | PLATFORM_ADMIN | Desativar condomínio |

### Fornecedores

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /suppliers | PLATFORM_ADMIN | Criar fornecedor |
| GET | /suppliers | JWT | Listar fornecedores ativos |
| GET | /suppliers/:id | Público | Detalhes + serviços do fornecedor |
| PUT | /suppliers/:id | PLATFORM_ADMIN, SUPPLIER | Atualizar fornecedor |
| DELETE | /suppliers/:id | PLATFORM_ADMIN | Desativar fornecedor |

### Serviços

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /services | PLATFORM_ADMIN, SUPPLIER | Criar serviço |
| GET | /services | JWT | Listar serviços (filtros: supplierId, category, search) |
| GET | /services/:id | Público | Detalhes do serviço |
| PUT | /services/:id | PLATFORM_ADMIN, SUPPLIER | Atualizar serviço |
| DELETE | /services/:id | PLATFORM_ADMIN, SUPPLIER | Desativar serviço |

### Pedidos

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /orders | RESIDENT | Criar pedido |
| GET | /orders | JWT | Listar pedidos (moradores veem os próprios) |
| GET | /orders/:id | JWT | Detalhes do pedido |
| PATCH | /orders/:id/status | JWT | Atualizar status do pedido |

## 4. Modelo de Negócio — Fluxo de Comissão

```
Morador faz pedido (R$ 100)
        │
        ▼
Sistema calcula:
  - totalAmount:      R$ 100,00
  - commissionRate:   10% (configurado por fornecedor)
  - commissionAmount: R$  10,00  → CondoClub
  - supplierAmount:   R$  90,00  → Fornecedor
        │
        ▼
Commission record criado com status PENDING
        │
        ▼
Após pagamento confirmado:
  Commission.status = PAID
  Commission.paidAt = now()
```

## 5. Estratégia de Escalabilidade

### Curto Prazo
- **Índices no banco**: email, role, condoId, supplierId, status (já configurados no schema)
- **Connection pooling**: PgBouncer ou Prisma Data Proxy para gerenciar conexões
- **Variáveis de ambiente**: separação dev/staging/prod

### Médio Prazo
- **Cache**: Redis para sessões de usuário e listagens frequentes (fornecedores, serviços)
- **Filas**: BullMQ para processamento assíncrono de notificações e relatórios
- **CDN**: assets estáticos do frontend via CDN (Cloudflare, CloudFront)

### Longo Prazo
- **Microserviços**: separação do serviço de pagamentos e notificações
- **Read replicas**: PostgreSQL com réplicas de leitura para queries analíticas
- **Multi-tenancy**: isolamento de dados por condomínio em schemas separados
- **Kubernetes**: orquestração de containers para alta disponibilidade

## 6. Segurança

- Autenticação via JWT com expiração configurável
- Senhas com hash bcrypt (12 rounds)
- Autorização por roles (RBAC) em todos os endpoints
- Validação de entrada com express-validator
- Tratamento centralizado de erros (sem vazamento de stack traces em produção)
- CORS configurado (restringir origins em produção)
