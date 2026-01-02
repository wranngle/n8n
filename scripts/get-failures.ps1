$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$response = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/test-invocations/suite_8101kds22n3xf099nj58r1rx1sbz' -Headers $headers
$failures = $response.results | Where-Object { $_.outcome -eq 'fail' }

Write-Host "TOTAL FAILURES: $($failures.Count)"
Write-Host ""

$failureData = @{
    agent_id = "agent_xxxx_demo"
    invocation_id = "suite_8101kds22n3xf099nj58r1rx1sbz"
    total_tests = 100
    passed_tests = 63
    failures = @()
}

foreach ($f in $failures) {
    $failureData.failures += @{
        test_id = $f.test_id
        test_name = $f.test_name
        outcome = $f.outcome
        reasoning = $f.reasoning
    }
    Write-Host "FAILED: $($f.test_name)"
    Write-Host "  Reason: $($f.reasoning)"
    Write-Host ""
}

# Export to JSON for autorefinement trigger
$failureData | ConvertTo-Json -Depth 5 | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\temp-failures.json" -Encoding UTF8
Write-Host "Exported to temp-failures.json"
