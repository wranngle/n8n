param([string]$WorkflowId)

$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

Write-Host "Executing workflow $WorkflowId..."

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/executions" -Headers $headers -Method POST -Body (@{workflowId = $WorkflowId} | ConvertTo-Json)
    Write-Host "SUCCESS: Execution started"
    $result | ConvertTo-Json -Depth 10
} catch {
    $response = $_.Exception.Response
    if ($response) {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $reader.BaseStream.Position = 0
        Write-Host "ERROR: $($reader.ReadToEnd())" -ForegroundColor Red
    } else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
