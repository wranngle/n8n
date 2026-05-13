$body = Get-Content 'workflows/knowledge_management/youtube-rag-pipeline/workflow.json' -Raw
$apiKey = $env:N8N_API_KEY
$apiUrl = $env:N8N_API_URL
if (-not $apiUrl) {
    throw "N8N_API_URL is required"
}
$headers = @{
    'Content-Type' = 'application/json'
    'X-N8N-API-KEY' = $apiKey
}

try {
    $result = Invoke-RestMethod -Uri "$($apiUrl.TrimEnd('/'))/api/v1/workflows" -Method POST -Headers $headers -Body $body
    Write-Host "Success! Workflow deployed."
    $result | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Host "Response: $($_.ErrorDetails.Message)"
    } else {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $respBody = $reader.ReadToEnd()
        Write-Host "Server Response: $respBody"
    }
    exit 1
}
