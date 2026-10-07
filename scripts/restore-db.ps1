param(
  [Parameter(Mandatory = $true)][string]$BackupFile,
  [string]$EnvFile = '.env.production',
  [string]$TargetDatabase = 'tecpel_restore_test',
  [string]$ProjectName = 'tecpel-production',
  [switch]$ConfirmRestore
)
$ErrorActionPreference = 'Stop'
if (-not $ConfirmRestore) { throw 'Informe -ConfirmRestore para confirmar a recriação do banco temporário.' }
if (-not (Test-Path -LiteralPath $BackupFile)) { throw "Backup não encontrado: $BackupFile" }
$productionDatabase = if ($EnvFile) {
  (Get-Content $EnvFile | Where-Object { $_ -match '^POSTGRES_DB=' } | Select-Object -First 1) -replace '^POSTGRES_DB=', ''
} else { $env:POSTGRES_DB }
if (-not $productionDatabase) { throw 'POSTGRES_DB não encontrado no arquivo de ambiente.' }
if ($TargetDatabase -eq $productionDatabase) { throw 'Restore direto no banco de produção é recusado por este script.' }
if ($TargetDatabase -notmatch '^[a-zA-Z0-9_]+$') { throw 'Nome do banco temporário inválido.' }
$compose = @('-p', $ProjectName, '-f', 'docker-compose.prod.yml')
if ($EnvFile) { $compose = @('--env-file', $EnvFile) + $compose }
$container = docker compose @compose ps -q postgres
if (-not $container) { throw 'O PostgreSQL de produção local não está em execução.' }
$containerFile = '/tmp/tecpel-restore.dump'
docker cp $BackupFile "${container}:${containerFile}"
docker compose @compose exec -T postgres sh -c "dropdb -U `$POSTGRES_USER --if-exists '$TargetDatabase' && createdb -U `$POSTGRES_USER '$TargetDatabase' && pg_restore -U `$POSTGRES_USER -d '$TargetDatabase' '$containerFile'"
if ($LASTEXITCODE -ne 0) { throw 'Restore falhou.' }
$migrationCount = docker compose @compose exec -T postgres sh -c "psql -U `$POSTGRES_USER -d '$TargetDatabase' -tAc 'SELECT count(*) FROM _prisma_migrations'"
docker compose @compose exec -T postgres rm -f $containerFile
Write-Host "Restore validado em '$TargetDatabase' com $($migrationCount.Trim()) migrations."
