$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json'
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

# Read the current prompt and patch
$currentPrompt = Get-Content -Path "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\current-prompt.txt" -Raw
$patch = Get-Content -Path "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-patch.txt" -Raw

# Combine them
$newPrompt = $currentPrompt + "`n`n" + $patch

Write-Host "=== UPDATING AGENT PROMPT ===" -ForegroundColor Cyan
Write-Host "Current prompt length: $($currentPrompt.Length) chars"
Write-Host "Patch length: $($patch.Length) chars"
Write-Host "New prompt length: $($newPrompt.Length) chars"

# Build the update payload - only updating the prompt
$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $newPrompt
            }
        }
    }
} | ConvertTo-Json -Depth 10

# Save payload for debugging
$payload | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\update-payload.json" -Encoding utf8

Write-Host ""
Write-Host "Sending update to ElevenLabs API..." -ForegroundColor Yellow

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $payload
    
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    
    # Save new prompt
    $newPrompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\updated-prompt.txt" -Encoding utf8
    Write-Host "New prompt saved to updated-prompt.txt"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
