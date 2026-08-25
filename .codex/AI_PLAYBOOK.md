# Playbook para agentes de IA

## Antes de agir

1. Leia `PROJECT_CONTEXT.md`, a documentação relevante e os ADRs.
2. Inspecione o estado do Git e preserve alterações do usuário.
3. Antes de criar código novo, verifique se já existe implementação semelhante.
4. Confirme que a mudança pertence ao escopo solicitado.

## Regras obrigatórias

- Nunca alterar regras de negócio sem solicitação.
- Nunca remover testes existentes.
- Nunca quebrar a arquitetura existente.
- Priorizar simplicidade.
- Evitar duplicação.
- Atualizar documentação quando necessário.
- Antes de criar código novo, verificar se já existe implementação semelhante.

## Durante a implementação

- Não invente requisitos para preencher lacunas.
- Preserve funcionalidades, contratos e estilo existentes.
- Faça mudanças pequenas, coesas e fáceis de revisar.
- Não introduza dependência, camada ou abstração sem necessidade concreta.
- Registre decisões arquiteturais relevantes em ADR.
- Não exponha segredos, dados pessoais ou credenciais.

## Validação e entrega

- Revise o diff completo e remova apenas artefatos criados pela tarefa.
- Execute `pnpm format:check`, `pnpm lint`, `pnpm test` e `pnpm build`.
- Informe claramente validações executadas, limitações e riscos restantes.
- Use Conventional Commits e abra pull request para `develop`.
