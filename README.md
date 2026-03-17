# CondoClub

Marketplace SaaS que conecta condomínios, moradores e empresas parceiras. Moradores contratam serviços pela plataforma e o CondoClub recebe comissão sobre as transações.

## Arquitetura

```
┌─────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Frontend   │────▶│  Backend (API)   │────▶│  PostgreSQL    │
│  React/Vite │     │  Node.js/Express │     │  (Prisma ORM)  │
└─────────────┘     └──────────────────┘     └────────────────┘
                             │
                    JWT Auth + bcrypt
```

### Atores
| Role | Descrição |
|------|-----------|
| `platform_admin` | Administradores da plataforma CondoClub |
| `condo_manager` | Síndico/administrador do condomínio |
| `resident` | Morador do condomínio |
| `supplier` | Empresa parceira / prestador de serviço |

## Stack Tecnológica

**Backend**
- Node.js + Express
- Prisma ORM
- PostgreSQL
- JWT + bcrypt

**Frontend**
- React 18 + Vite
- React Router v6
- Axios

## Estrutura do Projeto

```
condoclub/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── lib/
│   │   └── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
├── tests/
│   └── backend/
├── docs/
│   └── ARCHITECTURE.md
├── docker-compose.yml
└── README.md
```

## Como Executar

### Pré-requisitos
- Node.js 20+
- PostgreSQL 16+ (ou Docker)

### Com Docker

```bash
docker-compose up -d
```

### Manualmente

**Banco de dados:**
```bash
# Crie um banco PostgreSQL chamado condoclub
```

**Backend:**
```bash
cd backend
cp .env.example .env
# Edite .env com suas credenciais
npm install
npx prisma migrate dev
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API

Base URL: `http://localhost:3001/api`

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | /auth/register | — | Cadastro de usuário |
| POST | /auth/login | — | Login |
| GET | /auth/me | JWT | Perfil do usuário |
| GET | /users | admin | Listar usuários |
| GET/PUT | /users/:id | JWT | Obter/atualizar usuário |
| POST/GET | /condos | admin/JWT | Criar/listar condomínios |
| GET/PUT | /condos/:id | JWT | Obter/atualizar condomínio |
| POST/GET | /suppliers | admin/JWT | Criar/listar fornecedores |
| POST/GET | /services | JWT | Criar/listar serviços |
| POST/GET | /orders | JWT | Criar/listar pedidos |
| GET | /orders/:id | JWT | Detalhes do pedido |
| PATCH | /orders/:id/status | JWT | Atualizar status |

## Modelo de Negócio

O CondoClub retém uma comissão sobre cada pedido realizado na plataforma. A taxa de comissão é configurável por fornecedor (`commissionRate`, padrão 10%).

## Licença

MIT
