# Coding Standards

As regras gerais estão em `docs/standards.md`. Este guia detalha práticas por aplicação.

## Backend

- Controllers e rotas tratam HTTP; não concentram regras de negócio.
- Casos de uso coordenam o fluxo da aplicação e dependem de contratos explícitos.
- Domínio não importa Express, Prisma ou detalhes de infraestrutura.
- Prisma fica na infraestrutura; não exponha seus tipos como contrato HTTP sem decisão explícita.
- Valide entradas e ambiente com Zod nas fronteiras.
- Retorne códigos HTTP e erros consistentes, sem detalhes sensíveis.
- Prefira injeção explícita de dependências quando ela melhorar isolamento e testes.
- Use testes unitários para regras e testes com Supertest para contratos HTTP.

Estrutura de referência, criada somente quando necessária:

```text
backend/src/
├── domain/
├── application/
├── infrastructure/
├── http/
└── config/
```

## Frontend

- Componentes devem ter responsabilidade clara e props tipadas.
- Páginas coordenam composição e navegação; componentes reutilizáveis evitam conhecimento de rota.
- Centralize acesso HTTP e contratos; não espalhe `fetch` por componentes.
- Use TanStack Query para estado remoto e estado local apenas para interação de interface.
- Use React Hook Form e Zod em formulários quando houver validação.
- Priorize componentes do shadcn/ui e padrões visuais existentes antes de criar variantes.
- Garanta estados de carregamento, vazio, erro e sucesso, além de acessibilidade e responsividade.
- Teste comportamento observável em vez de detalhes internos.

Estrutura de referência, criada somente quando necessária:

```text
frontend/src/
├── components/
├── pages/
├── services/
├── hooks/
├── schemas/
└── lib/
```

## Regras compartilhadas

- Use TypeScript estrito; evite `any` e coerções inseguras.
- Prefira nomes em inglês no código.
- Não duplique contratos manualmente sem uma estratégia definida.
- Não deixe logs temporários, código morto ou TODO sem issue associada.
