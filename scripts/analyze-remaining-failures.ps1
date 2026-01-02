$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$invocationId = 'suite_1101kds5rcxve5wa6qepm68ydkv8'
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"

$response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

$failed = $response.test_runs | Where-Object { $_.status -eq 'failed' }

Write-Host "=== REMAINING 5 FAILURES ===" -ForegroundColor Red
Write-Host ""

foreach ($test in $failed) {
    Write-Host "TEST: $($test.test_name)" -ForegroundColor Yellow
    Write-Host "----------------------------------------"
    
    # User input
    $userInput = $test.test_info.chat_history | Where-Object { $_.role -eq 'user' } | Select-Object -Last 1
    if ($userInput) {
        Write-Host "USER: $($userInput.message)" -ForegroundColor Cyan
    }
    
    # Agent response
    $agentResponse = $test.agent_responses | Select-Object -First 1
    if ($agentResponse -and $agentResponse.message) {
        Write-Host "AGENT: $($agentResponse.message)" -ForegroundColor White
    }
    
    # Failure reason
    Write-Host "REASON: $($test.condition_result.rationale.summary)" -ForegroundColor Red
    
    # Success condition
    Write-Host "EXPECTED: $($test.test_info.success_condition)" -ForegroundColor Green
    
    Write-Host ""
}
