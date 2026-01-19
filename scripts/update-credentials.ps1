# Update n8n Credentials Script

$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Update ElevenLabs credential
Write-Host "Updating ElevenLabs credential..." -ForegroundColor Yellow
$elevenLabsBody = @{
    name = "ElevenLabs API Key"
    type = "httpHeaderAuth"
    data = @{
        name = "xi-api-key"
        value = "sk_dd3cfeec8d712a9924c84790dd43b6bacc62686d89b2e41b"
    }
} | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials/eR7srDUHDyZLIZgh" -Method Patch -Headers $headers -Body $elevenLabsBody
    Write-Host "ElevenLabs credential updated successfully!" -ForegroundColor Green
    $result | ConvertTo-Json
} catch {
    Write-Host "Error updating ElevenLabs credential: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
}

# Create Twilio credential
Write-Host "`nCreating Twilio credential..." -ForegroundColor Yellow
$twilioBody = @{
    name = "Twilio API"
    type = "twilioApi"
    data = @{
        accountSid = "ACb9a3b7df2dfe607099bd0ce0e6ae47e1"
        authToken = "a5d7bfaa399fae6df2ef2f572e7f06fb"
    }
} | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials" -Method Post -Headers $headers -Body $twilioBody
    Write-Host "Twilio credential created successfully!" -ForegroundColor Green
    Write-Host "New Twilio credential ID: $($result.id)" -ForegroundColor Cyan
    $result | ConvertTo-Json
} catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Twilio credential already exists" -ForegroundColor Yellow
    } else {
        Write-Host "Error creating Twilio credential: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDone!" -ForegroundColor Green
