$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1/workflows"
$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Activate Autorefinement Orchestrator v2
Write-Host "Activating Autorefinement Orchestrator v2 (zeQNX4g5mQlE4EQ0)..."
try {
    $result = Invoke-RestMethod -Uri "$baseUrl/zeQNX4g5mQlE4EQ0/activate" -Method POST -Headers $headers
    Write-Host "SUCCESS: Activated" -ForegroundColor Green
    Write-Host "Active: $($result.active)"
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host $reader.ReadToEnd()
    }
}
