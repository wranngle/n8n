$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$invocationId = 'suite_5301kds3p8frfz9s53040r4e6w4z'

# Get invocation details
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"
$response = Invoke-RestMethod -Uri $uri -Method GET -Headers $headers

# Extract failed tests
$failed = $response.test_runs | Where-Object { $_.status -eq 'failed' }

Write-Host "=== FAILURE ANALYSIS ===" -ForegroundColor Red
Write-Host "Total Failures: $($failed.Count)"
Write-Host ""

# Group by failure pattern
$patterns = @{}

foreach ($test in $failed) {
    $name = $test.test_name
    $reason = $test.condition_result.rationale.summary
    $messages = $test.condition_result.rationale.messages -join "; "
    
    # Extract pattern category from test name
    $category = ($name -split ' - ')[0]
    if (-not $patterns.ContainsKey($category)) {
        $patterns[$category] = @()
    }
    $patterns[$category] += @{
        name = $name
        reason = $reason
        messages = $messages
        agent_response = if ($test.agent_responses.Count -gt 0) { $test.agent_responses[0].message } else { "N/A" }
        user_input = if ($test.test_info.chat_history.Count -gt 0) { $test.test_info.chat_history[-1].message } else { "N/A" }
    }
}

Write-Host "=== FAILURES BY CATEGORY ===" -ForegroundColor Yellow
foreach ($category in $patterns.Keys | Sort-Object) {
    Write-Host ""
    Write-Host "[$category] - $($patterns[$category].Count) failures" -ForegroundColor Cyan
    foreach ($test in $patterns[$category]) {
        Write-Host "  Test: $($test.name)" -ForegroundColor White
        Write-Host "    User: $($test.user_input.Substring(0, [Math]::Min(80, $test.user_input.Length)))..."
        Write-Host "    Agent: $($test.agent_response.Substring(0, [Math]::Min(80, $test.agent_response.Length)))..."
        Write-Host "    Reason: $($test.reason)" -ForegroundColor Red
        if ($test.messages) {
            Write-Host "    Details: $($test.messages)" -ForegroundColor DarkRed
        }
    }
}

# Export to JSON for further analysis
$failureReport = @{
    invocation_id = $invocationId
    total_failures = $failed.Count
    categories = $patterns
    raw_failures = $failed | ForEach-Object {
        @{
            test_name = $_.test_name
            test_id = $_.test_id
            status = $_.status
            reason = $_.condition_result.rationale.summary
            messages = $_.condition_result.rationale.messages
            success_condition = $_.test_info.success_condition
            user_input = $_.test_info.chat_history | ForEach-Object { $_.message }
            agent_response = $_.agent_responses | ForEach-Object { $_.message }
        }
    }
}

$failureReport | ConvertTo-Json -Depth 10 | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\failure-report.json"
Write-Host ""
Write-Host "Full report saved to failure-report.json" -ForegroundColor Green
