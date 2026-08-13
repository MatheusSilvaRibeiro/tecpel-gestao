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

## Desenvolvimento local

```bash
pnpm install
pnpm --filter @tecpel/backend prisma:generate
pnpm dev
```

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para os comandos e padrões do projeto. A visão do MVP está em [docs/vision.md](docs/vision.md) e as decisões técnicas em [docs/architecture.md](docs/architecture.md).
