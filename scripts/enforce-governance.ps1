param (
    [string]$File
)

if ([string]::IsNullOrEmpty($File)) {
    Write-Host "Usage: .\enforce-governance.ps1 <workflow-file.json>" -ForegroundColor Red
    exit 1
}

Write-Host "Running Governance Engine on $File..." -ForegroundColor Cyan
node scripts/governance-engine.js $File

if ($LASTEXITCODE -eq 0) {
    Write-Host "Governance Check: PASSED" -ForegroundColor Green
} else {
    Write-Host "Governance Check: FAILED" -ForegroundColor Red
    exit 1
}
