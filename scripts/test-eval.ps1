$body = @{
    limit = 100
    batch_size = 4
    target_webhook = 'https://n8n.wranngle.com/webhook/client-lookup-test'
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri 'https://n8n.wranngle.com/webhook/parallel-eval-runner' -Method POST -Body $body -ContentType 'application/json' -TimeoutSec 120

$result | ConvertTo-Json -Depth 10 | Out-File 'D:\Things\Work\Wranngle\n8n_workflow_development\scripts\eval-results.json'

Write-Host "=== RESULTS ==="
Write-Host "Total: $($result.summary.total_tests)"
Write-Host "Passed: $($result.summary.passed)"
Write-Host "Failed: $($result.summary.failed)"
Write-Host "Pass Rate: $($result.summary.pass_rate)"
