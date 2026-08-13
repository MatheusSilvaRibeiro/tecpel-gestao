# Arquitetura

## Visão geral

O projeto usa um monorepo pnpm simples, sem ferramenta adicional de orquestração.

```text
tecpel-gestao/
├── backend/     API HTTP e acesso a dados
├── frontend/    aplicação web responsiva
├── docs/        decisões e visão do produto
└── .github/     automação de integração contínua
```

## Componentes

### Frontend

React, Vite e TypeScript formam a aplicação cliente. React Router organiza a navegação, TanStack Query fará a sincronização dos dados da API, React Hook Form e Zod serão usados nos formulários e Tailwind CSS na interface. Recharts e a configuração do shadcn/ui já estão disponíveis, mas serão adotados apenas quando as funcionalidades pedirem.

### Backend

Node.js, Express e TypeScript formam a API. Zod valida dados e configurações. Prisma será a camada de acesso ao PostgreSQL. Vitest e Supertest cobrem testes unitários e HTTP.

### Dados

PostgreSQL é o banco relacional. A Sprint 0 configura a conexão, mas não cria modelos de negócio nem migrações vazias.

## Execução

Em desenvolvimento, Docker Compose inicia frontend, backend e PostgreSQL, com atualização automática do código e verificações de saúde. Localmente, os dois aplicativos também podem ser iniciados por pnpm.

## Limites iniciais

- O frontend acessa somente a API HTTP; não acessa o banco diretamente.
- Regras de negócio ficarão no backend, separadas da camada HTTP à medida que forem criadas.
- Credenciais reais nunca são versionadas.
- Mudanças de esquema serão registradas por migrações do Prisma.
