# Create n8n Credentials Script

$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Create NEW ElevenLabs credential with correct API key
Write-Host "Creating new ElevenLabs credential..." -ForegroundColor Yellow
$elevenLabsBody = @{
    name = "ElevenLabs API Key (Active)"
    type = "httpHeaderAuth"
    data = @{
        name = "xi-api-key"
        value = "sk_dd3cfeec8d712a9924c84790dd43b6bacc62686d89b2e41b"
    }
} | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials" -Method Post -Headers $headers -Body $elevenLabsBody
    Write-Host "ElevenLabs credential created successfully!" -ForegroundColor Green
    Write-Host "New ElevenLabs credential ID: $($result.id)" -ForegroundColor Cyan
    $result | ConvertTo-Json
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $responseBody = $reader.ReadToEnd()
    Write-Host "Error ($statusCode): $responseBody" -ForegroundColor Red
}

# Get credential schema for twilioApi
Write-Host "`nGetting Twilio credential schema..." -ForegroundColor Yellow
try {
    $schema = Invoke-RestMethod -Uri "$baseUrl/credentials/schema/twilioApi" -Method Get -Headers $headers
    Write-Host "Twilio schema:" -ForegroundColor Cyan
    $schema | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Could not get Twilio schema: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDone!" -ForegroundColor Green
