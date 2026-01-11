#!/usr/bin/env node
/**
 * Quick Test - SEWY Garage Doors Agent
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
  API_BASE: 'https://api.elevenlabs.io/v1',
};

async function runSimulation(prompt) {
  const url = `${CONFIG.API_BASE}/convai/agents/${CONFIG.AGENT_ID}/simulate-conversation/stream`;

  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: {
          prompt: prompt,
          llm: 'gemini-2.0-flash',
          temperature: 0.7,
        }
      }
    },
    new_turns_limit: 10,
  };

  return new Promise((resolve, reject) => {
    let data = '';

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'xi-api-key': CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
    }, res => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const turns = [];
        for (const line of data.split('\n').filter(l => l.trim())) {
          try {
            let parsed = JSON.parse(line);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (parsed.simulated_conversation) turns.push(...parsed.simulated_conversation);
          } catch (e) {}
        }
        resolve(turns);
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  console.log('\n=== QUICK TEST: SEWY Garage Doors ===\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  // Test 1: Basic inbound service call
  console.log('Test 1: Basic Inbound Service Call');
  const turns1 = await runSimulation(
    `You need garage door repair. Call and say your opener stopped working.
     Give your name as John and phone as 555-123-4567.`
  );

  const transcript1 = turns1.map(t => `${t.role}: ${t.message}`).join('\n');
  console.log(transcript1);

  // Check for issues
  const agentFirst = turns1.find(t => t.role === 'agent')?.message || '';
  console.log('\n--- Analysis ---');
  console.log(`First agent message: "${agentFirst.substring(0, 80)}..."`);

  if (agentFirst.includes('None')) {
    console.log('⚠ ISSUE: Agent said "None"');
  } else {
    console.log('✓ No "None" verbalization');
  }

  if (agentFirst.includes('How can I help')) {
    console.log('✓ Proper inbound greeting (How can I help)');
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
