$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
}

# List all credentials
Write-Host "Listing all credentials..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "$baseUrl/credentials" -Method Get -Headers $headers
$result.data | ForEach-Object {
    Write-Host "ID: $($_.id) | Name: $($_.name) | Type: $($_.type)" -ForegroundColor Cyan
}

# Get Twilio schema
Write-Host "`nGetting Twilio schema..." -ForegroundColor Yellow
try {
    $schema = Invoke-RestMethod -Uri "$baseUrl/credentials/schema/twilioApi" -Method Get -Headers $headers
    $schema | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Schema error: $($_.Exception.Message)" -ForegroundColor Red
}
