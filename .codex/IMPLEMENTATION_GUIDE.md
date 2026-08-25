# Guia de implementação

## Fluxo

```text
Discussão → Especificação → Implementação → Testes → Review → Merge
```

## 1. Discussão

- Confirme o problema, o resultado esperado e os limites da entrega.
- Identifique dúvidas de negócio sem preencher lacunas por suposição.
- Verifique impactos em contratos, dados, segurança e funcionalidades existentes.

## 2. Especificação

- Registre critérios de aceite e cenários de erro.
- Defina contratos HTTP, dados e comportamento visual quando aplicáveis.
- Divida a entrega em mudanças pequenas e revisáveis.
- Crie ou atualize um ADR quando houver decisão arquitetural relevante.

## 3. Implementação

- Crie uma branch a partir de `develop`.
- Procure soluções semelhantes no repositório.
- Implemente da regra central para as bordas, preservando os limites entre domínio, aplicação, HTTP, persistência e interface.
- Evite refatorações sem relação com o objetivo.

## 4. Testes

- Cubra o comportamento esperado, erros relevantes e regressões.
- Preserve os testes existentes.
- Execute `pnpm format:check`, `pnpm lint`, `pnpm test` e `pnpm build`.

## 5. Review

- Abra pull request para `develop` usando o template.
- Explique objetivo, alterações, decisões, riscos e como validar.
- Resolva comentários com commits coesos e mantenha o PR atualizado.

## 6. Merge

- Confirme CI verde, aprovação, documentação atualizada e ausência de breaking changes não planejadas.
- Faça o merge conforme a política do repositório e remova a branch quando apropriado.
