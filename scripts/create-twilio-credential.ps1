# Create Twilio Credential in n8n

$apiKey = "***SCRUBBED_N8N_API_KEY***"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Create Twilio credential - without authType since schema shows it's optional
Write-Host "Creating Twilio credential..." -ForegroundColor Yellow
$twilioBody = '{
    "name": "Twilio API Credentials",
    "type": "twilioApi",
    "data": {
        "accountSid": "***SCRUBBED_TWILIO_SID***",
        "authToken": "***SCRUBBED_TWILIO_AUTH_TOKEN***"
    }
}'

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/credentials" -Method Post -Headers $headers -Body $twilioBody -ErrorAction Stop
    Write-Host "Twilio credential created successfully!" -ForegroundColor Green
    Write-Host "New Twilio credential ID: $($result.id)" -ForegroundColor Cyan
    $result | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Response: $body" -ForegroundColor Red
    }
}
