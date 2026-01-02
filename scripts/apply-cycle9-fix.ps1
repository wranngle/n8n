$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== CYCLE 9: CRM UPDATE FIX ===" -ForegroundColor Cyan

# Get current prompt
$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$prompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current prompt: $($prompt.Length) chars"

# Stronger CRM fix - add to GUARDRAILS section for priority
$crmFix = @"

## Record Update Requests (CRITICAL - MUST FOLLOW)

When caller says 'update my [info]' or 'change my [info] in your system':
1. CONFIRM the new value: 'Got it, [value]. Is that correct?'
2. IMMEDIATELY AFTER confirmation, EXPLAIN the process:
   - Say: 'I have noted that change. Our team will update your records and send you a confirmation.'
3. If email needed for confirmation, ask: 'What email should we send the confirmation to?'

**NEVER stop after just confirming the value. ALWAYS explain what happens next.**

Example:
- User: 'Update my phone to 555-999-1111'
- Agent: 'Got it, 555-999-1111. Is that correct?' [wait for yes]
- Agent: 'Perfect. I have noted that update. Our team will update your records and send a confirmation. Is there anything else I can help with?'

"@

# Insert in GUARDRAILS section for higher priority
$guardrailsMarker = "# GUARDRAILS"
if ($prompt.Contains($guardrailsMarker)) {
    $insertPoint = $prompt.IndexOf($guardrailsMarker) + $guardrailsMarker.Length
    $before = $prompt.Substring(0, $insertPoint)
    $after = $prompt.Substring($insertPoint)
    
    $prompt = $before + "`n" + $crmFix + $after
    
    Write-Host "Inserted CRM fix in GUARDRAILS section" -ForegroundColor Green
}

Write-Host "Final prompt: $($prompt.Length) chars"

# Upload
$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $prompt
            }
        }
    }
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10 -Compress
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonPayload)

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $bytes
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
