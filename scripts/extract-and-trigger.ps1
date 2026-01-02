$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$response = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/test-invocations/suite_8101kds22n3xf099nj58r1rx1sbz' -Headers $headers

# Extract failures using correct structure
$failures = $response.test_runs | Where-Object { $_.status -eq 'failed' }
$passed = $response.test_runs | Where-Object { $_.status -eq 'passed' }

Write-Host "============================================"
Write-Host "TEST INVOCATION RESULTS"
Write-Host "============================================"
Write-Host "Total Tests: $($response.test_runs.Count)"
Write-Host "Passed: $($passed.Count)"
Write-Host "Failed: $($failures.Count)"
Write-Host "Pass Rate: $([math]::Round(($passed.Count / $response.test_runs.Count) * 100, 1))%"
Write-Host "============================================"
Write-Host ""

# Build failure data for autorefinement
$failureData = @{
    agent_id = "agent_xxxx_demo"
    invocation_id = "suite_8101kds22n3xf099nj58r1rx1sbz"
    total_tests = $response.test_runs.Count
    passed_tests = $passed.Count
    failures = @()
}

Write-Host "FAILED TESTS:"
Write-Host "-------------"
foreach ($f in $failures) {
    $rationale = ""
    if ($f.condition_result.rationale.summary) {
        $rationale = $f.condition_result.rationale.summary
    }
    if ($f.condition_result.rationale.messages) {
        $rationale += " - " + ($f.condition_result.rationale.messages -join "; ")
    }
    
    Write-Host "- $($f.test_name)"
    Write-Host "  Reason: $rationale"
    Write-Host ""
    
    $failureData.failures += @{
        test_id = $f.test_id
        test_name = $f.test_name
        status = $f.status
        rationale = $rationale
        success_condition = $f.test_info.success_condition
    }
}

# Export to JSON
$jsonPath = "D:\Things\Work\Wranngle\n8n_workflow_development\temp-failures.json"
$failureData | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding UTF8
Write-Host ""
Write-Host "Exported failure data to: $jsonPath"
Write-Host ""

# Trigger autorefinement workflow (test webhook since workflow is inactive)
Write-Host "============================================"
Write-Host "TRIGGERING AUTOREFINEMENT WORKFLOW"
Write-Host "============================================"

$webhookUrl = "https://n8n.wranngle.com/webhook-test/autorefinement-trigger"
$body = $failureData | ConvertTo-Json -Depth 10

try {
    $triggerResponse = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json"
    Write-Host "Autorefinement triggered successfully!"
    Write-Host "Response: $($triggerResponse | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Failed to trigger autorefinement: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode)"
}
