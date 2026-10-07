# ADR 0010 — Relatórios operacionais e CSV

## Status

Aceito.

## Decisão

Reports será um read model independente de Dashboard e Analytics. Consultas, agregações, ordenação e paginação serão executadas no PostgreSQL; o serviço aplicará visibilidade por papel e exportação.

Períodos representam datas civis completas em `America/Sao_Paulo`. Vendas históricas usam exclusivamente valores congelados em `Sale` e `SaleItem`.

CSV será a exportação inicial: UTF-8 com BOM, delimitador `;`, campos entre aspas e escaping de aspas e quebras de linha. Isso oferece boa interoperabilidade com Excel no Windows sem adicionar uma biblioteca pesada. XLSX e PDF ficam como evoluções futuras.

## Consequências

- ADMIN recebe custos, lucros e compras; VENDEDOR não recebe esses dados nem por JSON nem por CSV.
- Relatórios detalhados são paginados no banco e não carregam a base completa em memória.
- Consultas e downloads não geram auditoria.
- Dashboard, Analytics e Reports permanecem com responsabilidades distintas.
