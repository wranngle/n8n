#!/usr/bin/env node
/**
 * Fix Remaining Agents
 * - Sarah COPY: agent_3301kedf4zqket7bd8zngdaen1ww
 * - Client Data Test: agent_3801kdf7fkhcev8tkhpm92d65jws
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

const API_KEY = loadCredentials();

const AGENTS_TO_FIX = [
  {
    id: 'agent_3301kedf4zqket7bd8zngdaen1ww',
    name: 'Sarah - Wranngle COPY',
    newFirstMessage: 'Hi, this is Sarah from Wranngle Systems.',
  },
  {
    id: 'agent_3801kdf7fkhcev8tkhpm92d65jws',
    name: 'Client Data Test Agent',
    // Keep existing first_message (it has dynamic variables)
    newFirstMessage: null,
  },
];

const SYSTEM_OVERRIDE = `
# SYSTEM OVERRIDE (HIGHEST PRIORITY)

## CALL DIRECTION AWARENESS
* **call_direction** - Whether you initiated call: \`{{call_direction}}\` (inbound/outbound)

### Outbound Calls (call_direction = outbound)
When YOU initiated the call:
- **NEVER say** "How can I help you today?" - YOU called THEM
- **NEVER say** "Thanks for calling" - they didn't call you
- **Closing:** "Thanks for your time" NOT "Thanks for calling"

### Inbound Calls (call_direction = inbound or in)
Standard greeting applies:
- "How can I help you today?" is appropriate
- "Thanks for calling" is appropriate at closing

## FIRST TURN PROTOCOL
After your initial greeting:
- IF {{call_direction}} = "outbound": Continue with why you're calling
- IF {{call_direction}} = "inbound" or "in": Ask how you can help

## TOOL OUTPUT VERBALIZATION (CRITICAL)
**NEVER speak tool return values aloud.** This includes:
- \`None\`, \`null\`, \`undefined\`, Error messages, JSON responses

If a tool returns \`None\` or fails silently, do NOT say "None". Instead:
- Wait briefly, then continue naturally
- If a tool fails, say "Let me try that again" (retry once)

## PRICING QUALIFICATION (if pricing questions apply)
When caller asks about pricing:
- FIRST ask: "What industry is your business in?" or similar qualifying question
- THEN provide pricing with context
- NEVER give naked pricing without understanding their needs

---

`;

async function getAgentConfig(agentId) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.elevenlabs.io',
      path: `/v1/convai/agents/${agentId}`,
      headers: { 'xi-api-key': API_KEY },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function updateAgent(agentId, updates) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(updates);

    const req = https.request({
      hostname: 'api.elevenlabs.io',
      path: `/v1/convai/agents/${agentId}`,
      method: 'PATCH',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode });
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

async function fixAgent(agent) {
  console.log(`\n--- Fixing: ${agent.name} ---`);
  console.log(`ID: ${agent.id}`);

  try {
    const fullConfig = await getAgentConfig(agent.id);
    const currentPrompt = fullConfig.conversation_config?.agent?.prompt?.prompt || '';

    if (currentPrompt.includes('SYSTEM OVERRIDE')) {
      console.log('  ⚠ Already has SYSTEM OVERRIDE. Skipping.');
      return { success: true, skipped: true };
    }

    const enhancedPrompt = SYSTEM_OVERRIDE + currentPrompt;

    const updates = {
      conversation_config: {
        agent: {
          prompt: { prompt: enhancedPrompt }
        }
      }
    };

    if (agent.newFirstMessage) {
      updates.conversation_config.agent.first_message = agent.newFirstMessage;
    }

    await updateAgent(agent.id, updates);
    console.log('  ✓ Updated successfully');
    return { success: true };

  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     FIX REMAINING AGENTS                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  if (!API_KEY) {
    console.error('ERROR: API key not found');
    process.exit(1);
  }

  for (const agent of AGENTS_TO_FIX) {
    await fixAgent(agent);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    ALL AGENTS FIXED');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

main();
