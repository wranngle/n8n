# POLL CYCLE 2 RESULTS
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$invocationId = "suite_1301kds3m7mzegesn6b91nqhxy0p"

Write-Host "Polling cycle 2 results..."
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
    Write-Host "[$attempt] P:$passed F:$failed W:$pending"
    if ($pending -eq 0 -and $total -gt 0) { $completed = $true }
}

if ($completed) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "CYCLE 2 RESULTS"
    Write-Host "============================================"
    Write-Host "Passed: $passed / $total ($([math]::Round(($passed/$total)*100,1))%)"
    Write-Host ""
    Write-Host "PROGRESSION:"
    Write-Host "  Baseline:  63/100 (63%)"
    Write-Host "  Cycle 1:   72/100 (72%) +9"
    Write-Host "  Cycle 2:   $passed/100 ($([math]::Round(($passed/$total)*100,1))%) $(if($passed -gt 72){'+'}else{''})$($passed - 72)"
}
