param([string]$WorkflowId)

$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

Write-Host "Deactivating workflow..."
Invoke-RestMethod -Uri "$baseUrl/workflows/$WorkflowId/deactivate" -Headers $headers -Method POST | Out-Null
Start-Sleep -Seconds 2

Write-Host "Reactivating workflow..."
$result = Invoke-RestMethod -Uri "$baseUrl/workflows/$WorkflowId/activate" -Headers $headers -Method POST
Write-Host "SUCCESS: Workflow $WorkflowId toggled"
$result | Select-Object id,name,active | ConvertTo-Json
