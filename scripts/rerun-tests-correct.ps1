# RE-RUN TESTS WITH CORRECT FORMAT
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_xxxx_demo"
$originalInvocation = "suite_8101kds22n3xf099nj58r1rx1sbz"

Write-Host "============================================"
Write-Host "RE-RUNNING 100 TESTS (CORRECT FORMAT)"
Write-Host "============================================"

# Get test IDs from original run
$inv = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$originalInvocation" -Headers $headers
$testIds = $inv.test_runs | ForEach-Object { $_.test_id } | Select-Object -Unique
Write-Host "Test IDs: $($testIds.Count)"

# Build correct format: array of objects with test_id
$testObjects = @()
foreach ($id in $testIds) {
    $testObjects += @{ test_id = $id }
}

$body = $testObjects | ConvertTo-Json -Compress
Write-Host "Body preview: $($body.Substring(0, [Math]::Min(200, $body.Length)))..."

$runHeaders = @{ 
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

try {
    $result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $body
    Write-Host ""
    Write-Host "SUCCESS! Invocation: $($result.id)"
    $result.id | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-new-invocation.txt"
    Write-Host "Monitor: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    
    # Try alternate format with wrapper
    Write-Host ""
    Write-Host "Trying alternate format..."
    $body2 = @{ tests = $testObjects } | ConvertTo-Json -Depth 3 -Compress
    Write-Host "Alt body: $($body2.Substring(0, [Math]::Min(200, $body2.Length)))..."
    
    try {
        $result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $body2
        Write-Host "SUCCESS with alt format! Invocation: $($result.id)"
        $result.id | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-new-invocation.txt"
    } catch {
        Write-Host "Alt format also failed: $($_.Exception.Message)"
    }
}
