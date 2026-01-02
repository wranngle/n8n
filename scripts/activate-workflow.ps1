param([string]$WorkflowId)
$headers = @{
    'X-N8N-API-KEY' = '***SCRUBBED_N8N_API_KEY***'
    'Content-Type' = 'application/json'
}
$url = "https://n8n.wranngle.com/api/v1/workflows/$WorkflowId/activate"
$result = Invoke-RestMethod -Method POST -Uri $url -Headers $headers
Write-Output "Active: $($result.active)"
