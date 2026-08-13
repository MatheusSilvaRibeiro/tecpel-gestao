# Contribuindo

## Requisitos

- Node.js 22 ou superior
- pnpm 11
- Docker com Docker Compose

## Preparação

```bash
cp .env.example .env
pnpm install
pnpm --filter @tecpel/backend prisma:generate
```

Para iniciar sem Docker, use `pnpm dev`. Para subir todo o ambiente de desenvolvimento, use `docker compose up --build`.

## Comandos

| Comando       | Finalidade                                   |
| ------------- | -------------------------------------------- |
| `pnpm dev`    | Inicia frontend e backend em desenvolvimento |
| `pnpm lint`   | Verifica todos os pacotes                    |
| `pnpm test`   | Executa testes do backend                    |
| `pnpm build`  | Compila todos os pacotes                     |
| `pnpm format` | Formata os arquivos do projeto               |

## Fluxo de trabalho

Crie branches curtas a partir de `main`. Use nomes como `feat/produtos` ou `fix/saldo-estoque`. Os commits devem seguir Conventional Commits, por exemplo: `feat: adiciona cadastro de produto` e `fix: corrige cálculo do estoque`.

O hook de pre-commit executa lint e formatação somente nos arquivos preparados para commit.

## Definition of Done

- Código implementado e tipado.
- Testes relevantes criados e passando.
- Lint e builds passando.
- API documentada quando houver mudança de contrato.
- Interface responsiva quando houver mudança visual.
- Sem logs temporários ou TODOs sem issue associada.
- Mudança revisada.
