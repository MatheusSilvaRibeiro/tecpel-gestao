# Regras de negócio conhecidas

## Relatórios

- Todo relatório exige período explícito, limitado a 366 dias e interpretado em `America/Sao_Paulo`.
- Vendas usam valores históricos congelados em `Sale` e `SaleItem`.
- VENDEDOR consulta vendas e estoque, mas nunca recebe custo, lucro ou margem.
- Compras e seus valores são exclusivos de ADMIN.
- Listagens são paginadas no banco; CSV respeita os mesmos filtros e permissões.
- Consultas e downloads não geram `AuditLog`.

## Auditoria

- Criação, alteração e desativação de produto são auditadas.
- Alterações guardam somente os campos realmente modificados; nenhuma mudança não gera evento `UPDATE`.
- Entradas manuais e ajustes registram saldo anterior, saldo posterior, quantidade e motivo ou custo aplicável.
- Compras geram somente `PURCHASE_CREATED`; suas entradas de estoque não geram auditoria redundante.
- Vendas geram `SALE_CREATED` com total, forma de pagamento e quantidade de itens.
- Operação e auditoria participam da mesma transação; falha de qualquer uma desfaz ambas.
- Senhas, hashes, JWTs, cookies, segredos, tokens e credenciais são removidos defensivamente.
- Somente ADMIN consulta o Histórico de Atividades; ações de VENDEDOR continuam auditadas.
- A listagem é ordenada da mais recente para a mais antiga, com página padrão 1, 20 registros e máximo de 100.
- `AuditLog` é histórico de negócio e não substitui logs técnicos da aplicação.

## Analytics

- Rankings de produtos usam lucro acumulado; marcas agrupam por marca.
- Margem média é `lucro total ÷ faturamento total`, nunca média simples.
- Capital investido é `estoque atual × último custo`; produto sem compra é ignorado.
- Produto parado é ativo e não teve venda nos últimos 90 dias.
- Estoque crítico possui saldo menor ou igual a 5; sem estoque possui saldo zero.
- Séries cobrem 30 dias e incluem dias sem venda com zero.
- VENDEDOR não recebe custos, lucros, capital investido nem margens.
- Insights são determinísticos e não utilizam IA.

## Compras

- Apenas ADMIN cria e consulta compras e custos.
- A compra exige ao menos um produto ativo e não aceita produtos repetidos.
- Quantidade é inteira positiva; custo unitário é decimal positivo.
- Subtotais, total e entradas de estoque são calculados e persistidos atomicamente pelo backend.
- Cada item gera uma movimentação `ENTRY` rastreável.
- A margem atual não altera custos e lucros congelados em vendas antigas.
- Compras são o fluxo principal; entrada manual permanece administrativa.

Este documento registra apenas conceitos já conhecidos. Detalhes de cálculo, validações, estados e exceções ainda dependem de definição com o negócio.

## Produtos

- O sistema gerenciará produtos dos domínios conhecidos: perfumes e cremes.
- O preço de venda deve ser positivo e é persistido como decimal.
- Produtos são desativados por soft delete e preservam todo o histórico.
- Produtos inativos continuam consultáveis, mas não recebem movimentações.
- A foto é opcional e seu arquivo fica fora do banco de dados.

## Estoque

- O estoque atual é calculado pela soma das movimentações; não há saldo armazenado no produto.
- `ENTRY` registra quantidade positiva e custo unitário positivo obrigatório.
- `ADJUSTMENT` registra um delta positivo ou negativo, diferente de zero, com motivo obrigatório.
- Nenhuma movimentação pode resultar em estoque negativo.
- O custo unitário pertence à entrada; cálculo de custo médio e lucro permanece fora desta milestone.

## Permissões de produtos e estoque

- `ADMIN` cria, edita e desativa produtos, além de registrar entradas e ajustes.
- `ADMIN` e `VENDEDOR` consultam produtos e estoque.
- `VENDEDOR` não executa operações de escrita nesses módulos.

## Vendas

- O sistema permitirá registrar vendas de produtos.
- Condições de pagamento, cancelamento, descontos e demais detalhes ainda não estão definidos.

## Resultados

- O sistema apresentará um dashboard com informações consolidadas.
- O lucro deverá poder ser consultado por produto.
- A fórmula, o momento de reconhecimento e o tratamento de custos ainda precisam ser validados antes da implementação.

Nenhuma suposição além destas regras deve ser convertida em código sem discussão e especificação.
