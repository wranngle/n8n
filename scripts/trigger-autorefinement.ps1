# Read the failure data
$failureJson = Get-Content "D:\Things\Work\Wranngle\n8n_workflow_development\temp-failures.json" -Raw

# Trigger autorefinement workflow (test webhook for inactive workflow)
$webhookUrl = "https://n8n.wranngle.com/webhook-test/autorefinement-trigger"

Write-Host "Triggering autorefinement at: $webhookUrl"
Write-Host "Payload size: $($failureJson.Length) bytes"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $failureJson -ContentType "application/json" -TimeoutSec 120
    Write-Host "SUCCESS!"
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody"
    }
}
