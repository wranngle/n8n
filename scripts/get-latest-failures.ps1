$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$invocationId = 'suite_4401kds6w6e1e5crbwm4p87kbraf'
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"

$response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

$failed = $response.test_runs | Where-Object { $_.status -eq 'failed' }

Write-Host "=== LATEST RUN FAILURES ($($failed.Count)) ===" -ForegroundColor Red
Write-Host ""

foreach ($test in $failed) {
    Write-Host "TEST: $($test.test_name)" -ForegroundColor Yellow
    
    $userInput = $test.test_info.chat_history | Where-Object { $_.role -eq 'user' } | Select-Object -Last 1
    if ($userInput) {
        $msg = $userInput.message
        if ($msg.Length -gt 100) { $msg = $msg.Substring(0, 100) + "..." }
        Write-Host "USER: $msg" -ForegroundColor Cyan
    }
    
    $agentResponse = $test.agent_responses | Select-Object -First 1
    if ($agentResponse -and $agentResponse.message) {
        $msg = $agentResponse.message
        if ($msg.Length -gt 100) { $msg = $msg.Substring(0, 100) + "..." }
        Write-Host "AGENT: $msg" -ForegroundColor White
    }
    
    if ($test.condition_result.rationale.summary) {
        Write-Host "REASON: $($test.condition_result.rationale.summary)" -ForegroundColor Red
    }
    Write-Host ""
}
