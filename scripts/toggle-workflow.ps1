param([string]$WorkflowId)

$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
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
