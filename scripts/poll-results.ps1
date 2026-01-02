# POLL FOR TEST RESULTS
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$invocationId = "suite_8801kds3gevqf0ct14sgws7qaz0a"
$agentId = "agent_xxxx_demo"

Write-Host "============================================"
Write-Host "POLLING FOR TEST RESULTS"
Write-Host "============================================"
Write-Host "Invocation: $invocationId"
Write-Host ""

$maxAttempts = 120
$attempt = 0
$completed = $false

while (-not $completed -and $attempt -lt $maxAttempts) {
    Start-Sleep -Seconds 3
    $attempt++
    
    $status = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId" -Headers $headers
    $runs = $status.test_runs
    $total = $runs.Count
    $passed = ($runs | Where-Object { $_.status -eq 'passed' }).Count
    $failed = ($runs | Where-Object { $_.status -eq 'failed' }).Count
    $pending = $total - $passed - $failed
    $pct = if ($total -gt 0) { [math]::Round((($passed + $failed) / $total) * 100) } else { 0 }
    
    Write-Host "[$attempt] P:$passed F:$failed W:$pending ($pct% done)"
    
    if ($pending -eq 0 -and $total -gt 0) {
        $completed = $true
    }
}

if ($completed) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "FINAL RESULTS (POST-REFINEMENT CYCLE 1)"
    Write-Host "============================================"
    Write-Host "Total:  $total"
    Write-Host "Passed: $passed"
    Write-Host "Failed: $failed"
    Write-Host "Rate:   $([math]::Round(($passed / $total) * 100, 1))%"
    Write-Host ""
    Write-Host "COMPARISON:"
    Write-Host "  Before: 63/100 (63.0%)"
    Write-Host "  After:  $passed/$total ($([math]::Round(($passed / $total) * 100, 1))%)"
    $improvement = $passed - 63
    if ($improvement -gt 0) {
        Write-Host "  IMPROVEMENT: +$improvement tests!"
    } elseif ($improvement -lt 0) {
        Write-Host "  REGRESSION: $improvement tests"
    }
    Write-Host ""
    Write-Host "UI: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
}
