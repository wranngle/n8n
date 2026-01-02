# RE-RUN ALL TESTS AFTER AUTOREFINEMENT (v2)
$headers = @{ 
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}
$agentId = "agent_8001kdgp7qbyf4wvhs540be78vew"

Write-Host "============================================"
Write-Host "RE-RUNNING 100 TESTS POST-REFINEMENT"
Write-Host "============================================"

# Run tests - API requires empty object body
Write-Host "[1/2] Triggering test run..."
$body = "{}"
$runResponse = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $headers -Body $body
$invocationId = $runResponse.id
Write-Host "  New invocation ID: $invocationId"

if (-not $invocationId) {
    Write-Host "ERROR: No invocation ID returned"
    Write-Host "Response: $($runResponse | ConvertTo-Json -Depth 3)"
    exit 1
}

# Poll for completion
Write-Host "[2/2] Waiting for results (this takes ~5 min for 100 tests)..."
$maxAttempts = 90
$attempt = 0
$completed = $false

while (-not $completed -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 4
    $attempt++
    
    try {
        $status = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId" -Headers @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
        $testRuns = $status.test_runs
        $total = $testRuns.Count
        $passed = ($testRuns | Where-Object { $_.status -eq 'passed' }).Count
        $failed = ($testRuns | Where-Object { $_.status -eq 'failed' }).Count
        $pending = $total - $passed - $failed
        
        Write-Host "  [$attempt] P:$passed F:$failed W:$pending ($(([math]::Round(($passed+$failed)/$total*100)))%)"
        
        if ($pending -eq 0 -and $total -gt 0) {
            $completed = $true
        }
    } catch {
        Write-Host "  [$attempt] Waiting for invocation to initialize..."
    }
}

if ($completed) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "TEST RESULTS (POST-REFINEMENT CYCLE 1)"
    Write-Host "============================================"
    Write-Host "Invocation: $invocationId"
    Write-Host "Total: $total"
    Write-Host "Passed: $passed"
    Write-Host "Failed: $failed"
    Write-Host "Pass Rate: $([math]::Round(($passed / $total) * 100, 1))%"
    Write-Host ""
    Write-Host "COMPARISON:"
    Write-Host "  Before refinement: 63/100 (63.0%)"
    Write-Host "  After refinement:  $passed/$total ($([math]::Round(($passed / $total) * 100, 1))%)"
    $improvement = $passed - 63
    if ($improvement -gt 0) {
        Write-Host "  IMPROVEMENT: +$improvement tests now passing!"
    } elseif ($improvement -lt 0) {
        Write-Host "  REGRESSION: $improvement tests"
    } else {
        Write-Host "  NO CHANGE"
    }
    Write-Host ""
    Write-Host "UI: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
} else {
    Write-Host ""
    Write-Host "Tests still running after $($attempt * 4) seconds."
    Write-Host "Check UI: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
    Write-Host "Invocation ID: $invocationId"
}
