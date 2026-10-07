param(
  [string]$EnvFile = '.env.production',
  [string]$OutputDirectory = 'backups',
  [string]$ProjectName = 'tecpel-production'
)
$ErrorActionPreference = 'Stop'
$compose = @('-p', $ProjectName, '-f', 'docker-compose.prod.yml')
if ($EnvFile) { $compose = @('--env-file', $EnvFile) + $compose }
$container = docker compose @compose ps -q backend
if (-not $container) { throw 'O backend de produção local não está em execução.' }
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$destination = Join-Path $OutputDirectory "uploads-$timestamp"
docker cp "${container}:/app/backend/uploads/products" $destination
if ($LASTEXITCODE -ne 0) { throw 'Backup dos uploads falhou.' }
Write-Host "Backup dos uploads criado em $destination"
