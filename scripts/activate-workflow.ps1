param([string]$WorkflowId)
$headers = @{
    'X-N8N-API-KEY' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g'
    'Content-Type' = 'application/json'
}
$url = "https://n8n.wranngle.com/api/v1/workflows/$WorkflowId/activate"
$result = Invoke-RestMethod -Method POST -Uri $url -Headers $headers
Write-Output "Active: $($result.active)"
