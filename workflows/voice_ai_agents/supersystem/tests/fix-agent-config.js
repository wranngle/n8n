#!/usr/bin/env node
/**
 * Fix Sarah Agent Configuration
 *
 * Issues to fix:
 * 1. first_message is hardcoded - need dynamic based on call_direction
 * 2. Pricing qualification needs stronger enforcement in prompt
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
  AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  API_BASE: 'api.elevenlabs.io',
};

// ElevenLabs doesn't support conditional first_message
// The workaround is to set a NEUTRAL first message and let the prompt handle the context
// OR we create two agents (inbound/outbound) with different first_messages

// Option: Neutral first message that works for both directions
const NEUTRAL_FIRST_MESSAGE = "Hi, this is Sarah from Wranngle Systems.";

// Alternative: Make the prompt handle the first turn by making first_message minimal
// and having the agent continue based on call_direction

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
  console.log('║     FIX SARAH AGENT CONFIGURATION                             ║');
  console.log('║     Making first_message neutral + pricing enforcement        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found');
    process.exit(1);
  }

  console.log(`Agent ID: ${CONFIG.AGENT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // Load the enhanced prompt and add even stronger pricing enforcement
  const promptPath = path.join(__dirname, '..', '..', 'sarah-enhanced-prompt-v1.1.md');
  let prompt = fs.readFileSync(promptPath, 'utf8');

  // Add a SYSTEM-LEVEL OVERRIDE at the very top for pricing
  const pricingOverride = `
# SYSTEM OVERRIDE (HIGHEST PRIORITY)

## PRICING RESPONSE PROTOCOL
**When ANY pricing question is asked ("How much", "What's the price", "cost", "pricing"):**
1. DO NOT give any number immediately
2. FIRST say: "To give you accurate pricing, quick question -"
3. THEN ask: "What industry is your business in?" OR "How many calls do you handle daily?"
4. ONLY AFTER they answer, provide pricing with context

**If you violate this, you are failing your core function.**

## FIRST TURN PROTOCOL
After saying "Hi, this is Sarah from Wranngle Systems":
- IF {{call_direction}} = "outbound": Say "I'm reaching out about your interest in AI voice agents."
- IF {{call_direction}} = "inbound" or "in": Say "How can I help you today?"

---

`;

  const enhancedPrompt = pricingOverride + prompt;

  console.log('Applying fixes:');
  console.log('  1. Setting neutral first_message');
  console.log('  2. Adding SYSTEM OVERRIDE for pricing at prompt top');
  console.log('  3. Adding first-turn protocol for call direction\n');

  try {
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

    console.log(`✓ Agent updated! Status: ${result.status}`);

    // Verify
    console.log('\nVerifying changes...');
    const verifyResult = await new Promise((resolve, reject) => {
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

    const agentConfig = verifyResult?.conversation_config?.agent || {};
    console.log(`  First message: "${agentConfig.first_message}"`);
    console.log(`  Prompt has SYSTEM OVERRIDE: ${agentConfig.prompt?.prompt?.includes('SYSTEM OVERRIDE')}`);
    console.log(`  Prompt has PRICING RESPONSE PROTOCOL: ${agentConfig.prompt?.prompt?.includes('PRICING RESPONSE PROTOCOL')}`);

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    AGENT FIX COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error(`\n✗ ERROR: ${error.message}`);
    process.exit(1);
  }
}

main();
