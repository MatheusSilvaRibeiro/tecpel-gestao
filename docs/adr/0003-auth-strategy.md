# ADR 0003 — Estratégia de autenticação

- **Status:** Aceito
- **Data:** 2026-08-25

## Contexto

O backend precisa autenticar usuários em uma aplicação web sem expor credenciais ou tokens ao JavaScript do navegador. A primeira entrega prevê login por username, consulta da sessão, logout e bloqueio de usuários inativos, sem fluxo de renovação ou recuperação de senha.

## Decisão

Adotar JWT assinado, com expiração inicial de 8 horas e payload limitado ao identificador do usuário em `sub`. O token será armazenado em cookie HttpOnly, `SameSite=Lax`, `Path=/` e `Secure` em produção. O login usa `username` e senha protegida por bcrypt com cost factor 12.

O middleware consulta o usuário a cada request protegido para confirmar existência e estado ativo. O logout remove o cookie. Não haverá refresh token nem blacklist de JWT inicialmente.

## Consequências

- O token não fica disponível para `localStorage` nem é retornado no body.
- O frontend deverá usar requests com credenciais e o backend deverá permitir credenciais no CORS para a origem configurada.
- Desativar ou remover um usuário invalida seu acesso nas próximas requisições protegidas, mesmo antes do JWT expirar.
- Sem refresh token, o usuário precisa autenticar novamente após a expiração.
- O logout não invalida uma cópia externa do JWT; esse risco é aceito nesta fase pela curta duração e pelo cookie HttpOnly.
