# ADR 0006 — Dashboard operacional

## Status

Aceito.

## Decisão

O dashboard possui uma camada própria de leitura e expõe `GET /dashboard` para `ADMIN` e `VENDEDOR`. As métricas são calculadas diretamente no PostgreSQL por agregações, sem carregar vendas ou movimentações completas em memória.

O dia operacional e a série dos últimos sete dias usam a timezone configurável `STORE_TIMEZONE`, inicialmente `America/Sao_Paulo`. Como `DateTime` do Prisma é persistido no PostgreSQL como timestamp sem timezone, as consultas interpretam o valor armazenado como UTC antes de convertê-lo para a timezone da loja.

Estoque baixo usa a constante centralizada `LOW_STOCK_THRESHOLD`, inicialmente igual a cinco. O saldo permanece derivado da soma das movimentações e nenhum campo de estoque mínimo é adicionado ao produto.

## Autorização

A leitura interna contém receita, custo e lucro. O caso de uso remove custo e lucro da resposta de `VENDEDOR`, inclusive das vendas recentes, antes da serialização HTTP. O frontend também adapta a apresentação ao papel, mas não é a barreira de segurança.

## Consequências

- A série retorna exatamente sete dias, incluindo dias sem vendas.
- As cinco vendas mais recentes são agregadas com sua quantidade total de unidades.
- Não há cache, polling, materialized view ou novos dados de domínio.
- O dashboard acrescenta `activeProducts` à seção de estoque para diferenciar catálogo vazio de catálogo saudável na interface.
