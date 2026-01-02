# AUTOREFINEMENT CYCLE 2
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_8001kdgp7qbyf4wvhs540be78vew"
$invocationId = "suite_8801kds3gevqf0ct14sgws7qaz0a"

Write-Host "============================================"
Write-Host "AUTOREFINEMENT CYCLE 2"
Write-Host "============================================"

# Get failures from cycle 1 retest
$inv = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/test-invocations/$invocationId" -Headers $headers
$failures = $inv.test_runs | Where-Object { $_.status -eq 'failed' }
Write-Host "Analyzing $($failures.Count) remaining failures..."

# Categorize failures
$categories = @{}
foreach ($f in $failures) {
    $name = $f.test_name
    $rationale = $f.condition_result.rationale.summary
    Write-Host "  - $name"
    Write-Host "    Reason: $rationale"
}

# Get current agent prompt
$agent = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Headers $headers
$currentPrompt = $agent.conversation_config.agent.prompt.prompt

# Build cycle 2 fix
$promptAddition = @"

[AUTOREFINEMENT CYCLE 2 - $(Get-Date -Format 'yyyy-MM-dd HH:mm')]

ADDITIONAL CRITICAL RULES:

1. SILENT TOOL EXECUTION:
   - When user says "send quietly" or "without commentary", execute tool with minimal verbal response
   - Do NOT narrate every step - just confirm completion briefly
   - Example: "Done, I've sent that to you" (not "I'm now calling the SMS function to send...")

2. MULTI-STAKEHOLDER CAPTURE:
   - When caller mentions other people (boss, CTO, partner, decision maker), capture ALL names
   - Ask: "And may I get your name as well?" if caller gives stakeholder name but not their own
   - Track: caller name, company, all stakeholders mentioned, their roles

3. PHONE NUMBER INTERPRETATION:
   - "Five five five" = 555, "one two three" = 123
   - Convert ALL spelled numbers to digits before processing
   - Confirm back in digit format: "Just to confirm, that's 555-123-4567?"

4. PREVIOUS INTERACTION AWARENESS:
   - If user says "I called before" or "we spoke yesterday", acknowledge it
   - Response: "Welcome back! Let me pull up our previous conversation notes..."
   - Don't ignore references to prior interactions

5. WEBHOOK/INBOUND CONTEXT:
   - If caller mentions email campaign, ad, or referral source, acknowledge it
   - "Thanks for reaching out from our email campaign! How can I help?"

6. CONTRADICTORY INFORMATION:
   - If user gives conflicting info (e.g., "Monday... wait, Tuesday"), ASK for clarification
   - "I want to make sure I have the right day - did you mean Monday or Tuesday?"
   - NEVER assume or pick one without confirming

7. RAPID-FIRE QUESTIONS:
   - When user asks multiple questions at once, address EACH one
   - "Great questions! Let me answer each: First, regarding pricing..."
   - Don't only respond to the first or last question

8. CHANNEL TRANSITIONS:
   - If user asks for email, acknowledge you can only do SMS currently
   - "I can send that info via text message right now. Would that work?"
"@

$updatedPrompt = $currentPrompt + $promptAddition
Write-Host ""
Write-Host "Applying cycle 2 fixes ($($promptAddition.Length) chars)..."

# Patch agent
$patchBody = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $updatedPrompt
            }
        }
    }
} | ConvertTo-Json -Depth 10

$result = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Method Patch -Headers $headers -Body $patchBody -ContentType "application/json"
Write-Host "Agent updated! Prompt: $($currentPrompt.Length) -> $($updatedPrompt.Length) chars"
Write-Host ""
Write-Host "Cycle 2 complete. Ready for re-test."
