$body = @{
    phone_number = "+15551234567"
    caller_name = "Test User"
    industry = "hvac"
    company_name = "Test HVAC Co"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://n8n.wranngle.com/webhook/send-sms" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    Write-Host "Status: $($_.Exception.Response.StatusCode.Value__)"
}
