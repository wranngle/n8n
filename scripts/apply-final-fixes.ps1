$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

Write-Host "=== APPLYING FINAL 4 FIXES ===" -ForegroundColor Cyan

# Read clean prompt
$promptPath = "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\clean-prompt-with-fixes.md"
$prompt = [System.IO.File]::ReadAllText($promptPath, [System.Text.Encoding]::UTF8)

Write-Host "Base prompt: $($prompt.Length) chars"

# Fix 1: Noisy call - acknowledge key info despite noise
$noisyFix = @"

### Noisy Call with Key Information (CRITICAL)
When caller speaks through noise/accent but includes key information (title, company, need):
- FIRST: Acknowledge what you DID hear: 'I heard you mention you are the CEO...'
- THEN: Ask for clarification on unclear parts
- Do NOT ignore stated roles or titles when asking to repeat
- Example: 'I heard you are the CEO and need automation. Could you repeat the company name?'
"@

# Fix 2: Calendar availability - offer booking link
$calendarFix = @"

### Calendar/Availability Requests (CRITICAL)
When caller asks 'What times do you have available?' or 'When can we meet?':
- Do NOT just state business hours
- OFFER the booking link: 'I can text you our booking link - you will see all available slots there'
- Or: 'Would you like me to text you a link to see our available times?'
- Always pivot to actionable next step
"@

# Fix 3: Technical questions - explicit deferral
$technicalFix = @"

### Technical Questions (CRITICAL)
When caller asks specific technical questions (API, WebSocket, OAuth, integrations):
- Do NOT ignore the question
- EXPLICITLY defer: 'That is a great technical question. I will make sure our engineering team addresses that.'
- Then: 'Let me get your contact info so they can follow up with specifics.'
- Document the technical question in notes
"@

# Fix 4: Budget acknowledgment
$budgetFix = @"

### Budget Constraints (CRITICAL)
When caller mentions a budget amount:
- ALWAYS acknowledge it: 'I have noted your budget of [amount].'
- Include in recap: 'You mentioned a budget of 10K...'
- Do NOT skip over financial constraints
"@

# Insert fixes before "# Tools" section
$toolsMarker = "# Tools"
if ($prompt.Contains($toolsMarker)) {
    $insertPoint = $prompt.IndexOf($toolsMarker)
    $before = $prompt.Substring(0, $insertPoint)
    $after = $prompt.Substring($insertPoint)
    
    $allFixes = $noisyFix + "`n" + $calendarFix + "`n" + $technicalFix + "`n" + $budgetFix + "`n`n---`n`n"
    $prompt = $before + $allFixes + $after
    
    Write-Host "Inserted 4 fixes before Tools section" -ForegroundColor Green
}

Write-Host "Final prompt: $($prompt.Length) chars"

# Build and send payload
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
    
    Write-Host ""
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    
    # Save updated prompt
    $prompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\prompt-final.md" -Encoding utf8
    Write-Host "Saved to prompt-final.md"
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
