$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Create Twilio credential with authType
$twilioBody = @{
    name = "Twilio API Credentials"
    type = "twilioApi"
    data = @{
        authType = "authToken"
        accountSid = "***SCRUBBED_TWILIO_SID***"
        authToken = "***SCRUBBED_TWILIO_AUTH_TOKEN***"
    }
} | ConvertTo-Json -Depth 3

Write-Host "Creating Twilio credential..." -ForegroundColor Yellow
Write-Host "Body: $twilioBody" -ForegroundColor Gray

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials" -Method Post -Headers $headers -Body $twilioBody
    Write-Host "Twilio credential created successfully!" -ForegroundColor Green
    Write-Host "Credential ID: $($result.id)" -ForegroundColor Cyan
    $result | ConvertTo-Json
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Error ($statusCode): $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
