# REVERT CYCLE 2 AND APPLY SURGICAL FIX
$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_xxxx_demo"

Write-Host "============================================"
Write-Host "REVERTING CYCLE 2 - SURGICAL APPROACH"
Write-Host "============================================"

# Get current prompt
$agent = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Headers $headers
$currentPrompt = $agent.conversation_config.agent.prompt.prompt

# Remove cycle 2 addition (everything after [AUTOREFINEMENT CYCLE 2)
$cycle2Marker = "[AUTOREFINEMENT CYCLE 2"
$idx = $currentPrompt.IndexOf($cycle2Marker)
if ($idx -gt 0) {
    $revertedPrompt = $currentPrompt.Substring(0, $idx).TrimEnd()
    Write-Host "Reverted: $($currentPrompt.Length) -> $($revertedPrompt.Length) chars"
} else {
    $revertedPrompt = $currentPrompt
    Write-Host "No cycle 2 marker found, keeping current prompt"
}

# Apply MINIMAL surgical fixes based on actual failure patterns
$surgicalFix = @"

[AUTOREFINEMENT CYCLE 2 - SURGICAL $(Get-Date -Format 'yyyy-MM-dd')]

TARGETED FIXES (minimal, non-conflicting):

1. SPELLED PHONE NUMBERS: Convert spoken numbers to digits.
   "five five five" = 555. Confirm: "That's 555-123-4567, correct?"

2. ACKNOWLEDGE PREVIOUS CALLS: If user says "I called before", say:
   "Welcome back! Let me help you pick up where we left off."

3. INCOMPLETE INPUT: If user's message seems cut off, ask:
   "It sounds like you got cut off - could you finish that thought?"

4. EXISTING CUSTOMERS: If user says "I'm already a customer", acknowledge:
   "Great to hear from you again! Let me pull up your account."
"@

$updatedPrompt = $revertedPrompt + $surgicalFix
Write-Host "Applied surgical fix: $($surgicalFix.Length) chars"
Write-Host "Final prompt: $($updatedPrompt.Length) chars"

# Patch
$patchBody = @{
    conversation_config = @{
        agent = @{
            prompt = @{ prompt = $updatedPrompt }
        }
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Method Patch -Headers $headers -Body $patchBody -ContentType "application/json" | Out-Null
Write-Host "Agent updated successfully!"
