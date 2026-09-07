# ADR 0005 — Vendas e custo médio ponderado

## Status

Aceito.

## Decisão

Uma venda é persistida com seus itens e movimentos de estoque `SALE` em uma transação PostgreSQL serializável. Cada item congela preço, custo médio, subtotal e lucro; vendas antigas nunca são recalculadas.

O custo médio é reconstruído cronologicamente pelas movimentações. Entradas adicionam quantidade pelo custo informado, vendas retiram valor pelo custo congelado e ajustes adicionam ou retiram quantidade pelo custo médio vigente. O movimento `SALE` armazena o custo usado para permitir a reconstrução correta após novas entradas.

`ADMIN` e `VENDEDOR` podem criar e consultar vendas. Somente `ADMIN` pode alterar o preço do item; para `VENDEDOR`, qualquer preço recebido é ignorado e o preço cadastrado é usado.

## Consequências

- O saldo continua derivado das movimentações, sem coluna mutável no produto.
- Uma falha em produto, estoque, item ou movimento desfaz toda a venda.
- Ajustes sem custo adotam o custo médio vigente.
- A reconstrução possui custo proporcional ao histórico do produto; snapshots ficam adiados até existir necessidade medida.
- Cancelamento, devolução, clientes, cupons, parcelamento e emissão fiscal não fazem parte desta decisão.
