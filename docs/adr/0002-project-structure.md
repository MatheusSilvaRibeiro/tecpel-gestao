# ADR 0002 — Estrutura do projeto

- **Status:** Aceito
- **Data:** 2026-08-25

## Contexto

Frontend e backend compartilham TypeScript, ferramentas e ciclo de entrega, mas têm responsabilidades e processos de build independentes. A base deve crescer sem antecipar módulos ainda inexistentes.

## Decisão

Manter um monorepo pnpm com pacotes `frontend/` e `backend/`. A documentação permanece em `docs/`, orientações para agentes em `.codex/` e automações em `.github/`.

Novas features serão organizadas por responsabilidade. No backend, transporte HTTP, aplicação, domínio e infraestrutura serão separados à medida que casos reais surgirem. No frontend, páginas, componentes, integração HTTP e utilitários permanecerão desacoplados. O frontend acessará dados exclusivamente pela API.

## Consequências

- Scripts e dependências podem ser gerenciados a partir da raiz.
- Os limites entre interface, API e banco ficam explícitos.
- A estrutura evolui incrementalmente, evitando pastas e abstrações vazias.
- Mudanças compartilhadas exigem atenção aos builds dos dois pacotes.
