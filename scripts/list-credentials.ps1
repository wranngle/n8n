$apiKey = "***SCRUBBED_N8N_API_KEY***"
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
