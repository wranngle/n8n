#!/usr/bin/env node
/**
 * Fix SEWY Garage Doors Agent
 *
 * Issues to fix:
 * 1. Hardcoded inbound greeting in first_message
 * 2. Missing call_direction handling in prompt
 * 3. Missing tool verbalization guardrail
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

const CONFIG = {
  API_KEY: loadCredentials(),
  AGENT_ID: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9',
  API_BASE: 'api.elevenlabs.io',
};

// Neutral first message that works for both directions
const NEUTRAL_FIRST_MESSAGE = "Hi, this is Sarah from Southeastern Wyoming Garage Doors.";

// System override to add at top of prompt
const SYSTEM_OVERRIDE = `
# SYSTEM OVERRIDE (HIGHEST PRIORITY)

## CALL DIRECTION AWARENESS
* **call_direction** - Whether you initiated call: \`{{call_direction}}\` (inbound/outbound)

### Outbound Calls (call_direction = outbound)
When YOU initiated the call, you MUST:
- **NEVER say** "How can I help you today?" - YOU called THEM
- **NEVER say** "Thanks for calling" - they didn't call you
- **Opening:** "Hi, this is Sarah from Southeastern Wyoming Garage Doors. I'm calling about..."
- **Context:** Explain WHY you're calling within first 2 sentences
- **Closing:** "Thanks for your time" NOT "Thanks for calling"

### Inbound Calls (call_direction = inbound or in)
Standard greeting applies:
- "Hi, this is Sarah from Southeastern Wyoming Garage Doors. How can I help you today?"
- "Thanks for calling" is appropriate at closing

**CRITICAL:** Check call_direction before EVERY greeting and closing.

## FIRST TURN PROTOCOL
After saying "Hi, this is Sarah from Southeastern Wyoming Garage Doors":
- IF {{call_direction}} = "outbound": Continue with "I'm calling about..." or "I'm following up on..."
- IF {{call_direction}} = "inbound" or "in": Continue with "How can I help you today?"

## TOOL OUTPUT VERBALIZATION (CRITICAL)
**NEVER speak tool return values aloud.** This includes:
- \`None\`
- \`null\`
- \`undefined\`
- Error messages
- JSON responses
- Technical confirmations

If a tool returns \`None\` or fails silently, do NOT say "None". Instead:
- Wait briefly, then continue naturally
- If a tool fails, say "Let me try that again" (retry once)
- If still failing, offer an alternative (spell out URL, etc.)

---

`;

async function getAgentConfig() {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: CONFIG.API_BASE,
      path: `/v1/convai/agents/${CONFIG.AGENT_ID}`,
      headers: { 'xi-api-key': CONFIG.API_KEY },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function updateAgent(updates) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(updates);

    const options = {
      hostname: CONFIG.API_BASE,
      path: `/v1/convai/agents/${CONFIG.AGENT_ID}`,
      method: 'PATCH',
      headers: {
        'xi-api-key': CONFIG.API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } else {
          reject(new Error(`API Error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     FIX SEWY GARAGE DOORS AGENT                               ║');
  console.log('║     Adding call direction + tool verbalization guardrails     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found');
    process.exit(1);
  }

  console.log(`Agent ID: ${CONFIG.AGENT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Get current config
    console.log('Getting current agent configuration...');
    const fullConfig = await getAgentConfig();
    const currentPrompt = fullConfig.conversation_config?.agent?.prompt?.prompt || '';
    const currentFirstMessage = fullConfig.conversation_config?.agent?.first_message || '';

    console.log(`  Current first_message: "${currentFirstMessage.substring(0, 50)}..."`);
    console.log(`  Current prompt length: ${currentPrompt.length} chars`);

    // Check if already has SYSTEM OVERRIDE
    if (currentPrompt.includes('SYSTEM OVERRIDE')) {
      console.log('\n⚠ Agent already has SYSTEM OVERRIDE. Skipping to avoid duplication.');
      return;
    }

    // Create enhanced prompt
    const enhancedPrompt = SYSTEM_OVERRIDE + currentPrompt;

    console.log('\nApplying fixes:');
    console.log('  1. Setting neutral first_message');
    console.log('  2. Adding SYSTEM OVERRIDE for call direction');
    console.log('  3. Adding tool verbalization guardrail');
    console.log(`  New prompt length: ${enhancedPrompt.length} chars`);

    // Update agent
    const result = await updateAgent({
      conversation_config: {
        agent: {
          first_message: NEUTRAL_FIRST_MESSAGE,
          prompt: {
            prompt: enhancedPrompt
          }
        }
      }
    });

    console.log(`\n✓ Agent updated! Status: ${result.status}`);

    // Verify
    console.log('\nVerifying changes...');
    const verifyConfig = await getAgentConfig();
    const newFirstMessage = verifyConfig.conversation_config?.agent?.first_message || '';
    const newPrompt = verifyConfig.conversation_config?.agent?.prompt?.prompt || '';

    console.log(`  First message: "${newFirstMessage}"`);
    console.log(`  Has SYSTEM OVERRIDE: ${newPrompt.includes('SYSTEM OVERRIDE')}`);
    console.log(`  Has CALL DIRECTION: ${newPrompt.includes('CALL DIRECTION AWARENESS')}`);
    console.log(`  Has TOOL VERBALIZATION: ${newPrompt.includes('TOOL OUTPUT VERBALIZATION')}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    SEWY AGENT FIX COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`\n✗ ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
