$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g"
$baseUrl = "https://n8n.wranngle.com/api/v1/workflows"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

$workflows = @(
    @{ id = "oH57DNgW4SZxuDmW"; name = "Parallel Evaluation Runner" },
    @{ id = "iqZQniSfIw4CROCI"; name = "Autorefinement Orchestrator" }
)

foreach ($wf in $workflows) {
    Write-Host "Activating $($wf.name)..." -NoNewline
    try {
        $result = Invoke-RestMethod -Uri "$baseUrl/$($wf.id)/activate" -Method POST -Headers $headers
        Write-Host " OK (active: $($result.active))" -ForegroundColor Green
    } catch {
        Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDone!"
