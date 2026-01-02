$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

$agentId = 'agent_xxxx_demo'

# Read current prompt (with cycle 3) and new patch
$currentPrompt = Get-Content -Path "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\updated-prompt.txt" -Raw
$patch = Get-Content -Path "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-patch-cycle4.txt" -Raw

# Combine
$newPrompt = $currentPrompt + "`n`n" + $patch

Write-Host "=== APPLYING CYCLE 4 FIXES ===" -ForegroundColor Cyan
Write-Host "Previous prompt: $($currentPrompt.Length) chars"
Write-Host "Cycle 4 patch: $($patch.Length) chars"
Write-Host "New total: $($newPrompt.Length) chars"

$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $newPrompt
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $payload
    
    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    
    $newPrompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-cycle4.txt" -Encoding utf8
    Write-Host "Prompt saved to prompt-cycle4.txt"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
