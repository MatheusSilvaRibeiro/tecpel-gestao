param(
  [string]$EnvFile = '.env.production',
  [string]$OutputDirectory = 'backups',
  [string]$ProjectName = 'tecpel-production'
)
$ErrorActionPreference = 'Stop'
$compose = @('-p', $ProjectName, '-f', 'docker-compose.prod.yml')
if ($EnvFile) { $compose = @('--env-file', $EnvFile) + $compose }
$container = docker compose @compose ps -q postgres
if (-not $container) { throw 'O PostgreSQL de produção local não está em execução.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$containerFile = "/tmp/tecpel-$timestamp.dump"
$hostFile = Join-Path $OutputDirectory "tecpel-$timestamp.dump"
docker compose @compose exec -T postgres sh -c "pg_dump -U `$POSTGRES_USER -d `$POSTGRES_DB -Fc -f '$containerFile'"
if ($LASTEXITCODE -ne 0) { throw 'pg_dump falhou.' }
docker cp "${container}:${containerFile}" $hostFile
docker compose @compose exec -T postgres rm -f $containerFile
Write-Host "Backup criado em $hostFile"
