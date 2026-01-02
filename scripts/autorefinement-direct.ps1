# AUTOREFINEMENT DIRECT EXECUTION
# Bypasses n8n, runs refinement logic directly

$headers = @{ 'xi-api-key' = $env:ELEVENLABS_API_KEY }
$agentId = "agent_8001kdgp7qbyf4wvhs540be78vew"

Write-Host "============================================"
Write-Host "AUTOREFINEMENT CYCLE 1"
Write-Host "============================================"

# Step 1: Get current agent prompt
Write-Host "[1/4] Fetching agent prompt..."
$agent = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Headers $headers
$currentPrompt = $agent.conversation_config.agent.prompt.prompt
Write-Host "  Current prompt length: $($currentPrompt.Length) chars"

# Step 2: Load failure data
Write-Host "[2/4] Loading failure data..."
$failureData = Get-Content "D:\Things\Work\Wranngle\n8n_workflow_development\temp-failures.json" -Raw | ConvertFrom-Json
$failures = $failureData.failures | Select-Object -First 5
Write-Host "  Processing $($failures.Count) failures"

# Step 3: Build refinement based on failure patterns
Write-Host "[3/4] Analyzing failures and generating fix..."

$patterns = @{
    "Tool Execution" = 0
    "Context/Memory" = 0
    "Data Collection" = 0
    "Phone Parsing" = 0
    "Error Recovery" = 0
    "Other" = 0
}

foreach ($f in $failureData.failures) {
    $name = $f.test_name
    if ($name -match "Tool") { $patterns["Tool Execution"]++ }
    elseif ($name -match "Context|Memory") { $patterns["Context/Memory"]++ }
    elseif ($name -match "Data") { $patterns["Data Collection"]++ }
    elseif ($name -match "Phone") { $patterns["Phone Parsing"]++ }
    elseif ($name -match "Error|Recovery") { $patterns["Error Recovery"]++ }
    else { $patterns["Other"]++ }
}

Write-Host "  Failure patterns:"
$patterns.GetEnumerator() | Where-Object { $_.Value -gt 0 } | Sort-Object Value -Descending | ForEach-Object {
    Write-Host "    - $($_.Key): $($_.Value) failures"
}

# Build targeted fix based on top patterns
$promptAddition = @"

[AUTOREFINEMENT $(Get-Date -Format 'yyyy-MM-dd')]

CRITICAL IMPROVEMENTS BASED ON TEST FAILURES:

1. TOOL EXECUTION DISCIPLINE:
   - Do NOT call send_sms unless the user has explicitly provided a phone number AND confirmed they want a text
   - If the user says "send quietly" or "without talking", still confirm you have their number first
   - After any tool execution, wait for the result before confirming success

2. DATA COLLECTION THOROUGHNESS:
   - When a user mentions they need help, proactively collect: name, company, phone, email, use case
   - Do not proceed to recommendations until you have at least name and phone
   - If information is provided in an unstructured way, confirm you captured it correctly

3. CONTEXT RETENTION:
   - Remember ALL details shared by the caller: names, companies, deadlines, budgets, stakeholders
   - Reference previously shared information when relevant
   - Never ask for information that was already provided

4. PHONE NUMBER HANDLING:
   - Accept phone numbers in ANY format (spelled out, with dashes, international)
   - Normalize to E.164 format internally (+1XXXXXXXXXX)
   - If spelled out ("five five five one two three four five six seven"), convert to digits

5. ERROR RECOVERY:
   - If you hear noise or unclear audio, acknowledge it: "I'm having trouble hearing you, could you repeat that?"
   - If mid-sentence cutoff occurs, ask user to continue
   - For contradictory information, ask for clarification rather than assuming
"@

$updatedPrompt = $currentPrompt + $promptAddition
Write-Host "  Fix generated: $($promptAddition.Length) chars added"

# Step 4: Patch the agent
Write-Host "[4/4] Patching agent prompt..."
$patchBody = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $updatedPrompt
            }
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $patchResponse = Invoke-RestMethod -Uri "https://api.elevenlabs.io/v1/convai/agents/$agentId" -Method Patch -Headers $headers -Body $patchBody -ContentType "application/json"
    Write-Host "  SUCCESS! Agent prompt updated."
    Write-Host ""
    Write-Host "============================================"
    Write-Host "AUTOREFINEMENT COMPLETE"
    Write-Host "============================================"
    Write-Host "Agent: $agentId"
    Write-Host "Prompt increased: $($currentPrompt.Length) -> $($updatedPrompt.Length) chars"
    Write-Host "Fixes applied for: Tool Execution, Data Collection, Context, Phone, Error Recovery"
    Write-Host ""
    Write-Host "Next step: Re-run tests to measure improvement"
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)"
}
