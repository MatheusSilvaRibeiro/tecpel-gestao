# ADR 0007 — Compras como origem primária de entradas de estoque

## Status

Aceita.

## Decisão

Uma compra é persistida atomicamente com seus itens e uma movimentação `ENTRY` por item. `StockMovement.purchaseItemId` estabelece uma relação opcional um-para-um e torna a entrada rastreável. O saldo continua sendo derivado da soma das movimentações.

Valores financeiros usam `Decimal`; subtotais e total são calculados pelo backend. A entrada manual permanece disponível como recurso administrativo de transição, enquanto compras passam a ser o fluxo principal.

## Consequências

- falhas não deixam compra ou estoque parciais;
- o histórico suporta custo atual e análises futuras;
- a relação opcional preserva compatibilidade com entradas manuais antigas;
- cancelamento, devolução, fornecedores completos e contas a pagar ficam fora desta decisão.
