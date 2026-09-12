# ADR 0008 — Analytics como modelo de leitura separado

## Status

Aceita.

## Decisão

Criar o módulo `analytics` com `AnalyticsRepository`, `AnalyticsService` e casos de uso pequenos. A implementação Prisma usa agregações e séries temporais no PostgreSQL. O serviço gera insights determinísticos e remove campos financeiros para VENDEDOR antes da resposta HTTP.

Dashboard e produto consomem esse modelo de leitura; vendas, compras e estoque preservam suas responsabilidades transacionais.

## Consequências

- consultas são otimizadas para leitura e não alteram dados;
- autorização financeira fica centralizada no serviço;
- dias sem movimento são materializados com valor zero;
- não há cache nesta etapa;
- previsões, IA, exportação e notificações ficam fora do escopo.
