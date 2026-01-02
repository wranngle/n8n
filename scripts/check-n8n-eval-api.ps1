$headers = @{
    'X-N8N-API-KEY' = $env:N8N_API_KEY
}

Write-Host "=== CHECKING N8N API ENDPOINTS ===" -ForegroundColor Cyan

# Check what API endpoints exist
try {
    # Try to get evaluation-related endpoints
    $baseUrl = "https://n8n.wranngle.com/api/v1"
    
    # List available endpoints by checking common ones
    $endpoints = @(
        "/workflows",
        "/executions", 
        "/credentials",
        "/tags",
        "/evaluations",
        "/data-tables",
        "/datasets"
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl$endpoint" -Headers $headers -Method GET -ErrorAction SilentlyContinue
            Write-Host "[OK] $endpoint - Status: $($response.StatusCode)" -ForegroundColor Green
        } catch {
            $status = $_.Exception.Response.StatusCode.value__
            if ($status -eq 404) {
                Write-Host "[404] $endpoint - Not Found" -ForegroundColor Yellow
            } else {
                Write-Host "[ERR] $endpoint - $status" -ForegroundColor Red
            }
        }
    }
    
    # Check workflow for evaluation config
    Write-Host ""
    Write-Host "=== CHECKING WORKFLOW EVALUATION STATUS ===" -ForegroundColor Cyan
    $workflowId = "oik6SebewNAh1cV5"
    
    $wfResponse = Invoke-RestMethod -Uri "$baseUrl/workflows/$workflowId" -Headers $headers -Method GET
    Write-Host "Workflow: $($wfResponse.name)"
    Write-Host "Active: $($wfResponse.active)"
    Write-Host "Nodes: $($wfResponse.nodes.Count)"
    
    # Check for evaluation-related nodes
    $evalNodes = $wfResponse.nodes | Where-Object { $_.type -match "evaluation" }
    Write-Host "Evaluation nodes: $($evalNodes.Count)"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
