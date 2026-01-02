$body = Get-Content 'D:\Things\Work\Wranngle\n8n_workflow_development\workflows\voice_ai_agents\transcript-extraction\workflow.json' -Raw
$apiKey = $env:N8N_API_KEY
$headers = @{
    'Content-Type' = 'application/json'
    'X-N8N-API-KEY' = $apiKey
}
try {
    $result = Invoke-RestMethod -Uri 'https://n8n.wranngle.com/api/v1/workflows' -Method POST -Headers $headers -Body $body
    $result | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
