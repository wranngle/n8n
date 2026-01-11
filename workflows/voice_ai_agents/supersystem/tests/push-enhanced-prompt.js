#!/usr/bin/env node
/**
 * Push Enhanced Prompt to Sarah Agent
 * Updates the live ElevenLabs agent with the enhanced v1.1 prompt
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials from ~/.claude/.env or environment
function loadCredentials() {
  if (process.env.ELEVENLABS_API_KEY) {
    return process.env.ELEVENLABS_API_KEY;
  }

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

async function loadEnhancedPrompt() {
  const promptPath = path.join(__dirname, '..', '..', 'sarah-enhanced-prompt-v1.1.md');

  if (!fs.existsSync(promptPath)) {
    throw new Error(`Enhanced prompt not found: ${promptPath}`);
  }

  return fs.readFileSync(promptPath, 'utf8');
}

async function updateAgentPrompt(newPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    });

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
  console.log('║     PUSH ENHANCED PROMPT TO SARAH AGENT                       ║');
  console.log('║     Version: v1.1 (Call Direction + None Fix + Pricing)       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found');
    process.exit(1);
  }

  console.log(`Agent ID: ${CONFIG.AGENT_ID}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // Load the enhanced prompt
    console.log('Loading enhanced prompt v1.1...');
    const newPrompt = await loadEnhancedPrompt();
    console.log(`  ✓ Loaded ${newPrompt.length} characters`);

    // Show key sections being added
    const sections = [
      'CALL DIRECTION AWARENESS',
      'Tool Output Verbalization',
      'Pricing Qualification',
    ];
    sections.forEach(section => {
      if (newPrompt.includes(section)) {
        console.log(`  ✓ Contains: ${section}`);
      }
    });

    // Push to agent
    console.log('\nPushing to live agent...');
    const result = await updateAgentPrompt(newPrompt);
    console.log(`  ✓ Success! Status: ${result.status}`);
    console.log(`  ✓ Agent updated at: ${new Date().toISOString()}`);

    // Verify the update
    console.log('\nVerifying update...');
    const verifyResult = await new Promise((resolve, reject) => {
      https.get({
        hostname: CONFIG.API_BASE,
        path: `/v1/convai/agents/${CONFIG.AGENT_ID}`,
        headers: { 'xi-api-key': CONFIG.API_KEY },
      }, res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    // Check if key sections are in the live prompt
    const livePrompt = verifyResult?.conversation_config?.agent?.prompt?.prompt || '';
    const verified = sections.every(s => livePrompt.includes(s));

    if (verified) {
      console.log('  ✓ VERIFIED: All enhanced sections present in live agent');
    } else {
      console.log('  ⚠ WARNING: Some sections may not have been applied');
      sections.forEach(s => {
        const present = livePrompt.includes(s);
        console.log(`    ${present ? '✓' : '✗'} ${s}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                    PROMPT PUSH COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nNext: Run baseline-challenge.js to verify improvement\n');

    return 0;
  } catch (error) {
    console.error(`\n✗ ERROR: ${error.message}`);
    return 1;
  }
}

main().then(code => process.exit(code));
