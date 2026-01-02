$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== FETCHING CURRENT PROMPT ===" -ForegroundColor Cyan

# Get fresh prompt from API
$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$currentPrompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current prompt length: $($currentPrompt.Length) chars"

# Read cycle 4 patch (already clean UTF-8)
$patch = Get-Content -Path "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-patch-cycle4.txt" -Raw -Encoding UTF8

# Combine
$newPrompt = $currentPrompt + "`n`n" + $patch

Write-Host "New total: $($newPrompt.Length) chars"
Write-Host ""
Write-Host "=== APPLYING CYCLE 4 FIXES ===" -ForegroundColor Cyan

# Build payload
$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $newPrompt
            }
        }
    }
}

# Convert to JSON with proper encoding
$jsonPayload = $payload | ConvertTo-Json -Depth 10
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonPayload)

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $bytes
    
    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
