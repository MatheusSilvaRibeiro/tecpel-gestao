# Contexto do projeto

## Objetivo do sistema

O TecPel Gestão é uma aplicação web responsiva para centralizar a gestão de perfumes e cremes. O MVP contempla produtos, estoque, vendas, custos, preços, dashboard e lucro por produto.

## Stack

- Monorepo com pnpm e TypeScript.
- Frontend: React, Vite, React Router, TanStack Query, Tailwind CSS e shadcn/ui.
- Backend: Node.js, Express, Zod e Prisma.
- Dados: PostgreSQL.
- Ambiente: Docker e Docker Compose.
- Qualidade: ESLint, Prettier, Vitest, Supertest e CI.

## Arquitetura

O frontend é uma SPA e consome exclusivamente a API HTTP. O backend recebe e valida requisições, coordenará casos de uso e acessará o PostgreSQL pelo Prisma. Regras de negócio devem ficar isoladas de React, Express e Prisma. Consulte `docs/architecture.md` e os ADRs.

## Filosofia

- Evoluir de forma incremental e orientada por requisitos confirmados.
- Preferir soluções simples e explícitas.
- Manter separação de responsabilidades sem abstrações prematuras.
- Preservar rastreabilidade, tipagem e testes.
- Não inventar regras de negócio.

## Implementação de novas funcionalidades

1. Leia o charter, as regras de negócio, a arquitetura e ADRs relacionados.
2. Procure implementações e padrões semelhantes antes de criar código.
3. Especifique comportamento, contratos, critérios de aceite e impactos.
4. Implemente a menor mudança coerente com os limites arquiteturais.
5. Adicione testes no nível adequado e preserve todos os existentes.
6. Execute formatação, lint, testes e build.
7. Atualize documentação e ADRs quando a mudança afetar contratos ou decisões.
8. Abra pull request para `develop` com riscos e decisões explícitos.
