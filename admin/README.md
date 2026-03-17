# Painel Administrativo — CondoClub

O painel administrativo do CondoClub será um módulo separado (ou rotas protegidas integradas ao frontend principal) acessível exclusivamente a usuários com perfil `platform_admin`.

## Estratégia de Implementação

O admin panel pode ser implementado de duas formas:

1. **Rotas admin integradas no frontend** — adicionando rotas prefixadas `/admin/*` com guard de role `PLATFORM_ADMIN` no React Router.
2. **Aplicação React separada** — um projeto Vite independente na pasta `admin/` com seu próprio `package.json`, compartilhando a mesma API backend.

## Funcionalidades Planejadas

### Gestão de Usuários
- Listar, buscar e filtrar usuários por role, condomínio ou fornecedor
- Ativar/desativar contas
- Visualizar histórico de pedidos por usuário

### Aprovação de Condomínios
- Cadastrar e gerenciar condomínios parceiros
- Associar gestores (síndicos) a condomínios
- Ativar/desativar condomínios na plataforma

### Aprovação de Fornecedores
- Revisar e aprovar novos fornecedores
- Configurar taxa de comissão por fornecedor
- Gerenciar catálogo de serviços de cada fornecedor

### Dashboard de Comissões
- Visão consolidada de todas as comissões geradas
- Filtros por período, fornecedor e status (PENDING / PAID)
- Marcar comissões como pagas
- Exportar relatórios CSV

### Analytics da Plataforma
- Volume total de pedidos e faturamento por período
- Top fornecedores por receita
- Top serviços mais contratados
- Crescimento de usuários (moradores, fornecedores, condomínios)
- Taxa de conversão e cancelamento de pedidos

## API Endpoints Admin

Todos os endpoints de admin exigem autenticação com JWT de role `PLATFORM_ADMIN`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/users?role=X | Listar usuários filtrados |
| DELETE | /api/users/:id | Remover usuário |
| POST | /api/condos | Criar condomínio |
| DELETE | /api/condos/:id | Desativar condomínio |
| POST | /api/suppliers | Criar fornecedor |
| DELETE | /api/suppliers/:id | Desativar fornecedor |
| GET | /api/orders | Ver todos os pedidos |

## Como Rodar (quando implementado)

```bash
cd admin
npm install
npm run dev
```
