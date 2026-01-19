$apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs"
$baseUrl = "https://n8n.wranngle.com/api/v1"

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

# Tag IDs
$devTagId = "Nbnc0KJVYlJeasQJ"
$archivedTagId = "4k9QbQQTpxNkOoJQ"

# Workflows needing DEV tag
$devWorkflows = @(
    "4TqaQ6kORDzZVwVP",
    "54sXqqJVSctlSF6V",
    "5hvmE72qa4VYyPOK",
    "KoQChBtjUa5F9bZg",
    "KrqpJuyN8pjTouAo",
    "M7ZmLGCxyVOn5QJ6",
    "NBvO92RVDa8pCK0d",
    "RjLiUAiuUs5XPvBj",
    "SjItj6uzYSr9rotM",
    "c9dFlI51VhvANoEj",
    "paneUFRzPscNvih2",
    "zeQNX4g5mQlE4EQ0"
)

# Workflows needing ARCHIVED tag
$archivedWorkflows = @(
    "8zxKBJH4QiwzhNtf",
    "Xlr1brwbzNPMyTbW"
)

# Tag swap workflow (remove DEV, add ARCHIVED)
$tagSwapWorkflow = "IZIj5oh3VwCVJb34"

Write-Host "=== n8n Tag Application Script ==="
Write-Host "API: $baseUrl"
Write-Host ""

# Function to set workflow tags via PUT /workflows/{id}/tags
function Set-WorkflowTags {
    param($workflowId, $tagIds, $description)

    try {
        # Build JSON array of tag objects
        $tagArray = $tagIds | ForEach-Object { "{`"id`":`"$_`"}" }
        $body = "[" + ($tagArray -join ",") + "]"

        $result = Invoke-RestMethod -Uri "$baseUrl/workflows/$workflowId/tags" -Headers $headers -Method PUT -Body $body
        Write-Host "  [OK] $workflowId - $description"
        return $true
    } catch {
        $response = $_.Exception.Response
        if ($response) {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            $reader.BaseStream.Position = 0
            $responseBody = $reader.ReadToEnd()
            Write-Host "  [FAIL] $workflowId - $responseBody"
        } else {
            Write-Host "  [FAIL] $workflowId - $($_.Exception.Message)"
        }
        return $false
    }
}

# Apply DEV tags
Write-Host "Applying DEV tags to $($devWorkflows.Count) workflows..."
$devSuccess = 0
foreach ($wf in $devWorkflows) {
    if (Set-WorkflowTags -workflowId $wf -tagIds @($devTagId) -description "Added DEV tag") {
        $devSuccess++
    }
}

# Apply ARCHIVED tags
Write-Host "`nApplying ARCHIVED tags to $($archivedWorkflows.Count) workflows..."
$archivedSuccess = 0
foreach ($wf in $archivedWorkflows) {
    if (Set-WorkflowTags -workflowId $wf -tagIds @($archivedTagId) -description "Added ARCHIVED tag") {
        $archivedSuccess++
    }
}

# Tag swap: Replace DEV with ARCHIVED
Write-Host "`nSwapping tag for $tagSwapWorkflow (DEV -> ARCHIVED)..."
$swapSuccess = Set-WorkflowTags -workflowId $tagSwapWorkflow -tagIds @($archivedTagId) -description "Swapped DEV -> ARCHIVED"

Write-Host "`n=== SUMMARY ==="
Write-Host "DEV tags applied: $devSuccess / $($devWorkflows.Count)"
Write-Host "ARCHIVED tags applied: $archivedSuccess / $($archivedWorkflows.Count)"
Write-Host "Tag swap: $(if ($swapSuccess) { 'SUCCESS' } else { 'FAILED' })"
Write-Host ""
Write-Host "Total: $($devSuccess + $archivedSuccess + $(if ($swapSuccess) { 1 } else { 0 })) / 15 workflows tagged"
