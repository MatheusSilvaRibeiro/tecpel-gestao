# ADR 0009 — Auditoria transacional de negócio

## Status

Aceita.

## Contexto

Operações administrativas precisam responder quem agiu, quando, sobre qual registro e o que mudou. O histórico não pode afirmar que uma operação ocorreu quando a própria alteração falhou, nem armazenar dados de autenticação.

## Decisão

Criar `AuditLog` como histórico de eventos relevantes de produto, estoque manual, venda e compra. `AuditService` é a única abstração de escrita e aplica sanitização defensiva e diferenças mínimas. Cada repositório transacional registra a auditoria usando o mesmo cliente de transação da operação de negócio.

Compras geram `PURCHASE_CREATED`, sem duplicar suas movimentações automáticas como `STOCK_ENTRY`. Consultas ficam no `AuditRepository`, são exclusivas para ADMIN, filtradas no PostgreSQL e obrigatoriamente paginadas. O frontend apresenta o recurso como **Histórico de Atividades** e formata diferenças de maneira legível.

## Consequências

- falha da auditoria obrigatória desfaz a operação de negócio;
- atualizações sem mudança não geram ruído;
- dados sensíveis são removidos antes da persistência;
- índices atendem entidade/registro, usuário e ordenação temporal;
- o histórico cresce continuamente, mas retenção automática fica adiada;
- `AuditLog` não substitui logs técnicos, métricas, tracing ou observabilidade.
