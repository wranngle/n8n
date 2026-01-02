# RE-RUN ALL TESTS AFTER AUTOREFINEMENT
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_xxxx_demo"

Write-Host "============================================"
Write-Host "RE-RUNNING 100 TESTS POST-REFINEMENT"
Write-Host "============================================"

# Run tests
Write-Host "[1/2] Triggering test run..."
$runResponse = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $headers
$invocationId = $runResponse.id
Write-Host "  New invocation ID: $invocationId"

# Poll for completion
Write-Host "[2/2] Waiting for results..."
$maxAttempts = 60
$attempt = 0
$completed = $false

while (-not $completed -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 5
    $attempt++
    
    try {
        $status = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId" -Headers $headers
        $testRuns = $status.test_runs
        $total = $testRuns.Count
        $passed = ($testRuns | Where-Object { $_.status -eq 'passed' }).Count
        $failed = ($testRuns | Where-Object { $_.status -eq 'failed' }).Count
        $pending = $total - $passed - $failed
        
        Write-Host "  [$attempt] Total: $total | Passed: $passed | Failed: $failed | Pending: $pending"
        
        if ($pending -eq 0 -and $total -gt 0) {
            $completed = $true
        }
    } catch {
        Write-Host "  [$attempt] Polling..."
    }
}

if ($completed) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "TEST RESULTS (POST-REFINEMENT)"
    Write-Host "============================================"
    Write-Host "Invocation: $invocationId"
    Write-Host "Total: $total"
    Write-Host "Passed: $passed"
    Write-Host "Failed: $failed"
    Write-Host "Pass Rate: $([math]::Round(($passed / $total) * 100, 1))%"
    Write-Host ""
    Write-Host "COMPARISON:"
    Write-Host "  Before: 63/100 (63%)"
    Write-Host "  After:  $passed/100 ($([math]::Round(($passed / $total) * 100, 1))%)"
    $improvement = $passed - 63
    if ($improvement -gt 0) {
        Write-Host "  IMPROVEMENT: +$improvement tests passing!"
    } elseif ($improvement -lt 0) {
        Write-Host "  REGRESSION: $improvement tests"
    } else {
        Write-Host "  NO CHANGE"
    }
} else {
    Write-Host "Tests still running. Check UI: https://elevenlabs.io/app/agents/agents/$agentId?tab=tests"
}
