$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== FETCHING ALL TEST IDS ===" -ForegroundColor Cyan

# First get all tests
$testsUri = "https://api.elevenlabs.io/v1/convai/agent-testing"
$testsResponse = Invoke-RestMethod -Uri $testsUri -Method GET -Headers $headers
$testIds = $testsResponse.tests | ForEach-Object { @{ test_id = $_.test_id } }

Write-Host "Found $($testIds.Count) tests"

# Build test array
$testArray = $testsResponse.tests | ForEach-Object { @{ test_id = $_.test_id } }

Write-Host ""
Write-Host "=== RUNNING ALL $($testArray.Count) TESTS ===" -ForegroundColor Cyan
Write-Host "Agent: $agentId"
Write-Host ""

# Trigger test run with test IDs
$uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests"
$body = @{
    tests = $testArray
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "Test run initiated!" -ForegroundColor Green
    Write-Host "Invocation ID: $($result.id)" -ForegroundColor Yellow
    
    # Save invocation ID
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
            
            Write-Host "[$attempt] Passed: $passed | Failed: $failed | Pending: $pending / $total"
            
            if ($pending -eq 0) {
                $complete = $true
            }
        } catch {
            Write-Host "[$attempt] Poll error: $_" -ForegroundColor Red
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
        if ($rate -ge 90) {
            Write-Host "Pass Rate: $rate% - EXCELLENT!" -ForegroundColor Green
        } elseif ($rate -ge 80) {
            Write-Host "Pass Rate: $rate% - GOOD" -ForegroundColor Yellow
        } else {
            Write-Host "Pass Rate: $rate% - NEEDS IMPROVEMENT" -ForegroundColor Red
        }
        
        # Save full results
        $pollResponse | ConvertTo-Json -Depth 10 | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\test-results-cycle3.json" -Encoding utf8
        Write-Host ""
        Write-Host "Full results saved to test-results-cycle3.json"
    } else {
        Write-Host "Timeout - check manually with invocation ID: $invocationId" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
