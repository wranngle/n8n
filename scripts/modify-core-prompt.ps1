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

# Find and replace the TEXT NORMALIZATION section
$oldTextNorm = @"
# TEXT NORMALIZATION

Silent conversion between spoken and written structured data formats.

### Phone Numbers

**Spoken format:** Digit-by-digit with natural speech pauses
* Example: 'five five five... one two three... four five six seven'

**Written format:** E.164 format with country code
* Example: '+15551234567'
"@

$newTextNorm = @"
# TEXT NORMALIZATION

Convert spoken data to written format. CRITICAL: Always confirm back in DIGIT format.

### Phone Numbers

**Input:** Spoken digit-by-digit ('five five five, one two three, four five six seven')
**Output:** Digits only ('+15551234567')

**CRITICAL RULE:** When confirming phone numbers back to caller:
- NEVER repeat in spoken format ('five five five')
- ALWAYS say digits: 'Got it, 555-123-4567'
- Example: User says 'five five five, one two three, four five six seven'
  You respond: 'Got it, 555-123-4567. Is that correct?'

### Vanity Numbers
When caller says vanity numbers (1-800-FLOWERS):
- Ask: 'What is the numeric version of that number?'
- Do NOT try to interpret letter mappings

### International Numbers  
Numbers starting with 'plus' are international:
- 'plus four four' = +44 (UK)
- Confirm back in digits: 'Got it, +44 7700 900 123'
"@

# Find and replace Client Lookup section
$oldClientLookup = "If caller asks for live person: 'I can't transfer calls, but I can take your information and have someone follow up next business day.'"

$newClientLookup = @"
If caller asks for live person: 'I can't transfer calls, but I can take your information and have someone follow up next business day.'

### Existing Customer Protocol
When caller says 'I'm an existing customer' or 'calling back':
- First: Ask for identifying info: 'What phone number or email do we have on file for you?'
- Then: Proceed with their request
- Do NOT skip identification step
"@

$modifiedPrompt = $currentPrompt

# Apply TEXT NORMALIZATION fix
if ($currentPrompt.Contains("# TEXT NORMALIZATION")) {
    # Find the section and replace it
    $startIndex = $currentPrompt.IndexOf("# TEXT NORMALIZATION")
    $endMarker = "# Tools"
    $endIndex = $currentPrompt.IndexOf($endMarker, $startIndex)
    
    if ($endIndex -gt $startIndex) {
        $before = $currentPrompt.Substring(0, $startIndex)
        $after = $currentPrompt.Substring($endIndex)
        $modifiedPrompt = $before + $newTextNorm + "`n`n---`n`n" + $after
        Write-Host "TEXT NORMALIZATION section updated" -ForegroundColor Green
    }
}

# Apply Client Lookup fix
if ($modifiedPrompt.Contains($oldClientLookup)) {
    $modifiedPrompt = $modifiedPrompt.Replace($oldClientLookup, $newClientLookup)
    Write-Host "Client Lookup section updated" -ForegroundColor Green
}

Write-Host ""
Write-Host "Modified prompt length: $($modifiedPrompt.Length) chars"
Write-Host ""
Write-Host "=== APPLYING MODIFIED PROMPT ===" -ForegroundColor Cyan

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
    
    # Save modified prompt
    $modifiedPrompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-cycle5.txt" -Encoding utf8
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
