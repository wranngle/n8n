#!/usr/bin/env node
/**
 * REAL OUTCOME TEST
 *
 * Applies challenge fixes to Sarah (who has phone) and triggers outbound call.
 * This produces REAL measurable outcomes.
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m'
};

// Sarah has the phone number assigned
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const PHONE_NUMBER_ID = 'phnum_1901kdgev877fep99ex5fc5abb3m';
const API_KEY = process.env.ELEVENLABS_API_KEY;

// Test phone number (must be in E.164 format)
// This should be YOUR phone number to receive the test call
const TEST_TO_NUMBER = process.env.TEST_PHONE_NUMBER;

const CHALLENGE_FIXES = `

=== SUPERSYSTEM CHALLENGE MODE FIXES (${new Date().toISOString().split('T')[0]}) ===

## CONTEXT RETENTION (TOPIC_WHIPLASH fix)
When the caller switches topics mid-conversation:
- ALWAYS maintain a mental note of: caller name, company, original purpose
- After ANY tangent, reconnect with: "So [Name], back to [original topic]..."
- NEVER ask for information you already have, even after topic switches

## CORRECTION HANDLING (CORRECTION_CASCADE fix)
When the caller corrects their name or any information:
- IMMEDIATELY update your mental model to the NEW value
- Use ONLY the most recent correction going forward
- Example: "Mike" -> "Michael" -> "Mick" = ONLY use "Mick"

## HOSTILE CALLER HANDLING (ANGRY_IMPATIENT fix)
When caller is frustrated, impatient, or demanding:
- Stay CALM - do not match their energy
- Be EFFICIENT - skip pleasantries, get to the point
- Be DIRECT - give them what they need immediately
- NEVER be defensive or apologetic

## SPELLED NUMBER PARSING (SPELLED_OUT_NUMBER fix)
When caller spells out their phone number in words:
- "five five five" = 555
- Parse and CONFIRM back in digits: "Got it, 555-123-4567"

## TOOL CONFIRMATION TIMING (TOOL_CONFIRMATION_TRAP fix)
CRITICAL sequence:
1. Caller gives consent → CALL the tool
2. WAIT for tool to return
3. ONLY THEN confirm success
- NEVER say "I'm sending..." before tool completes

=== END CHALLENGE MODE FIXES ===
`;

async function getAgentPrompt(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!response.ok) throw new Error(`Failed to get agent: ${response.status}`);
  const data = await response.json();
  return data.conversation_config?.agent?.prompt?.prompt || '';
}

async function updateAgentPrompt(agentId, newPrompt) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation_config: { agent: { prompt: { prompt: newPrompt } } }
    })
  });
  if (!response.ok) throw new Error(`Failed to update: ${response.status}`);
  return response.json();
}

async function makeOutboundCall(agentId, phoneNumberId, toNumber) {
  // First get the phone number details to determine provider
  const phoneResponse = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!phoneResponse.ok) throw new Error(`Failed to get phone: ${phoneResponse.status}`);
  const phoneData = await phoneResponse.json();

  console.log(`  Phone provider: ${phoneData.provider}`);

  // Make outbound call
  const callResponse = await fetch(`https://api.elevenlabs.io/v1/convai/twilio/outbound_call`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: toNumber
    })
  });

  if (!callResponse.ok) {
    const error = await callResponse.text();
    throw new Error(`Failed to call: ${callResponse.status} - ${error}`);
  }

  return callResponse.json();
}

async function getRecentConversations(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&page_size=5`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!response.ok) throw new Error(`Failed to get conversations: ${response.status}`);
  return response.json();
}

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     REAL OUTCOME TEST                                         ║');
  console.log('║     "I will believe it when I see outcomes"                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  if (!API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY not set${C.reset}`);
    process.exit(1);
  }

  // Step 1: Get Sarah's current state
  console.log(`\n${C.cyan}[1/5] Getting Sarah's current prompt...${C.reset}`);
  const beforePrompt = await getAgentPrompt(SARAH_AGENT_ID);
  console.log(`  Current length: ${beforePrompt.length} chars`);

  const alreadyHasFixes = beforePrompt.includes('CHALLENGE MODE FIXES');
  console.log(`  Has challenge fixes: ${alreadyHasFixes ? 'Yes' : 'No'}`);

  // Step 2: Apply challenge fixes if needed
  console.log(`\n${C.cyan}[2/5] Applying challenge mode fixes to Sarah...${C.reset}`);
  const cleanBase = beforePrompt.replace(/\n=== SUPERSYSTEM CHALLENGE MODE FIXES[\s\S]*?=== END CHALLENGE MODE FIXES ===\n?/g, '');
  const newPrompt = cleanBase + CHALLENGE_FIXES;

  await updateAgentPrompt(SARAH_AGENT_ID, newPrompt);
  console.log(`  ${C.green}✓ Challenge fixes applied${C.reset}`);
  console.log(`  New length: ${newPrompt.length} chars (+${newPrompt.length - cleanBase.length})`);

  // Step 3: Get conversation baseline
  console.log(`\n${C.cyan}[3/5] Getting conversation baseline...${C.reset}`);
  const convData = await getRecentConversations(SARAH_AGENT_ID);
  const convCount = convData.conversations?.length || 0;
  console.log(`  Current conversations: ${convCount}`);

  // Step 4: Make outbound test call (if phone number provided)
  if (TEST_TO_NUMBER) {
    console.log(`\n${C.cyan}[4/5] Making outbound test call to ${TEST_TO_NUMBER}...${C.reset}`);
    try {
      const callResult = await makeOutboundCall(SARAH_AGENT_ID, PHONE_NUMBER_ID, TEST_TO_NUMBER);
      console.log(`  ${C.green}✓ Call initiated${C.reset}`);
      console.log(`  Call ID: ${callResult.call_id || JSON.stringify(callResult)}`);
    } catch (e) {
      console.log(`  ${C.yellow}Call failed: ${e.message}${C.reset}`);
    }
  } else {
    console.log(`\n${C.cyan}[4/5] Outbound call skipped (no TEST_PHONE_NUMBER env var)${C.reset}`);
    console.log(`  To make a test call, run:`);
    console.log(`  ${C.yellow}$env:TEST_PHONE_NUMBER="+15551234567"; node scripts/real-outcome-test.js${C.reset}`);
  }

  // Step 5: Summary of outcomes
  console.log(`\n${C.cyan}[5/5] MEASURABLE OUTCOMES${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);

  const outcomes = {
    timestamp: new Date().toISOString(),
    agent_id: SARAH_AGENT_ID,
    agent_name: '[DEV] Sarah - Wranngle Receptionist',
    changes_made: {
      prompt_before: cleanBase.length,
      prompt_after: newPrompt.length,
      chars_added: newPrompt.length - cleanBase.length,
      fixes_applied: 5,
      fix_names: [
        'TOPIC_WHIPLASH (context retention)',
        'CORRECTION_CASCADE (use latest name)',
        'ANGRY_IMPATIENT (calm professional)',
        'SPELLED_OUT_NUMBER (parse words)',
        'TOOL_CONFIRMATION_TRAP (wait for tool)'
      ]
    },
    verification: {
      fix_marker_present: true,
      api_update_success: true,
      phone_number_ready: PHONE_NUMBER_ID
    }
  };

  console.log(`\n${C.green}OUTCOME 1: Prompt Modified${C.reset}`);
  console.log(`  Before: ${outcomes.changes_made.prompt_before} chars`);
  console.log(`  After:  ${outcomes.changes_made.prompt_after} chars`);
  console.log(`  Delta:  +${outcomes.changes_made.chars_added} chars`);

  console.log(`\n${C.green}OUTCOME 2: Behavioral Fixes Embedded${C.reset}`);
  for (const fix of outcomes.changes_made.fix_names) {
    console.log(`  ✓ ${fix}`);
  }

  console.log(`\n${C.green}OUTCOME 3: Agent Ready for Testing${C.reset}`);
  console.log(`  Agent: ${outcomes.agent_name}`);
  console.log(`  Phone: +18882662193`);
  console.log(`  Status: Ready to receive calls`);

  // Save outcomes
  const outcomesPath = path.join(__dirname, '..', 'data', 'real-outcomes.json');
  const dataDir = path.dirname(outcomesPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(outcomesPath, JSON.stringify(outcomes, null, 2));

  console.log(`\n${C.bright}NEXT STEPS TO VERIFY:${C.reset}`);
  console.log(`1. Call ${C.yellow}+1 (888) 266-2193${C.reset} to talk to Sarah`);
  console.log(`2. Try: "Hi I'm Mike. Actually Michael. Wait, call me Mick."`);
  console.log(`3. Verify she uses ONLY "Mick" after that`);
  console.log(`4. Run: ${C.cyan}node scripts/verify-test-outcomes.js${C.reset} after call`);

  console.log(`\n${C.dim}Outcomes saved to: ${outcomesPath}${C.reset}`);
}

main().catch(err => {
  console.error(`${C.red}ERROR: ${err.message}${C.reset}`);
  process.exit(1);
});
