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

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para os comandos e padrões do projeto. A visão do MVP está em [docs/vision.md](docs/vision.md) e as decisões técnicas em [docs/architecture.md](docs/architecture.md).
