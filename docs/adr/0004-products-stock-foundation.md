# ADR 0004 — Produtos e fundação de estoque

## Status

Aceito.

## Contexto

Produtos precisam de catálogo, imagem opcional e saldo rastreável. Custos serão usados futuramente no cálculo de resultados, mas vendas e lucro não pertencem a esta entrega.

## Decisão

- Produto usa soft delete por `active`.
- Estoque é a soma de `StockMovement.quantity`; não existe saldo mutável em `Product`.
- `ENTRY` é positiva e possui `unitCost`; `ADJUSTMENT` é um delta não nulo com motivo.
- Validação de saldo e criação da movimentação ocorrem em transação serializável.
- Valores monetários usam `Decimal(10,2)` no PostgreSQL e string decimal no JSON.
- Imagens ficam no filesystem local, com UUID, limite de 5 MB, lista de formatos e validação de assinatura. O banco guarda somente a URL.
- Autorização por role é middleware reutilizável: ADMIN escreve; ADMIN e VENDEDOR leem.

## Consequências

O histórico é a fonte de verdade e permanece íntegro após desativação. A soma tem custo proporcional ao histórico, aceitável para o MVP. Arquivos locais exigem volume persistente no Docker e não escalam horizontalmente sem armazenamento compartilhado. Arquivos antigos substituídos podem permanecer no disco nesta versão.
