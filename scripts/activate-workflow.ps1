param([string]$WorkflowId)

$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/workflows/$WorkflowId/activate" -Headers $headers -Method POST
    Write-Host "SUCCESS: Workflow $WorkflowId activated"
    $result | Select-Object id,name,active | ConvertTo-Json
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}
