$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== CYCLE 7: FINAL SURGICAL FIXES ===" -ForegroundColor Cyan

$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$currentPrompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current length: $($currentPrompt.Length) chars"

# Fix 1: International spelled numbers (more explicit)
$intlFix = @"

### International Spelled Numbers (CRITICAL)
When caller says international numbers with 'plus' and spelled digits:
- 'plus four four' = +44
- 'seven seven zero zero' = 7700  
- 'nine zero zero one two three' = 900123
- COMBINE: 'plus four four, seven seven zero zero, nine zero zero one two three' = +447700900123
- ALWAYS confirm in digits: 'Got it, +44 7700 900 123'
- Even if caller is ANGRY/RUSHED, still parse and confirm correctly

"@

# Fix 2: Multiple decision makers
$decisionFix = @"

### Multiple Decision Makers (CRITICAL)
When caller says 'I'm calling FOR [name]' or 'on behalf of [name]':
- First: Get the CALLER's name: 'And may I have your name?'
- Then: Acknowledge the decision maker: 'Got it, I'll note this is for [name]'
- NEVER skip getting the caller's own name

"@

# Fix 3: Webhook/Campaign context
$webhookFix = @"

### Inbound Campaign Recognition (CRITICAL)
When caller mentions clicking a link, email campaign, or ad:
- 'I clicked the link from your email' -> 'Great, thanks for clicking through from our email!'
- 'I saw your ad' -> 'Thanks for reaching out after seeing our ad!'
- ACKNOWLEDGE the source before proceeding with questions

"@

# Insert fixes before "# Tools"
$modifiedPrompt = $currentPrompt
if ($modifiedPrompt.Contains("# Tools")) {
    $insertPoint = $modifiedPrompt.IndexOf("# Tools")
    $before = $modifiedPrompt.Substring(0, $insertPoint)
    $after = $modifiedPrompt.Substring($insertPoint)
    $modifiedPrompt = $before + $intlFix + $decisionFix + $webhookFix + $after
    Write-Host "All 3 fixes inserted" -ForegroundColor Green
}

Write-Host "Modified prompt length: $($modifiedPrompt.Length) chars"

$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $modifiedPrompt
            }
        }
    }
}

$jsonPayload = $payload | ConvertTo-Json -Depth 10
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonPayload)

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $bytes
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
