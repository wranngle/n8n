$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.keH6T-4fCjsGm4dJPy5r24n1X4B6_lgB3AT9SAN7s1U"
$workflowId = "M7ZmLGCxyVOn5QJ6"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Try the /activate endpoint with POST
try {
    $response = Invoke-RestMethod -Uri "https://n8n.wranngle.com/api/v1/workflows/$workflowId/activate" -Method POST -Headers $headers
    Write-Host "SUCCESS via /activate endpoint"
    Write-Host ($response | ConvertTo-Json -Depth 3)
} catch {
    Write-Host "Activate endpoint failed: $($_.Exception.Message)"
    
    # Try PUT on the main workflow endpoint
    try {
        $body = '{"active": true}'
        $response = Invoke-RestMethod -Uri "https://n8n.wranngle.com/api/v1/workflows/$workflowId" -Method PUT -Headers $headers -Body $body
        Write-Host "SUCCESS via PUT"
        Write-Host "Active: $($response.active)"
    } catch {
        Write-Host "PUT also failed: $($_.Exception.Message)"
    }
}
