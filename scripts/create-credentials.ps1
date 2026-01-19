# Create n8n Credentials Script

$apiKey = "***SCRUBBED_N8N_API_KEY***"
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
        value = "REDACTED_ELEVENLABS_KEY_1"
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
