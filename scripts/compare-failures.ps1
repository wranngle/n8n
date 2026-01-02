$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$invocationId = 'suite_4101kds638mde018vht0g0462v56'
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"

$response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

$failed = $response.test_runs | Where-Object { $_.status -eq 'failed' }

Write-Host "=== CYCLE 4 FAILURES (5) ===" -ForegroundColor Red
Write-Host ""

foreach ($test in $failed) {
    Write-Host "TEST: $($test.test_name)" -ForegroundColor Yellow
    
    $userInput = $test.test_info.chat_history | Where-Object { $_.role -eq 'user' } | Select-Object -Last 1
    Write-Host "USER: $($userInput.message)" -ForegroundColor Cyan
    
    $agentResponse = $test.agent_responses | Select-Object -First 1
    if ($agentResponse.message) {
        $msg = $agentResponse.message
        if ($msg.Length -gt 150) { $msg = $msg.Substring(0, 150) + "..." }
        Write-Host "AGENT: $msg" -ForegroundColor White
    }
    
    Write-Host "REASON: $($test.condition_result.rationale.summary)" -ForegroundColor Red
    Write-Host ""
}
