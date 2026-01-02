#!/usr/bin/env node
/**
 * APPLY CHALLENGE MODE FIXES
 *
 * Targeted fixes for the 5 specific failures from challenge mode:
 * 1. TOPIC_WHIPLASH - Context lost on topic switches
 * 2. CORRECTION_CASCADE - Agent uses OLD name after corrections
 * 3. ANGRY_IMPATIENT - Tone issues with frustrated callers
 * 4. SPELLED_OUT_NUMBER - Can't parse spelled numbers
 * 5. TOOL_CONFIRMATION_TRAP - Confirms before tool returns
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

// Target agent - Lead Qualifier
const AGENT_ID = 'agent_5701kdgf9s4vfe9rhe68ntjrms9g';
const API_KEY = process.env.ELEVENLABS_API_KEY;

const CHALLENGE_FIXES = `

=== SUPERSYSTEM CHALLENGE MODE FIXES (${new Date().toISOString().split('T')[0]}) ===

## CONTEXT RETENTION (TOPIC_WHIPLASH fix)
When the caller switches topics mid-conversation:
- ALWAYS maintain a mental note of: caller name, company, original purpose
- After ANY tangent, reconnect with: "So [Name], back to [original topic]..."
- NEVER ask for information you already have, even after topic switches
- If they say "anyway" or "back to" - USE the context you collected earlier

## CORRECTION HANDLING (CORRECTION_CASCADE fix)
When the caller corrects their name or any information:
- IMMEDIATELY update your mental model to the NEW value
- FORGET the old value completely - do not reference it
- Use ONLY the most recent correction going forward
- Example: "Mike" -> "Michael" -> "Mick" = ONLY use "Mick"

## HOSTILE CALLER HANDLING (ANGRY_IMPATIENT fix)
When caller is frustrated, impatient, or demanding:
- Stay CALM - do not match their energy
- Be EFFICIENT - skip pleasantries, get to the point
- Be DIRECT - "Here's the link: cal.com/wranngle"
- NEVER be defensive or apologetic
- If they curse or are rude, stay professional: "I understand. Here's what you need..."

## SPELLED NUMBER PARSING (SPELLED_OUT_NUMBER fix)
When caller spells out their phone number in words:
- "five five five" = 555
- "one two three" = 123
- "oh" or "zero" = 0
- Parse the full number and CONFIRM back in digits: "Got it, 555-123-4567, is that correct?"

## TOOL CONFIRMATION TIMING (TOOL_CONFIRMATION_TRAP fix)
CRITICAL: Tool confirmation sequence:
1. Caller gives consent → CALL the tool (send_sms, etc.)
2. WAIT for tool to return success/failure
3. ONLY THEN confirm: "I've sent that to you" or "There was an issue"
- NEVER say "I'm sending..." or "I'll text you now..." before tool completes
- NEVER confirm success before receiving tool response
- If tool fails, say: "Let me try that again" or offer alternative

=== END CHALLENGE MODE FIXES ===
`;

async function getAgentPrompt(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`Failed to get agent: ${response.status}`);
  }

  const data = await response.json();
  return data.conversation_config?.agent?.prompt?.prompt || '';
}

async function updateAgentPrompt(agentId, newPrompt) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update agent: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CHALLENGE MODE FIX APPLICATOR                             ║');
  console.log('║     Targeting: Lead Qualifier Agent                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  if (!API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY not set${C.reset}`);
    process.exit(1);
  }

  // Step 1: Get current prompt
  console.log(`\n${C.cyan}[1/4] Getting current agent prompt...${C.reset}`);
  const beforePrompt = await getAgentPrompt(AGENT_ID);
  console.log(`  Current prompt length: ${beforePrompt.length} chars`);

  // Step 2: Check if fixes already applied
  if (beforePrompt.includes('CHALLENGE MODE FIXES')) {
    console.log(`${C.yellow}  Challenge fixes already present. Removing old version...${C.reset}`);
    const cleanPrompt = beforePrompt.replace(/\n=== SUPERSYSTEM CHALLENGE MODE FIXES[\s\S]*?=== END CHALLENGE MODE FIXES ===\n?/g, '');
    console.log(`  Cleaned prompt length: ${cleanPrompt.length} chars`);
  }

  // Step 3: Apply new fixes
  console.log(`\n${C.cyan}[2/4] Applying challenge mode fixes...${C.reset}`);
  const cleanBase = beforePrompt.replace(/\n=== SUPERSYSTEM CHALLENGE MODE FIXES[\s\S]*?=== END CHALLENGE MODE FIXES ===\n?/g, '');
  const newPrompt = cleanBase + CHALLENGE_FIXES;
  console.log(`  New prompt length: ${newPrompt.length} chars`);
  console.log(`  Added: ${newPrompt.length - cleanBase.length} chars of behavioral fixes`);

  // Step 4: Update agent
  console.log(`\n${C.cyan}[3/4] Updating agent...${C.reset}`);
  await updateAgentPrompt(AGENT_ID, newPrompt);
  console.log(`  ${C.green}Agent updated successfully${C.reset}`);

  // Step 5: Verify
  console.log(`\n${C.cyan}[4/4] Verifying update...${C.reset}`);
  const afterPrompt = await getAgentPrompt(AGENT_ID);
  console.log(`  Verified prompt length: ${afterPrompt.length} chars`);

  const hasFixMarker = afterPrompt.includes('CHALLENGE MODE FIXES');
  if (hasFixMarker) {
    console.log(`  ${C.green}✓ Challenge mode fixes confirmed in agent${C.reset}`);
  } else {
    console.log(`  ${C.red}✗ Fix marker not found - update may have failed${C.reset}`);
  }

  // Log the modification
  const logPath = path.join(__dirname, '..', 'data', 'agent-modifications.json');
  let log = { modifications: [] };
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  log.modifications.push({
    timestamp: new Date().toISOString(),
    agent_id: AGENT_ID,
    type: 'CHALLENGE_MODE_FIXES',
    fixes_applied: [
      'TOPIC_WHIPLASH',
      'CORRECTION_CASCADE',
      'ANGRY_IMPATIENT',
      'SPELLED_OUT_NUMBER',
      'TOOL_CONFIRMATION_TRAP'
    ],
    before_prompt_length: beforePrompt.length,
    after_prompt_length: afterPrompt.length,
    prompt_diff: afterPrompt.length - beforePrompt.length,
    success: hasFixMarker
  });
  log.last_updated = new Date().toISOString();

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  // Summary
  console.log(`\n${C.bright}=== OUTCOME ===${C.reset}`);
  console.log(`Agent: ${AGENT_ID}`);
  console.log(`Before: ${beforePrompt.length} chars`);
  console.log(`After: ${afterPrompt.length} chars`);
  console.log(`Delta: +${afterPrompt.length - beforePrompt.length} chars`);
  console.log(`Fixes: 5 challenge mode behaviors embedded`);

  return {
    success: hasFixMarker,
    before: beforePrompt.length,
    after: afterPrompt.length,
    delta: afterPrompt.length - beforePrompt.length
  };
}

main().catch(err => {
  console.error(`${C.red}ERROR: ${err.message}${C.reset}`);
  process.exit(1);
});
