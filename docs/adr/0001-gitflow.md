# ADR 0001 — Git Flow

- **Status:** Aceito
- **Data:** 2026-08-25

## Contexto

O projeto precisa separar o desenvolvimento contínuo das versões estáveis e manter um fluxo previsível para features, correções e releases.

## Decisão

Adotar Git Flow de forma enxuta:

- `main` representa versões estáveis.
- `develop` integra o trabalho da próxima versão.
- `feature/*` nasce de `develop` e retorna por pull request.
- `release/*` e `hotfix/*` serão usados quando o ciclo de entrega exigir.
- Commits seguem Conventional Commits.

## Consequências

- Features são revisadas antes de entrar em `develop`.
- A publicação em `main` fica protegida do trabalho incompleto.
- O fluxo adiciona disciplina e algum custo de manutenção de branches.
- A equipe deve evitar branches longas para reduzir conflitos.
