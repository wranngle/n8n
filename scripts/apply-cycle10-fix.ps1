$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== CYCLE 10: COMBINED RESPONSE FIX ===" -ForegroundColor Cyan

# Get current prompt
$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$prompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current prompt: $($prompt.Length) chars"

# Find and replace the old CRM fix with combined response version
$oldCrmFix = @"
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

$newCrmFix = @"
## Record Update Requests (CRITICAL - SINGLE RESPONSE)

When caller says 'update my [info]' or 'change my [info] in your system':
- Combine confirmation AND explanation in ONE response
- Say: 'Got it, [value]. I have noted that update and our team will update your records. What email should we send the confirmation to?'

**MUST include both confirmation and process explanation in the SAME response.**

Example:
- User: 'Update my phone to 555-999-1111'
- Agent: 'Got it, 555-999-1111. I have noted that update. Our team will update your records and send a confirmation. What email should we send that to?'
"@

if ($prompt.Contains("## Record Update Requests")) {
    $prompt = $prompt.Replace($oldCrmFix, $newCrmFix)
    Write-Host "Updated CRM fix to single-response format" -ForegroundColor Green
}

# Also strengthen the Multiple Decision Makers fix
$oldDecisionFix = "### Multiple Decision Makers (CRITICAL)"
$newDecisionFix = @"
### Multiple Decision Makers (CRITICAL - ACKNOWLEDGE FIRST)
When caller says 'calling for [name]' or 'on behalf of [name]':
- FIRST: Acknowledge the name: 'Got it, calling for [name].'
- THEN: Ask caller's name: 'And may I have your name?'
- Capture BOTH names

Example:
- User: 'I'm calling for my boss Karen'
- Agent: 'Got it, calling for Karen. And may I have your name?'
"@

if ($prompt.Contains($oldDecisionFix)) {
    # Find the full section and replace
    $startIdx = $prompt.IndexOf($oldDecisionFix)
    $endMarker = "`n`n###"
    $nextSection = $prompt.IndexOf($endMarker, $startIdx + 10)
    if ($nextSection -gt $startIdx) {
        $before = $prompt.Substring(0, $startIdx)
        $after = $prompt.Substring($nextSection)
        $prompt = $before + $newDecisionFix + $after
        Write-Host "Updated Decision Makers fix" -ForegroundColor Green
    }
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
