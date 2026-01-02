$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$invocationId = 'suite_5301kds3p8frfz9s53040r4e6w4z'

# Get invocation details
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId"
Write-Host "Fetching invocation details from: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    
    # Save raw response
    $response.Content | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\invocation-details.json"
    Write-Host "Saved to invocation-details.json"
    
    # Parse and analyze
    $data = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "=== INVOCATION SUMMARY ===" -ForegroundColor Yellow
    Write-Host "ID: $($data.id)"
    Write-Host "Title: $($data.title)"
    Write-Host "Total: $($data.test_run_count)"
    Write-Host "Passed: $($data.passed_count)" -ForegroundColor Green
    Write-Host "Failed: $($data.failed_count)" -ForegroundColor Red
    
    # Check for test_runs or results array
    Write-Host ""
    Write-Host "=== OBJECT KEYS ===" -ForegroundColor Cyan
    Write-Host ($data.PSObject.Properties.Name -join ', ')
    
    # Output full JSON
    Write-Host ""
    Write-Host "=== FULL JSON ===" -ForegroundColor Magenta
    $response.Content
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}
