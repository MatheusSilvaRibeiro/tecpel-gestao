# Regras de negócio conhecidas

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
