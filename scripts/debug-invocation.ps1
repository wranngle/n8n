$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$response = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/test-invocations/suite_8101kds22n3xf099nj58r1rx1sbz' -Headers $headers

Write-Host "=== RAW RESPONSE STRUCTURE ==="
Write-Host "Type: $($response.GetType().Name)"
Write-Host ""

# Check top-level properties
$response | Get-Member -MemberType NoteProperty | ForEach-Object {
    Write-Host "Property: $($_.Name)"
}
Write-Host ""

# Check results array
if ($response.results) {
    Write-Host "Results count: $($response.results.Count)"
    if ($response.results.Count -gt 0) {
        Write-Host "First result properties:"
        $response.results[0] | Get-Member -MemberType NoteProperty | ForEach-Object {
            Write-Host "  - $($_.Name): $($response.results[0].$($_.Name))"
        }
    }
} elseif ($response.test_results) {
    Write-Host "test_results count: $($response.test_results.Count)"
    if ($response.test_results.Count -gt 0) {
        Write-Host "First test_result properties:"
        $response.test_results[0] | Get-Member -MemberType NoteProperty | ForEach-Object {
            Write-Host "  - $($_.Name): $($response.test_results[0].$($_.Name))"
        }
    }
} else {
    Write-Host "Dumping full response:"
    $response | ConvertTo-Json -Depth 3 | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-debug.json"
    Write-Host "Saved to temp-debug.json"
}

# Export full response
$response | ConvertTo-Json -Depth 10 | Out-File "D:\Things\Work\Wranngle\n8n_workflow_development\temp-invocation-full.json" -Encoding UTF8
Write-Host "Full response saved to temp-invocation-full.json"
