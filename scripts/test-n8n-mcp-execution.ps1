# Test n8n Instance MCP Server for Workflow Execution
# Uses the native n8n MCP server HTTP endpoint

$mcpUrl = "https://n8n.wranngle.com/mcp-server/http"
$mcpApiKey = $env:N8N_MCP_API_KEY

if (-not $mcpApiKey) {
    # Try to load from .env file
    $envPath = "C:\Users\root\.claude\.env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match "^N8N_MCP_API_KEY=(.+)$") {
                $mcpApiKey = $matches[1]
            }
        }
    }
}

if (-not $mcpApiKey) {
    Write-Host "ERROR: N8N_MCP_API_KEY not found" -ForegroundColor Red
    exit 1
}

Write-Host "Testing n8n Instance MCP Server" -ForegroundColor Cyan
Write-Host "URL: $mcpUrl" -ForegroundColor Gray
Write-Host ""

$headers = @{
    "Authorization" = "Bearer $mcpApiKey"
    "Content-Type" = "application/json"
    "Accept" = "application/json, text/event-stream"
}

# MCP JSON-RPC request to list available tools
$listToolsRequest = @{
    jsonrpc = "2.0"
    method = "tools/list"
    id = 1
} | ConvertTo-Json

Write-Host "Listing available MCP tools..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri $mcpUrl -Method POST -Headers $headers -Body $listToolsRequest -TimeoutSec 30
    Write-Host "MCP Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    # Try to get more details
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Testing workflow execution tool call..." -ForegroundColor Yellow

# MCP JSON-RPC request to execute a workflow
$executeRequest = @{
    jsonrpc = "2.0"
    method = "tools/call"
    params = @{
        name = "execute_workflow"
        arguments = @{
            workflowId = "D4GGMXFGC1PLOUT0"
            inputData = @{
                body = @{
                    agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g"
                }
            }
        }
    }
    id = 2
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $mcpUrl -Method POST -Headers $headers -Body $executeRequest -TimeoutSec 60
    Write-Host "Execution Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response Body: $responseBody" -ForegroundColor Yellow
    }
}
