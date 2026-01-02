$headers = @{
    'X-N8N-API-KEY' = $env:N8N_API_KEY
    'Content-Type' = 'application/json'
}

$baseUrl = 'https://n8n.wranngle.com/api/v1'

# Get all workflows
$workflows = Invoke-RestMethod -Uri "$baseUrl/workflows?limit=200" -Method GET -Headers $headers

Write-Host "=== SUPERSYSTEM WORKFLOWS ===" -ForegroundColor Cyan
$supersystemWorkflows = $workflows.data | Where-Object { $_.name -like "*Supersystem*" }

foreach ($wf in $supersystemWorkflows) {
    Write-Host "ID: $($wf.id)" -ForegroundColor Yellow
    Write-Host "  Name: $($wf.name)"
    Write-Host "  Active: $($wf.active)"
    Write-Host "  URL: https://n8n.wranngle.com/workflow/$($wf.id)/evaluation"
    Write-Host ""
}

Write-Host "Total Supersystem workflows: $($supersystemWorkflows.Count)" -ForegroundColor Green
