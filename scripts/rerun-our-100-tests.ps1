# RE-RUN OUR SPECIFIC 100 TESTS
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_xxxx_demo"
$originalInvocation = "suite_8101kds22n3xf099nj58r1rx1sbz"

Write-Host "============================================"
Write-Host "EXTRACTING TEST IDs FROM ORIGINAL RUN"
Write-Host "============================================"

# Get our original 100 test IDs
$invocation = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$originalInvocation" -Headers $headers
$testIds = $invocation.test_runs | ForEach-Object { $_.test_id } | Select-Object -Unique
Write-Host "Found $($testIds.Count) unique test IDs from original run"

# Run those specific tests
Write-Host ""
Write-Host "============================================"
Write-Host "RUNNING $($testIds.Count) TESTS"
Write-Host "============================================"

$runHeaders = @{ 
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

$body = @{ tests = @($testIds) } | ConvertTo-Json -Compress
Write-Host "Request body length: $($body.Length) chars"

try {
    $result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $body
    Write-Host "SUCCESS!"
    Write-Host "New Invocation ID: $($result.id)"
    $result.id | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-new-invocation.txt"
    Write-Host ""
    Write-Host "Monitor: https://elevenlabs.io/app/agents/agents/$agentId`?tab=tests"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Response: $body"
    }
}
