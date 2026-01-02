#!/usr/bin/env node
/**
 * FIX AND VERIFY
 *
 * 1. Apply targeted fix for the failing scenario
 * 2. Re-run the simulation to VERIFY the fix worked
 * 3. Report PASS or FAIL
 *
 * This is the SACRED CONTRACT: fix → verify → report
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  cyan: '\x1b[36m', yellow: '\x1b[33m', bright: '\x1b[1m'
};

const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const API_KEY = process.env.ELEVENLABS_API_KEY;

const SMS_DECLINED_FIX = `

=== SUPERSYSTEM FIX: SMS DECLINED CONSENT (${new Date().toISOString().split('T')[0]}) ===

## SMS CONSENT IS SACRED - NEVER SEND WITHOUT EXPLICIT YES

CRITICAL RULE: If the caller says ANY of these, DO NOT call send_sms:
- "no" / "nope" / "no thanks"
- "I don't want a text" / "don't text me"
- "just tell me" / "just read it to me"
- "I'll look it up myself"
- "no SMS" / "no text"
- ANY hesitation or ambiguity

ONLY call send_sms if caller gives EXPLICIT CONSENT:
- "yes" / "yeah" / "sure" / "please do"
- "text me" / "send it"
- "go ahead" / "that works"

If caller declines SMS:
1. DO NOT call send_sms
2. Instead, verbally provide the information: "No problem! The link is cal.com/wranngle"
3. Move on without pushing

VIOLATION OF THIS RULE IS A CRITICAL FAILURE.

=== END FIX ===
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

async function runSimulation(scenarioId) {
  const { execSync } = require('child_process');
  const result = execSync(
    `node run-simulations.js --id ${scenarioId}`,
    { cwd: path.join(__dirname, '..', 'tests'), encoding: 'utf8', timeout: 60000 }
  );
  return result;
}

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     FIX AND VERIFY                                            ║');
  console.log('║     Sacred Contract: Fix → Verify → Report                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  if (!API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY not set${C.reset}`);
    process.exit(1);
  }

  // STEP 1: APPLY FIX
  console.log(`\n${C.cyan}[1/3] APPLYING FIX${C.reset}`);
  const beforePrompt = await getAgentPrompt(SARAH_AGENT_ID);
  console.log(`  Before: ${beforePrompt.length} chars`);

  // Clean old fix if present
  let cleanPrompt = beforePrompt.replace(/\n=== SUPERSYSTEM FIX: SMS DECLINED[\s\S]*?=== END FIX ===\n?/g, '');
  const newPrompt = cleanPrompt + SMS_DECLINED_FIX;

  await updateAgentPrompt(SARAH_AGENT_ID, newPrompt);
  const afterPrompt = await getAgentPrompt(SARAH_AGENT_ID);
  console.log(`  After: ${afterPrompt.length} chars (+${afterPrompt.length - cleanPrompt.length})`);
  console.log(`  ${C.green}✓ Fix applied${C.reset}`);

  // STEP 2: VERIFY BY RE-RUNNING
  console.log(`\n${C.cyan}[2/3] VERIFYING FIX${C.reset}`);
  console.log(`  Running: sms-declined-no-notification scenario...`);

  let verifyResult;
  try {
    verifyResult = runSimulation('sms-declined-no-notification');
    console.log(verifyResult);
  } catch (e) {
    verifyResult = e.stdout || e.message;
    console.log(verifyResult);
  }

  // STEP 3: REPORT
  console.log(`\n${C.cyan}[3/3] OUTCOME REPORT${C.reset}`);

  const passed = verifyResult.includes('✅ PASS');
  const failed = verifyResult.includes('❌ FAIL');

  if (passed) {
    console.log(`${C.green}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.green}${C.bright}  ✅ FIX VERIFIED - sms-declined-no-notification NOW PASSES     ${C.reset}`);
    console.log(`${C.green}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
  } else if (failed) {
    console.log(`${C.red}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.red}${C.bright}  ❌ FIX NOT SUFFICIENT - Scenario still failing                ${C.reset}`);
    console.log(`${C.red}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`\nFix did not resolve the issue. Further investigation needed.`);
  } else {
    console.log(`${C.yellow}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
    console.log(`${C.yellow}${C.bright}  ⚠️  INCONCLUSIVE - Could not determine outcome               ${C.reset}`);
    console.log(`${C.yellow}${C.bright}═══════════════════════════════════════════════════════════════${C.reset}`);
  }

  // Log modification
  const logPath = path.join(__dirname, '..', 'data', 'agent-modifications.json');
  let log = { modifications: [] };
  if (fs.existsSync(logPath)) {
    log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
  }

  log.modifications.push({
    timestamp: new Date().toISOString(),
    agent_id: SARAH_AGENT_ID,
    type: 'SMS_DECLINED_FIX',
    scenario: 'sms-declined-no-notification',
    before_prompt_length: beforePrompt.length,
    after_prompt_length: afterPrompt.length,
    prompt_diff: afterPrompt.length - cleanPrompt.length,
    verified: passed,
    outcome: passed ? 'PASS' : (failed ? 'FAIL' : 'INCONCLUSIVE')
  });
  log.last_updated = new Date().toISOString();

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  console.error(`${C.red}ERROR: ${err.message}${C.reset}`);
  process.exit(1);
});
