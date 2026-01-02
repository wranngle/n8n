#!/usr/bin/env node
/**
 * APPLY SMS FIX V2 - Stronger end-of-call discipline
 * 
 * The bug: Agent calls send_sms AFTER saying goodbye, even when user declined.
 * This fix explicitly addresses end-of-call routine behavior.
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

const STRONGER_SMS_FIX = `

=== SUPERSYSTEM FIX v2: SMS END-OF-CALL DISCIPLINE (2025-12-30) ===

## CRITICAL: send_sms IS NOT AN END-OF-CALL ROUTINE

### THE BUG WE ARE FIXING:
You have been calling send_sms AFTER saying goodbye, even when the caller DECLINED.
This is a CONSENT VIOLATION. It must stop.

### ABSOLUTE RULES:

1. **send_sms is OPT-IN ONLY**
   - send_sms requires EXPLICIT verbal consent: "yes", "sure", "text me", "go ahead"
   - "No thanks", "I prefer email", "just tell me" = CONSENT DENIED = NO send_sms EVER

2. **VERBAL URL = TASK COMPLETE**
   - If you said "wranngle dot com" or provided the URL verbally, you are DONE
   - Do NOT follow up with send_sms
   - Verbal provision is the alternative when SMS is declined

3. **END OF CALL SEQUENCE**
   - When call is ending, the ONLY tool you should call is end_call
   - NEVER call send_sms as part of ending the call
   - If SMS was declined, the answer is FINAL - do not reconsider

4. **MENTAL STATE CHECK BEFORE send_sms**
   Before EVER calling send_sms, ask yourself:
   - Did caller explicitly say "yes" to SMS? If NO → DO NOT CALL
   - Did caller say "no thanks" or "I prefer email"? If YES → DO NOT CALL
   - Did I already provide the URL verbally? If YES → DO NOT CALL

### EXAMPLES OF DECLINED CONSENT:
- "No thanks, I prefer email" → DO NOT call send_sms
- "Just tell me the URL" → DO NOT call send_sms (give URL verbally instead)
- "I'll look it up" → DO NOT call send_sms

### CORRECT END-OF-CALL WHEN SMS DECLINED:
User: "No thanks, I prefer email"
You: "No problem! You can find us at wranngle dot com. Have a great day!"
[Call ends - ONLY call end_call, NEVER send_sms]

=== END FIX v2 ===
`;

async function applyFix() {
  console.log('=== APPLYING SMS FIX V2 ===\n');
  
  // Get current prompt
  const getResp = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  const data = await getResp.json();
  const currentPrompt = data.conversation_config?.agent?.prompt?.prompt || '';
  
  console.log('Current prompt length:', currentPrompt.length, 'chars');
  
  // Remove old SMS fixes (v1 and v2)
  let cleanPrompt = currentPrompt
    .replace(/\n=== SUPERSYSTEM FIX: SMS DECLINED[\s\S]*?=== END FIX ===\n?/g, '')
    .replace(/\n=== SUPERSYSTEM FIX v2: SMS END-OF-CALL[\s\S]*?=== END FIX v2 ===\n?/g, '');
  
  console.log('After removing old fixes:', cleanPrompt.length, 'chars');
  
  // Apply new stronger fix
  const newPrompt = cleanPrompt + STRONGER_SMS_FIX;
  
  console.log('After applying v2 fix:', newPrompt.length, 'chars');
  console.log('Delta: +' + (newPrompt.length - cleanPrompt.length) + ' chars\n');
  
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
  
  console.log('✓ SMS FIX V2 APPLIED SUCCESSFULLY');
  console.log('\nFix targets:');
  console.log('  - End-of-call send_sms routine disabled');
  console.log('  - Verbal URL = task complete');
  console.log('  - Mental state check before send_sms');
  console.log('\nRun verification: node tests/run-simulations.js --id sms-declined-no-notification');
}

applyFix().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
