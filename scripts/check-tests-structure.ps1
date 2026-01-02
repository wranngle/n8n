$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

# Get all tests
$testsUri = "https://api.elevenlabs.io/v1/convai/agent-testing"
$response = Invoke-RestMethod -Uri $testsUri -Method GET -Headers $headers

Write-Host "=== TESTS STRUCTURE ===" -ForegroundColor Cyan
Write-Host "Total tests: $($response.tests.Count)"
Write-Host ""

# Show first test structure
if ($response.tests.Count -gt 0) {
    Write-Host "First test keys:" -ForegroundColor Yellow
    $response.tests[0].PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)"
    }
}

Write-Host ""
Write-Host "=== ALL TEST IDS ===" -ForegroundColor Cyan
$response.tests | ForEach-Object {
    Write-Host "ID: $($_.id) | Name: $($_.name)"
}
