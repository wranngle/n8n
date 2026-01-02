#!/usr/bin/env node
/**
 * FORCE AGENT MODIFICATION TEST
 *
 * This script PROVES the supersystem can modify the ElevenLabs agent.
 * It bypasses simulation and directly calls the modification API.
 *
 * Usage: node force-agent-modification.js
 */

const fs = require('fs');
const path = require('path');

// Load environment
const envPath = path.join(__dirname, '..', 'env', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const layer1 = require('../layer1-agent-modifier');

const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m'
};

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     FORCE AGENT MODIFICATION TEST                             ║');
  console.log('║     Proving the supersystem can modify ElevenLabs agent       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  try {
    // Step 1: Get current agent state
    console.log(`\n${C.cyan}[STEP 1] Getting current agent state...${C.reset}`);
    const beforeAgent = await layer1.getAgent(AGENT_ID);
    const beforePrompt = beforeAgent.conversation_config?.agent?.prompt?.prompt || '';
    console.log(`  Agent: ${beforeAgent.name}`);
    console.log(`  Current prompt length: ${beforePrompt.length} chars`);
    console.log(`  Last 100 chars: ...${beforePrompt.slice(-100)}`);

    // Step 2: Apply forced modification
    console.log(`\n${C.cyan}[STEP 2] Applying TOOL_NOT_CALLED fix...${C.reset}`);
    const fixResult = await layer1.applyFix('TOOL_NOT_CALLED', AGENT_ID, {
      missingTool: 'send_sms'
    });

    if (fixResult.success) {
      console.log(`  ${C.green}✓ Fix applied successfully${C.reset}`);
      console.log(`  Pattern: ${fixResult.pattern}`);
      console.log(`  Result: ${JSON.stringify(fixResult.result?.applied || fixResult.result?.skipped, null, 2)}`);
    } else {
      console.log(`  ${C.red}✗ Fix failed: ${fixResult.error}${C.reset}`);
      process.exit(1);
    }

    // Step 3: Verify the modification
    console.log(`\n${C.cyan}[STEP 3] Verifying modification...${C.reset}`);
    const afterAgent = await layer1.getAgent(AGENT_ID);
    const afterPrompt = afterAgent.conversation_config?.agent?.prompt?.prompt || '';
    console.log(`  New prompt length: ${afterPrompt.length} chars`);
    console.log(`  Prompt delta: +${afterPrompt.length - beforePrompt.length} chars`);

    const modified = afterPrompt.length > beforePrompt.length;
    const containsSupersystemFix = afterPrompt.includes('[SUPERSYSTEM-FIX');

    if (modified && containsSupersystemFix) {
      console.log(`  ${C.green}✓ VERIFICATION PASSED${C.reset}`);
      console.log(`  ${C.green}✓ Agent prompt was modified by supersystem${C.reset}`);
      console.log(`  Last 150 chars of new prompt:`);
      console.log(`  ...${afterPrompt.slice(-150)}`);
    } else {
      console.log(`  ${C.red}✗ VERIFICATION FAILED${C.reset}`);
      console.log(`  Modified: ${modified}`);
      console.log(`  Contains SUPERSYSTEM-FIX: ${containsSupersystemFix}`);
      process.exit(1);
    }

    // Step 4: Check modification log
    console.log(`\n${C.cyan}[STEP 4] Checking modification log...${C.reset}`);
    const logPath = path.join(__dirname, '..', 'data', 'agent-modifications.json');
    if (fs.existsSync(logPath)) {
      const log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      console.log(`  Total modifications logged: ${log.modifications.length}`);
      if (log.modifications.length > 0) {
        const latest = log.modifications[log.modifications.length - 1];
        console.log(`  Latest modification:`);
        console.log(`    Pattern: ${latest.pattern}`);
        console.log(`    Timestamp: ${latest.timestamp}`);
        console.log(`    Prompt delta: +${latest.prompt_diff} chars`);
        console.log(`    Success: ${latest.success}`);
      }
    } else {
      console.log(`  ${C.yellow}⚠ No modification log found${C.reset}`);
    }

    // Final summary
    console.log(`\n${C.green}${C.bright}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    TEST PASSED                                 ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`${C.reset}`);
    console.log(`${C.green}The supersystem CAN and DID modify the ElevenLabs agent.${C.reset}`);
    console.log(`Agent prompt was extended with reinforcement instruction.`);

  } catch (error) {
    console.error(`\n${C.red}ERROR: ${error.message}${C.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
