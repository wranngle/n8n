# DEBUG TESTS API
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_8001kdgp7qbyf4wvhs540be78vew"

Write-Host "============================================"
Write-Host "DEBUGGING TESTS API"
Write-Host "============================================"

# List all tests (check pagination)
Write-Host "Fetching all tests..."
$page = 1
$allTests = @()
$hasMore = $true

while ($hasMore) {
    $url = "https://api.elevenlabs.io/v1/convai/agent-testing?page_size=100&page=$page"
    $response = Invoke-RestMethod -Uri $url -Headers $headers
    
    Write-Host "Page $page`: $($response.tests.Count) tests"
    $allTests += $response.tests
    
    if ($response.tests.Count -lt 100) {
        $hasMore = $false
    } else {
        $page++
    }
}

Write-Host ""
Write-Host "Total tests: $($allTests.Count)"

# Show first test structure
if ($allTests.Count -gt 0) {
    Write-Host ""
    Write-Host "First test structure:"
    $allTests[0] | ConvertTo-Json -Depth 3
}

# Try running with different format
Write-Host ""
Write-Host "============================================"
Write-Host "ATTEMPTING TEST RUN"
Write-Host "============================================"

$testIds = $allTests | ForEach-Object { $_.test_id }
Write-Host "Test IDs to run: $($testIds.Count)"

# Try format 1: array of test_ids
$body1 = @{ tests = $testIds } | ConvertTo-Json -Compress
Write-Host "Body format 1: $($body1.Substring(0, [Math]::Min(100, $body1.Length)))..."

$runHeaders = @{ 
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

try {
    $result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $body1
    Write-Host "SUCCESS with format 1!"
    Write-Host "Invocation: $($result.id)"
    $result.id | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-invocation-id.txt"
} catch {
    Write-Host "Format 1 failed: $($_.Exception.Message)"
    
    # Try format 2: array of objects with test_id
    $body2 = @{ tests = @($testIds | ForEach-Object { @{ test_id = $_ } }) } | ConvertTo-Json -Compress -Depth 3
    Write-Host ""
    Write-Host "Body format 2: $($body2.Substring(0, [Math]::Min(100, $body2.Length)))..."
    
    try {
        $result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId/run-tests" -Method POST -Headers $runHeaders -Body $body2
        Write-Host "SUCCESS with format 2!"
        Write-Host "Invocation: $($result.id)"
    } catch {
        Write-Host "Format 2 failed: $($_.Exception.Message)"
    }
}
