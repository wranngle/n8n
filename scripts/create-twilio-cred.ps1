$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
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
        accountSid = "ACb9a3b7df2dfe607099bd0ce0e6ae47e1"
        authToken = "a5d7bfaa399fae6df2ef2f572e7f06fb"
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
