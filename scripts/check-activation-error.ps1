$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g"
$baseUrl = "https://n8n.wranngle.com/api/v1/workflows"
$workflowId = "oH57DNgW4SZxuDmW"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

try {
    $result = Invoke-WebRequest -Uri "$baseUrl/$workflowId/activate" -Method POST -Headers $headers -UseBasicParsing
    Write-Host "Success: $($result.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)"
    $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
    Write-Host "Body: $body"
}
