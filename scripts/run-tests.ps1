$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

Write-Host "=== RUNNING ALL 100 TESTS ===" -ForegroundColor Cyan
Write-Host "Agent: $agentId"
Write-Host ""

# Trigger test run
$uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests"

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body '{}'
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "Test run initiated!" -ForegroundColor Green
    Write-Host "Invocation ID: $($result.id)" -ForegroundColor Yellow
    
    # Save invocation ID for polling
    $result.id | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\current-invocation.txt"
    
    Write-Host ""
    Write-Host "Polling for results (this may take 2-3 minutes)..." -ForegroundColor Cyan
    
    $invocationId = $result.id
    $pollUri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"
    
    $maxAttempts = 60
    $attempt = 0
    $complete = $false
    
    while (-not $complete -and $attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 5
        $attempt++
        
        try {
            $pollResponse = Invoke-RestMethod -Uri $pollUri -Method GET -Headers $headers
            
            $pending = @($pollResponse.test_runs | Where-Object { $_.status -eq 'pending' }).Count
            $passed = @($pollResponse.test_runs | Where-Object { $_.status -eq 'passed' }).Count
            $failed = @($pollResponse.test_runs | Where-Object { $_.status -eq 'failed' }).Count
            $total = $pollResponse.test_runs.Count
            
            Write-Host "[$attempt] Passed: $passed | Failed: $failed | Pending: $pending / $total" -ForegroundColor White
            
            if ($pending -eq 0) {
                $complete = $true
            }
        } catch {
            Write-Host "[$attempt] Polling error: $_" -ForegroundColor Red
        }
    }
    
    if ($complete) {
        Write-Host ""
        Write-Host "=== FINAL RESULTS ===" -ForegroundColor Green
        Write-Host "Passed: $passed" -ForegroundColor Green
        Write-Host "Failed: $failed" -ForegroundColor Red
        Write-Host "Total: $total"
        
        $rate = [math]::Round(($passed / $total) * 100, 1)
        Write-Host ""
        Write-Host "Pass Rate: $rate%" -ForegroundColor $(if ($rate -ge 90) { "Green" } elseif ($rate -ge 75) { "Yellow" } else { "Red" })
        
        # Save results
        $pollResponse | ConvertTo-Json -Depth 5 | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\test-results-cycle3.json"
        Write-Host ""
        Write-Host "Results saved to test-results-cycle3.json"
    } else {
        Write-Host "Timeout waiting for results. Check manually." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
