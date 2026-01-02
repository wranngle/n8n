$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

# Get test invocations
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations?agent_id=$agentId"
$invocations = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

Write-Host "=== TEST INVOCATIONS ===" -ForegroundColor Cyan
Write-Host "Total invocations: $($invocations.Count)"
Write-Host ""

# Get the most recent invocation
$latest = $invocations | Sort-Object -Property created_at -Descending | Select-Object -First 1

Write-Host "=== LATEST INVOCATION: $($latest.id) ===" -ForegroundColor Yellow
Write-Host "Created: $($latest.created_at)"
Write-Host ""

# Analyze results
$passed = @($latest.results | Where-Object { $_.status -eq 'passed' })
$failed = @($latest.results | Where-Object { $_.status -eq 'failed' })

Write-Host "Passed: $($passed.Count)" -ForegroundColor Green
Write-Host "Failed: $($failed.Count)" -ForegroundColor Red
Write-Host ""

Write-Host "=== FAILED TESTS DETAILS ===" -ForegroundColor Red
foreach ($fail in $failed) {
    Write-Host "----------------------------------------"
    Write-Host "Test ID: $($fail.test_id)" -ForegroundColor Yellow
    Write-Host "Test Name: $($fail.test_name)"
    Write-Host "Status: $($fail.status)"
    if ($fail.failure_reason) {
        Write-Host "Failure Reason: $($fail.failure_reason)" -ForegroundColor Red
    }
    if ($fail.transcript) {
        Write-Host "Transcript excerpt: $($fail.transcript.Substring(0, [Math]::Min(200, $fail.transcript.Length)))..."
    }
    Write-Host ""
}

# Output raw JSON for analysis
Write-Host "=== RAW FAILED RESULTS JSON ===" -ForegroundColor Magenta
$failed | ConvertTo-Json -Depth 5
