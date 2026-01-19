# n8n Tag Utility Script
# =======================
# Consolidated utility for managing n8n workflow tags via direct API.
# Required because n8n-mcp addTag operation has a bug (returns success but doesn't persist).
#
# Usage:
#   .\n8n-tag-utility.ps1 -Action apply-tag -WorkflowId "xxx" -TagId "yyy"
#   .\n8n-tag-utility.ps1 -Action remove-tag -WorkflowId "xxx" -TagId "yyy"
#   .\n8n-tag-utility.ps1 -Action list-tags -WorkflowId "xxx"
#   .\n8n-tag-utility.ps1 -Action deactivate -WorkflowId "xxx"
#   .\n8n-tag-utility.ps1 -Action activate -WorkflowId "xxx"
#
# Known Tag IDs:
#   DEV:      Nbnc0KJVYlJeasQJ
#   ARCHIVED: 4k9QbQQTpxNkOoJQ

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("apply-tag", "remove-tag", "list-tags", "deactivate", "activate")]
    [string]$Action,
    
    [Parameter(Mandatory=$true)]
    [string]$WorkflowId,
    
    [string]$TagId
)

$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

function Invoke-SafeRestMethod {
    param($Uri, $Method, $Body)
    try {
        if ($Body) {
            return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method -Body $Body
        } else {
            return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method
        }
    } catch {
        $response = $_.Exception.Response
        if ($response) {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            $reader.BaseStream.Position = 0
            Write-Host "ERROR: $($reader.ReadToEnd())" -ForegroundColor Red
        } else {
            Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        }
        return $null
    }
}

switch ($Action) {
    "apply-tag" {
        if (-not $TagId) { Write-Host "ERROR: -TagId required for apply-tag" -ForegroundColor Red; exit 1 }
        Write-Host "Applying tag $TagId to workflow $WorkflowId..."
        $body = "[{`"id`":`"$TagId`"}]"
        $result = Invoke-SafeRestMethod -Uri "$baseUrl/workflows/$WorkflowId/tags" -Method PUT -Body $body
        if ($result) {
            Write-Host "SUCCESS: Tag applied" -ForegroundColor Green
            $result | ConvertTo-Json -Depth 3
        }
    }
    
    "remove-tag" {
        if (-not $TagId) { Write-Host "ERROR: -TagId required for remove-tag" -ForegroundColor Red; exit 1 }
        Write-Host "Removing tag $TagId from workflow $WorkflowId..."
        # To remove a tag, we apply empty array
        $body = "[]"
        $result = Invoke-SafeRestMethod -Uri "$baseUrl/workflows/$WorkflowId/tags" -Method PUT -Body $body
        if ($result) {
            Write-Host "SUCCESS: Tags cleared" -ForegroundColor Green
        }
    }
    
    "list-tags" {
        Write-Host "Getting tags for workflow $WorkflowId..."
        $result = Invoke-SafeRestMethod -Uri "$baseUrl/workflows/$WorkflowId" -Method GET
        if ($result) {
            Write-Host "Tags:" -ForegroundColor Cyan
            $result.tags | ForEach-Object { Write-Host "  - $($_.name) ($($_.id))" }
        }
    }
    
    "deactivate" {
        Write-Host "Deactivating workflow $WorkflowId..."
        $result = Invoke-SafeRestMethod -Uri "$baseUrl/workflows/$WorkflowId/deactivate" -Method POST
        if ($result) {
            Write-Host "SUCCESS: Workflow deactivated" -ForegroundColor Green
        }
    }
    
    "activate" {
        Write-Host "Activating workflow $WorkflowId..."
        $result = Invoke-SafeRestMethod -Uri "$baseUrl/workflows/$WorkflowId/activate" -Method POST
        if ($result) {
            Write-Host "SUCCESS: Workflow activated" -ForegroundColor Green
        }
    }
}
