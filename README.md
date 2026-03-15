CondoClub

Plataforma de clube de compras privado para moradores de condomínios, conectando residentes a fornecedores locais com ofertas exclusivas e entregas programadas.

O objetivo do CondoClub é centralizar demanda de moradores e gerar descontos coletivos, criando valor tanto para consumidores quanto para fornecedores.

Visão do Produto

Problema:

Moradores de condomínio compram produtos e serviços de forma isolada, sem aproveitar o poder de compra coletivo.

Solução:

O CondoClub cria um marketplace privado por condomínio, onde moradores podem:

acessar ofertas exclusivas

comprar coletivamente

agendar entregas no condomínio

contratar serviços locais

Fornecedores ganham:

acesso direto a dezenas ou centenas de clientes

redução de custo de aquisição

vendas recorrentes

Principais Funcionalidades (MVP)

Moradores

cadastro e login

associação ao condomínio

visualização de ofertas

compra de produtos

acompanhamento de pedidos

Fornecedores

cadastro de loja

publicação de ofertas

gestão de pedidos

histórico de vendas

Admin

gestão de usuários

gestão de condomínios

aprovação de fornecedores

análise de vendas

Arquitetura do Sistema

Arquitetura baseada em camadas separadas:

Frontend | v API Gateway / Backend | v Serviços de Aplicação | v Banco de Dados

Stack sugerida:

Frontend

React / Next.js

TailwindCSS

Axios

Backend

Node.js

Express

JWT authentication

Banco de dados

PostgreSQL

Infraestrutura

Docker

AWS / Vercel / Railway

Estrutura do Projeto condoclub │ ├── backend │ ├── controllers │ ├── routes │ ├── services │ ├── middleware │ ├── models │ └── server.js │ ├── frontend │ ├── components │ ├── pages │ ├── services │ └── styles │ ├── database │ └── schema.sql │ └── README.md Banco de Dados

Modelo relacional.

Principais entidades:

Users Condos Suppliers Products Orders Order_Items Tabela Users id name email password role condo_id created_at

roles possíveis

resident

supplier

admin

Tabela Condos id name address city state created_at Tabela Suppliers id name description contact_email phone created_at Tabela Products id supplier_id name description price stock created_at Tabela Orders id user_id status total_price created_at

status possíveis

pending paid delivered cancelled Tabela Order_Items id order_id product_id quantity price API

API REST.

Base URL:

/api Auth POST /api/auth/register

Body:

{ "name": "Leonardo", "email": "leo@email.com", "password": "123456" } POST /api/auth/login

Retorna:

token JWT Usuários GET /api/users

Lista usuários.

GET /api/users/:id

Retorna usuário específico.

Produtos GET /api/products

Lista produtos.

POST /api/products

Criar produto.

Pedidos POST /api/orders

Criar pedido.

GET /api/orders/:id

Detalhes do pedido.

Fluxo de Compra

Usuário cria conta

Usuário entra no condomínio

Usuário visualiza ofertas

Usuário adiciona produtos ao carrinho

Usuário finaliza pedido

Fornecedor recebe pedido

Entrega é feita no condomínio

Segurança

Medidas implementadas:

autenticação JWT

hash de senha com bcrypt

validação de dados

middleware de autorização

controle de acesso por role

Roadmap do Produto Fase 1 — MVP

cadastro de usuários

cadastro de fornecedores

listagem de produtos

sistema de pedidos

painel admin básico

Fase 2 — Escala

pagamentos integrados

logística de entrega

notificações

sistema de avaliação

Fase 3 — Plataforma

aplicativo mobile

IA para recomendação de ofertas

integração com síndicos

compras coletivas automáticas

Modelo de Monetização

Possíveis fontes de receita:

1 Comissão sobre vendas

exemplo

10% por pedido

2 Assinatura do fornecedor

R$99 / mês

3 Destaque de ofertas

boost de visibilidade Instalação

Backend

cd backend npm install npm run dev

Frontend

cd frontend npm install npm start Contribuição

Pull requests são bem-vindos.

Fluxo recomendado:

feature branch pull request code review merge Licença

MIT License.
