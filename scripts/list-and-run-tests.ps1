# LIST ALL TESTS AND RUN THEM
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_8001kdgp7qbyf4wvhs540be78vew"

Write-Host "============================================"
Write-Host "LISTING ALL TESTS FOR AGENT"
Write-Host "============================================"

# List all tests associated with this agent
$testsResponse = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agent-testing?agent_id=$agentId" -Headers $headers
Write-Host "Tests found: $($testsResponse.tests.Count)"

if ($testsResponse.tests.Count -eq 0) {
    Write-Host "No tests found for agent. Listing all tests..."
    $allTests = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agent-testing" -Headers $headers
    Write-Host "Total tests in workspace: $($allTests.tests.Count)"
    $testsResponse = $allTests
}

# Get test IDs
$testIds = $testsResponse.tests | ForEach-Object { $_.test_id }
Write-Host "Test IDs: $($testIds.Count)"

if ($testIds.Count -gt 0) {
    Write-Host ""
    Write-Host "============================================"
    Write-Host "RUNNING $($testIds.Count) TESTS"
    Write-Host "============================================"
    
    $runBody = @{
        tests = $testIds
    } | ConvertTo-Json
    
    $runHeaders = @{ 
        'xi-api-key' = $env:ELEVENLABS_API_KEY
        'Content-Type' = 'application/json'
    }
    
    try {
        $runResponse = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $runBody
        Write-Host "Test run started!"
        Write-Host "Invocation ID: $($runResponse.id)"
        Write-Host ""
        Write-Host "Monitor at: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
        
        # Save invocation ID for later
        $runResponse.id | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-invocation-id.txt"
    } catch {
        Write-Host "Error running tests: $($_.Exception.Message)"
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())"
    }
} else {
    Write-Host "No test IDs to run"
}
