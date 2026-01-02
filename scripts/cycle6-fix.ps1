$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

Write-Host "=== FETCHING CURRENT PROMPT ===" -ForegroundColor Cyan

$getUri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
$agentResponse = Invoke-RestMethod -Uri $getUri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
$currentPrompt = $agentResponse.conversation_config.agent.prompt.prompt

Write-Host "Current length: $($currentPrompt.Length) chars"

# Fix Vanity Number section - change from "ask" to "convert"
$oldVanity = @"
### Vanity Numbers
When caller says vanity numbers (1-800-FLOWERS):
- Ask: 'What is the numeric version of that number?'
- Do NOT try to interpret letter mappings
"@

$newVanity = @"
### Vanity Numbers
When caller says vanity numbers (1-800-FLOWERS):
- Recognize and convert: 1-800-FLOWERS = 1-800-356-9377
- Common vanity mappings: ABC=2, DEF=3, GHI=4, JKL=5, MNO=6, PQRS=7, TUV=8, WXYZ=9
- Confirm: 'That's 1-800-356-9377, correct?'
- If unsure: Say 'I recognized that as a vanity number. What is the numeric version?'
"@

# Add Multi-Channel section
$channelFix = @"

### Multi-Channel Handoff
When caller asks to continue via email:
- Acknowledge their preference: 'I understand you prefer email.'
- Provide email address: 'You can reach us at hello@wranngle.com'
- Offer: 'I can also have someone email you. What's your email address?'
- Do NOT say 'I can't send emails' - instead focus on getting them connected
"@

$modifiedPrompt = $currentPrompt

# Apply Vanity fix
if ($modifiedPrompt.Contains($oldVanity)) {
    $modifiedPrompt = $modifiedPrompt.Replace($oldVanity, $newVanity)
    Write-Host "Vanity Number section updated" -ForegroundColor Green
}

# Add Multi-Channel fix before "# Tools" section
if ($modifiedPrompt.Contains("# Tools") -and -not $modifiedPrompt.Contains("### Multi-Channel Handoff")) {
    $modifiedPrompt = $modifiedPrompt.Replace("# Tools", $channelFix + "`n`n# Tools")
    Write-Host "Multi-Channel section added" -ForegroundColor Green
}

Write-Host ""
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
    
    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
