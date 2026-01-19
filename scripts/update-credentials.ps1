# Update n8n Credentials Script

$apiKey = "***SCRUBBED_N8N_API_KEY***"
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
        value = "REDACTED_ELEVENLABS_KEY_1"
    }
} | ConvertTo-Json -Depth 3

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials/REDACTED_GENERIC_KEY" -Method Patch -Headers $headers -Body $elevenLabsBody
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
        accountSid = "***SCRUBBED_TWILIO_SID***"
        authToken = "***SCRUBBED_TWILIO_AUTH_TOKEN***"
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
