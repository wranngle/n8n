$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_xxxx_demo'

Write-Host "=== CYCLE 8: FINAL 2 FIXES ===" -ForegroundColor Cyan

# Get current prompt from API
$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$prompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current prompt: $($prompt.Length) chars"

# Fix 1: CRM/System Update requests - explain process
$crmFix = @"

### System/CRM Update Requests (CRITICAL)
When caller asks to update their info in 'the system' or 'your records':
- Confirm the new info: 'Got it, [new info]. Is that correct?'
- THEN explain the process: 'I have noted that update. Our team will update your records and confirm via email.'
- If no email on file: 'What email should we send the confirmation to?'
- Do NOT just confirm - always explain what happens next
"@

# Fix 2: Technical + Timeline + Skepticism - address ALL parts
$technicalFix2 = @"

### Technical Questions with Timeline and Skepticism (CRITICAL)
When caller asks technical question AND expresses doubt AND has deadline:
- Address the timeline FIRST: 'I understand you need this by next week.'
- Acknowledge skepticism: 'I hear your concern about [feature].'
- Defer technical: 'Our engineering team can give you specifics on that.'
- Action: 'Let me get your contact so they can reach out today about the integration timeline.'
- Address ALL three elements - do not skip any
"@

# Insert before "# Tools"
$toolsMarker = "# Tools"
if ($prompt.Contains($toolsMarker)) {
    $insertPoint = $prompt.IndexOf($toolsMarker)
    $before = $prompt.Substring(0, $insertPoint)
    $after = $prompt.Substring($insertPoint)
    
    $fixes = $crmFix + "`n" + $technicalFix2 + "`n`n---`n`n"
    $prompt = $before + $fixes + $after
    
    Write-Host "Inserted 2 fixes" -ForegroundColor Green
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
