$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

# Get test invocations for this agent
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations?agent_id=$agentId"
$invocations = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

Write-Host "=== TEST INVOCATIONS FOR SARAH AGENT ===" -ForegroundColor Cyan
Write-Host "Total invocations: $($invocations.Count)"
Write-Host ""

foreach ($inv in $invocations) {
    $passed = @($inv.results | Where-Object { $_.status -eq 'passed' }).Count
    $failed = @($inv.results | Where-Object { $_.status -eq 'failed' }).Count
    $total = $inv.results.Count
    if ($total -gt 0) {
        $pct = [math]::Round(($passed / $total) * 100, 1)
    } else {
        $pct = 0
    }
    Write-Host "Invocation: $($inv.id)" -ForegroundColor Yellow
    Write-Host "  Created: $($inv.created_at)"
    Write-Host "  Tests: $total | Passed: $passed | Failed: $failed | Rate: $pct%"
    Write-Host ""
}

# Get total test count
$tests = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/agent-testing' -Method GET -Headers $headers
Write-Host "=== TOTAL TESTS IN SYSTEM ===" -ForegroundColor Cyan
Write-Host "Total tests: $($tests.tests.Count)"
