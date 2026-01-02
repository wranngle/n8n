$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

# Get test invocations raw
Write-Host "=== RAW TEST INVOCATIONS ===" -ForegroundColor Cyan
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations?agent_id=$agentId"
$response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers
$response | ConvertTo-Json -Depth 5 | Write-Host

Write-Host ""
Write-Host "=== RAW TESTS ===" -ForegroundColor Cyan
$tests = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/agent-testing' -Method GET -Headers $headers
Write-Host "Tests count: $($tests.tests.Count)"
Write-Host "First 5 test names:"
$tests.tests | Select-Object -First 5 | ForEach-Object { Write-Host "  - $($_.name)" }
