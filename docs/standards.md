# Padrões do projeto

## Git e commits

- Use branches curtas criadas a partir de `develop`: `feature/<nome>`, `fix/<nome>` ou `chore/<nome>`.
- Adote Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:` e `ci:`.
- Mantenha cada commit coeso e não misture refatorações sem relação com a entrega.
- Abra pull request para `develop`; `main` representa versões estáveis.

## Estrutura de pastas

- `frontend/`: interface e integração HTTP do cliente.
- `backend/`: API, aplicação, domínio e infraestrutura.
- `backend/tests/`: testes que atravessam a interface HTTP.
- `docs/`: visão, regras, arquitetura e decisões.
- `.codex/`: contexto operacional para desenvolvedores e agentes.

Novas subdivisões devem refletir uma responsabilidade real. Evite diretórios genéricos sem propósito claro.

## Nomeação

- Componentes, classes e tipos: `PascalCase`.
- Funções, variáveis e arquivos utilitários: `camelCase`.
- Componentes React: arquivo em `PascalCase.tsx`.
- Constantes realmente globais: `UPPER_SNAKE_CASE`.
- Testes: `<assunto>.test.ts` ou `<assunto>.test.tsx`.
- Use nomes em inglês no código e português na documentação e nos textos da interface.

## Design e qualidade

- Aplique SOLID quando ele reduzir acoplamento ou melhorar testabilidade; evite abstrações antecipadas.
- Mantenha funções pequenas, nomes explícitos e fluxo de controle simples.
- Separe regra de negócio de framework, transporte e persistência.
- Faça dependências apontarem para contratos estáveis do domínio/aplicação quando a separação for necessária.
- Prefira composição, retornos antecipados e uma única fonte para cada regra.
- Não duplique lógica: extraia somente quando a repetição e o conceito compartilhado estiverem claros.

## Testes

- Coloque testes HTTP e de integração do backend em `backend/tests/`.
- Mantenha testes unitários próximos da unidade quando isso facilitar manutenção.
- Espelhe a organização do código nos testes e descreva comportamento, não detalhes internos.
- Toda correção deve incluir um teste de regressão quando aplicável.
- Testes devem ser determinísticos e independentes de ordem ou serviços externos não controlados.

## Formatação e validação

- TypeScript deve permanecer em modo estrito conforme as configurações do projeto.
- Prettier é a referência de formatação; ESLint é a referência de análise estática.
- Antes do PR, execute `pnpm format:check`, `pnpm lint`, `pnpm test` e `pnpm build`.
- Não versione credenciais, arquivos `.env`, artefatos de build ou logs temporários.

## Boas práticas

- Valide entradas nas fronteiras da aplicação.
- Preserve contratos e compatibilidade; breaking changes exigem discussão explícita.
- Trate erros de forma consistente sem expor dados sensíveis.
- Registre decisões arquiteturais relevantes em ADRs.
- Atualize documentação quando comportamento, contrato ou arquitetura mudar.
