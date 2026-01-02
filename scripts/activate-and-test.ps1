$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g"
$baseUrl = "https://n8n.wranngle.com/api/v1/workflows"
$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Step 1: Activate workflow
Write-Host "=========================================="
Write-Host "STEP 1: ACTIVATING WORKFLOW"
Write-Host "=========================================="
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/ivmwEUUdVJl8mQmh/activate" -Method POST -Headers $headers
    Write-Host "SUCCESS: Workflow activated" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Start-Sleep -Seconds 2

# Step 2: Trigger evaluation
Write-Host ""
Write-Host "=========================================="
Write-Host "STEP 2: RUNNING EVALUATIONS"
Write-Host "=========================================="
$webhookUrl = "https://n8n.wranngle.com/webhook/parallel-eval-runner"
$body = @{
    limit = 100
    batch_size = 4
    target_webhook = "https://n8n.wranngle.com/webhook/client-lookup-test"
} | ConvertTo-Json

$startTime = Get-Date
try {
    $result = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
    $duration = ((Get-Date) - $startTime).TotalSeconds
    
    Write-Host ""
    Write-Host "=========================================="
    Write-Host "EVALUATION RESULTS"
    Write-Host "=========================================="
    Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Cyan
    Write-Host ""
    
    if ($result.summary) {
        Write-Host "Total Tests: $($result.summary.total_tests)"
        Write-Host "Passed: $($result.summary.passed)" -ForegroundColor Green
        Write-Host "Failed: $($result.summary.failed)" -ForegroundColor $(if ($result.summary.failed -gt 0) { "Red" } else { "Green" })
        Write-Host "Pass Rate: $($result.summary.pass_rate)"
    }
    
    if ($result.all_failures -and $result.all_failures.Count -gt 0) {
        Write-Host ""
        Write-Host "FAILURES:" -ForegroundColor Red
        foreach ($f in $result.all_failures) {
            Write-Host "  Test $($f.test_id) [$($f.category)]: $($f.error)" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}
