$webhookUrl = "https://n8n.wranngle.com/webhook/parallel-eval-runner"

Write-Host "=========================================="
Write-Host "TRIGGERING PARALLEL EVALUATION RUNNER"
Write-Host "=========================================="
Write-Host "Webhook: $webhookUrl"
Write-Host "Tests: 12 (embedded sample)"
Write-Host ""

$body = @{
    limit = 100
    batch_size = 4
    target_webhook = "https://n8n.wranngle.com/webhook/client-lookup-test"
} | ConvertTo-Json

Write-Host "Request body:"
Write-Host $body
Write-Host ""
Write-Host "Sending request..."
Write-Host ""

$startTime = Get-Date

try {
    $result = Invoke-RestMethod -Uri $webhookUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 120
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "=========================================="
    Write-Host "EVALUATION RESULTS"
    Write-Host "=========================================="
    Write-Host "Duration: $([math]::Round($duration, 2)) seconds"
    Write-Host ""
    $result | ConvertTo-Json -Depth 10
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host $reader.ReadToEnd()
    }
}
