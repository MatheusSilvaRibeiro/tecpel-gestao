# Deploy e operação

## Auditoria inicial

Antes desta sprint, o Compose era exclusivamente de desenvolvimento: publicava o PostgreSQL, montava código-fonte, iniciava Vite e executava migration e seed automaticamente. O seed possuía credencial padrão; uploads dependiam de bind mount local; não havia Compose de produção, readiness do banco, encerramento gracioso, rate limit no login, logs HTTP estruturados, backup/restore ou validação das imagens na CI. A imagem final do backend também carregava a árvore de dependências de desenvolvimento. Helmet, cookie HttpOnly, CORS por origem, validação Zod parcial, migrations Prisma e healthcheck já estavam saudáveis e foram preservados.

## Topologia

```text
Internet -> HTTPS/reverse proxy -> Nginx (SPA + /api) -> Express -> PostgreSQL
                                      |                    |
                                      |                    +-> postgres_data
                                      +-----------------------> product_uploads
```

HTTPS e certificados pertencem ao proxy/provedor externo. `TRUST_PROXY_HOPS=1` é adequado quando existe exatamente um proxy confiável entre cliente e Express; ajuste somente conforme a topologia real. O PostgreSQL não publica porta no Compose de produção.

## Antes do primeiro deploy

- Instale Docker Engine/Desktop com Compose v2.
- Copie `.env.example` para `.env.production`, remova as variáveis exclusivas de desenvolvimento e defina `POSTGRES_DB`, `POSTGRES_USER`, uma senha exclusiva, `DATABASE_URL` apontando para o host `postgres` (aplique URL encoding às credenciais), `JWT_SECRET` aleatório com ao menos 32 caracteres, `CORS_ORIGIN`, `APP_VERSION` e a porta pública.
- Restrinja a leitura de `.env.production`; ele nunca deve ser versionado.
- Confirme espaço e estratégia externa para cópias de `postgres_data`, `product_uploads` e `backups/`.
- Configure domínio e HTTPS no reverse proxy quando a instalação for exposta à internet.

Valide a configuração sem subir serviços:

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
```

## Primeiro deploy

Migrations são um passo explícito e único. Produção usa `prisma migrate deploy`; nunca use `migrate dev` ou `db push`.

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml up -d postgres
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tools run --rm migrate
docker compose --env-file .env.production -f docker-compose.prod.yml up -d backend frontend
```

Crie o primeiro ADMIN apenas uma vez. Defina temporariamente as quatro variáveis `BOOTSTRAP_ADMIN_*` no ambiente ou no arquivo protegido, execute e remova-as em seguida. A senha exige 12 caracteres, não é impressa e o comando recusa execução quando já existe ADMIN.

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml --profile tools run --rm bootstrap-admin
```

Não execute `prisma:seed` em produção; o próprio seed recusa `NODE_ENV=production`.

## Verificação

```powershell
docker compose --env-file .env.production -f docker-compose.prod.yml ps
./scripts/smoke-prod.ps1 -Port 8080
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail 100 backend
```

`GET /health` comprova que o processo está vivo e retorna somente status e versão pública. `GET /ready` consulta o PostgreSQL e retorna 503 quando a dependência não está pronta. Depois, faça login e verifique dashboard, produto com imagem e persistência após `docker compose down` seguido de `up -d`. `down` preserva volumes; `down --volumes` apaga dados e não deve ser usado em produção.

## Backup e restore

O backup do banco usa `pg_dump` custom format e timestamp; o de uploads copia os arquivos para o host. Transfira ambos para mídia/local externo ao servidor e aplique retenção apropriada.

```powershell
./scripts/backup-db.ps1 -EnvFile .env.production
./scripts/backup-uploads.ps1 -EnvFile .env.production
```

Teste periodicamente o restore em banco temporário. O script exige intenção explícita, recusa o nome do banco de produção, recria somente o banco temporário e valida a tabela de migrations:

```powershell
./scripts/restore-db.ps1 -EnvFile .env.production -BackupFile backups/tecpel-AAAA-MM-DD-HHMMSS.dump -TargetDatabase tecpel_restore_test -ConfirmRestore
```

Para validar uploads, copie o diretório de backup para uma instalação temporária e confira assinatura e abertura de uma amostra de imagens. Restaurar o volume real é uma operação manual: pare o backend, preserve uma cópia do volume atual, copie o backup validado e só então reinicie.

## Atualização

1. Faça e valide backups de banco e uploads.
2. Baixe a tag/commit aprovado.
3. Construa as imagens.
4. Execute `migrate` uma única vez.
5. Recrie backend e frontend com `up -d`.
6. Confira `/health`, `/ready`, smoke test, login, dashboard, uploads e logs.

Migrations não são assumidas como reversíveis. Para rollback do código, volte à imagem/tag anterior. Rollback do banco é um problema separado: avalie compatibilidade e, quando necessário, restaure um backup validado em janela controlada. Nunca execute migration reversa ou restore destrutivo automaticamente.

## Segurança e limitações

Em produção, o cookie é HttpOnly, Secure e SameSite=Strict; em desenvolvimento permanece HttpOnly, sem Secure e SameSite=Lax. CORS aceita apenas `CORS_ORIGIN`. O JSON tem limite configurável, uploads preservam seu limite e validação existentes, e Helmet fornece headers básicos. Logs JSON contêm método, caminho, status, duração e request id, mas nunca corpo, cookie, Authorization ou JWT. Erros inesperados recebem resposta genérica sem stack.

O rate limit de login é local à memória do processo. Ele é adequado à implantação atual de uma instância; uma futura escala horizontal exigirá armazenamento compartilhado. Backups, TLS, monitoramento externo, rotação de logs e alertas dependem da operação do ambiente e continuam sob responsabilidade do mantenedor.
