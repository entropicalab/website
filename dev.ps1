# ============================================================
# entrópica · local dev launcher (PowerShell)
# ------------------------------------------------------------
# right-click this file → "Run with PowerShell" to start the
# dev server. handles the windows tls cert workaround.
# ============================================================

Set-Location -LiteralPath $PSScriptRoot
$env:NODE_EXTRA_CA_CERTS = Join-Path $PSScriptRoot "..\.windows-ca.pem"

Write-Host ""
Write-Host " entrópica dev server"
Write-Host " ----------------------------------------"
Write-Host " english: http://localhost:4321"
Write-Host " spanish: http://localhost:4321/es"
Write-Host " ----------------------------------------"
Write-Host " press ctrl+c to stop."
Write-Host ""

npm run dev
