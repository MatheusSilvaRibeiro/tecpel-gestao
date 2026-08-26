# TecPel Gestão

Sistema web responsivo para gestão de perfumes e cremes da TecPel. O MVP abrangerá produtos, estoque, vendas, lucro real, dashboard e histórico.

## Início rápido com Docker

```bash
cp .env.example .env
docker compose up --build
```

Depois que os serviços estiverem saudáveis:

- Aplicação: http://localhost:5173
- API: http://localhost:3333
- Saúde da API: http://localhost:3333/health

Para encerrar, use `docker compose down`. Os dados do PostgreSQL permanecem no volume `postgres_data`.

Antes do primeiro acesso autenticado, aplique a migration e execute o seed idempotente:

```bash
docker compose exec backend pnpm --filter @tecpel/backend prisma:deploy
docker compose exec backend pnpm --filter @tecpel/backend prisma:seed
```

O seed cria o administrador de desenvolvimento definido no `.env.example`. Troque a senha e o `JWT_SECRET` em qualquer ambiente compartilhado ou de produção.

## Desenvolvimento local

```bash
pnpm install
pnpm --filter @tecpel/backend prisma:generate
pnpm dev
```

## Autenticação da API

- `POST /auth/login`: recebe `username` e `password` e cria um cookie JWT HttpOnly.
- `GET /auth/me`: retorna o usuário da sessão válida.
- `POST /auth/logout`: remove o cookie de autenticação.

O cliente web deve enviar requests com credenciais. O token não é retornado no body e não deve ser salvo em `localStorage`.

## Autenticação no frontend

A rota `/login` autentica pela API e o cookie HttpOnly permanece sob controle do navegador. A sessão é restaurada por `/auth/me` e mantida no cache do TanStack Query, sem armazenar JWT em `localStorage` ou `sessionStorage`.

- `/login`: rota pública exclusiva para usuários sem sessão.
- `/dashboard`: rota protegida e placeholder da futura área de indicadores.
- Logout: encerra a sessão remota, limpa o cache local e retorna ao login.

Para executar os testes do fluxo de autenticação no frontend:

```bash
pnpm --filter @tecpel/frontend test
```

## Testes de integração

A suíte de integração usa Testcontainers para iniciar um PostgreSQL 17 isolado e descartável, aplica a migration real e valida Prisma, persistência, autenticação e seed. Docker deve estar em execução.

```bash
pnpm --filter @tecpel/backend test:integration
```

O banco de desenvolvimento não é acessado. O container e seus dados são removidos automaticamente ao final da suíte.

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para os comandos e padrões do projeto. A visão do MVP está em [docs/vision.md](docs/vision.md) e as decisões técnicas em [docs/architecture.md](docs/architecture.md).
