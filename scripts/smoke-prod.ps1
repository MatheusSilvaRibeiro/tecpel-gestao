param([int]$Port = 8080, [string]$Username, [string]$Password)
$ErrorActionPreference = 'Stop'
$baseUrl = "http://127.0.0.1:$Port"
$frontend = Invoke-WebRequest -UseBasicParsing "$baseUrl/"
$health = Invoke-RestMethod "$baseUrl/api/health"
$ready = Invoke-RestMethod "$baseUrl/api/ready"
if ($frontend.StatusCode -ne 200 -or $health.status -ne 'ok' -or $ready.status -ne 'ok') { throw 'Smoke test falhou.' }
if ($Username -and $Password) {
  $loginBody = @{ username = $Username; password = $Password } | ConvertTo-Json
  $login = Invoke-WebRequest -UseBasicParsing -Method Post -ContentType 'application/json' -Body $loginBody "$baseUrl/api/auth/login"
  if ($login.StatusCode -ne 200 -or -not $login.Headers['Set-Cookie']) { throw 'Smoke test de login falhou.' }
}
Write-Host 'Smoke test aprovado: frontend, health, readiness e login configurado respondendo.'
