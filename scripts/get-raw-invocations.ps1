$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$agentId = 'agent_xxxx_demo'

# Get test invocations - raw response
$uri = "https://api.elevenlabs.io/v1/convai/test-invocations?agent_id=$agentId"
Write-Host "Fetching from: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== RAW RESPONSE ===" -ForegroundColor Yellow
    $response.Content | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\invocations-raw.json"
    Write-Host "Saved to invocations-raw.json"
    
    # Parse and display
    $data = $response.Content | ConvertFrom-Json
    Write-Host ""
    Write-Host "=== PARSED STRUCTURE ===" -ForegroundColor Cyan
    Write-Host "Type: $($data.GetType().Name)"
    
    if ($data -is [array]) {
        Write-Host "Array length: $($data.Count)"
        if ($data.Count -gt 0) {
            Write-Host "First item keys: $($data[0].PSObject.Properties.Name -join ', ')"
        }
    } else {
        Write-Host "Object keys: $($data.PSObject.Properties.Name -join ', ')"
    }
    
    # Show full JSON
    Write-Host ""
    Write-Host "=== FULL JSON ===" -ForegroundColor Magenta
    $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
}
