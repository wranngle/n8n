#!/usr/bin/env node
/**
 * CLEAN SMS FIX - Remove ALL conflicting instructions and apply unified policy
 * 
 * The bug: Multiple conflicting instructions about send_sms:
 * - Old fix says "IMMEDIATELY call send_sms"
 * - New fix says "DON'T call send_sms when declined"
 * 
 * Solution: Remove ALL old SMS-related fixes and apply ONE clean policy.
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Single unified SMS policy - replaces ALL previous SMS fixes
const UNIFIED_SMS_POLICY = `

=== UNIFIED SMS POLICY (2025-12-30) ===

## send_sms TOOL GOVERNANCE

### RULE 1: EXPLICIT CONSENT REQUIRED
The send_sms tool requires EXPLICIT verbal consent. Look for:
- "yes" / "yeah" / "sure" / "okay" 
- "text me" / "send it" / "go ahead"

### RULE 2: DECLINED = NEVER CALL
If caller says ANY of these, NEVER call send_sms:
- "no" / "nope" / "no thanks"
- "I prefer email" / "email instead"
- "just tell me" / "I'll look it up"

### RULE 3: VERBAL URL = COMPLETE
If you provided the URL verbally (e.g., "wranngle dot com"), the task is DONE.
Do NOT call send_sms after providing URL verbally.

### RULE 4: END-OF-CALL RESTRICTION
When ending the call:
- If SMS was DECLINED earlier → call ONLY end_call, NEVER send_sms
- The send_sms tool is NOT part of the call closing sequence

### DECISION TREE:
1. Did caller say YES to SMS? 
   - NO → DO NOT call send_sms
   - YES → Continue to step 2
2. Do I have their phone number?
   - NO → Ask for it, then call send_sms
   - YES → Call send_sms

### EXAMPLES:
User: "Would you like me to text you the link?"
Caller: "No thanks, I prefer email"
→ Say: "No problem! The link is wranngle dot com."
→ DO NOT call send_sms at any point
→ When call ends, call ONLY end_call

=== END UNIFIED SMS POLICY ===
`;

async function cleanAndApplyFix() {
  console.log('=== CLEAN SMS FIX ===\n');
  console.log('Removing all conflicting instructions...\n');
  
  // Get current prompt
  const getResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  const data = await getResp.json();
  let prompt = data.conversation_config?.agent?.prompt?.prompt || '';
  
  console.log('Original length:', prompt.length, 'chars');
  
  // Remove ALL supersystem fixes related to SMS
  const patterns = [
    // Old immediate SMS fix
    /\[SUPERSYSTEM-FIX [^\]]+\] CRITICAL: When caller provides phone and agrees to receive SMS[\s\S]*?Do NOT wait or confirm\.\n?/g,
    // SMS Permission Protocol section
    /## CRITICAL: SMS Permission Protocol[\s\S]*?If unclear, ASK AGAIN[^\n]*\n/g,
    // Required Data Collection section mentioning send_sms
    /## CRITICAL: Required Data Collection Checklist[\s\S]*?Don't guess or skip\.\n/g,
    // Old SMS declined fix v1
    /\n=== SUPERSYSTEM FIX: SMS DECLINED[\s\S]*?=== END FIX ===\n?/g,
    // Old SMS fix v2
    /\n=== SUPERSYSTEM FIX v2: SMS END-OF-CALL[\s\S]*?=== END FIX v2 ===\n?/g,
  ];
  
  let cleanedPrompt = prompt;
  let removedCount = 0;
  
  for (const pattern of patterns) {
    const before = cleanedPrompt.length;
    cleanedPrompt = cleanedPrompt.replace(pattern, '\n');
    if (cleanedPrompt.length < before) {
      removedCount++;
      console.log(`  Removed pattern ${removedCount}: -${before - cleanedPrompt.length} chars`);
    }
  }
  
  // Also remove any "IMMEDIATELY call send_sms" standalone instructions
  cleanedPrompt = cleanedPrompt.replace(/IMMEDIATELY call send_sms[^.]*\./g, '');
  
  console.log('\nAfter cleanup:', cleanedPrompt.length, 'chars');
  console.log('Removed:', prompt.length - cleanedPrompt.length, 'chars of conflicting instructions');
  
  // Apply unified policy
  const newPrompt = cleanedPrompt + UNIFIED_SMS_POLICY;
  
  console.log('After adding unified policy:', newPrompt.length, 'chars');
  console.log('Net change:', newPrompt.length - prompt.length, 'chars\n');
  
  // Update agent
  const updateResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { prompt: newPrompt } } }
    })
  });
  
  if (!updateResp.ok) {
    console.log('FAILED:', updateResp.status);
    const err = await updateResp.text();
    console.log(err);
    process.exit(1);
  }
  
  console.log('✓ CLEAN SMS FIX APPLIED');
  console.log('\nKey changes:');
  console.log('  1. Removed "IMMEDIATELY call send_sms" instruction');
  console.log('  2. Removed conflicting SMS permission sections');
  console.log('  3. Applied single unified SMS policy');
  console.log('  4. Clear decision tree for send_sms');
  console.log('\nRun verification: node tests/run-simulations.js --id sms-declined-no-notification');
}

cleanAndApplyFix().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
