#!/usr/bin/env node
/**
 * Verify Sarah agent prompt on ElevenLabs
 */

const fs = require('fs');
const path = require('path');

// Load from centralized credential store
function loadApiKey() {
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=([^\r\n]+)/);
    if (match) return match[1].trim();
  }
  return process.env.ELEVENLABS_API_KEY;
}

const API_KEY = loadApiKey();
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

async function main() {
  console.log('Fetching Sarah agent from ElevenLabs...\n');

  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    console.log('Error:', response.status, await response.text());
    return;
  }

  const agent = await response.json();
  const config = agent.conversation_config || {};
  const agentConfig = config.agent || {};
  const tts = config.tts || {};
  const prompt = agentConfig.prompt?.prompt || '';

  console.log('=== AGENT INFO ===');
  console.log('Name:', agent.name);
  console.log('Agent ID:', agent.agent_id);

  console.log('\n=== VOICE CONFIG ===');
  console.log('Voice ID:', tts.voice_id);
  console.log('Stability:', tts.stability);
  console.log('Speed:', tts.speed);

  console.log('\n=== FIRST MESSAGE ===');
  console.log(agentConfig.first_message);

  console.log('\n=== PROMPT LENGTH ===');
  console.log(prompt.length, 'characters');

  console.log('\n=== V2.0 MARKERS CHECK ===');
  const markers = [
    ['call_direction VARIABLE', '{{call_direction}}'],
    ['CALL DIRECTION AWARENESS', 'CALL DIRECTION AWARENESS'],
    ['FORBIDDEN LANGUAGE', 'FORBIDDEN LANGUAGE'],
    ['Discovery Questions', 'Phase 2: Discovery'],
    ['Demo Close', 'Demo Close'],
    ['Emergency Redirect', 'Emergency Redirect'],
    ['Intake Schema Volume', 'q06_runs_per_period'],
    ['B2B Sales SDR identity', 'B2B sales professional'],
    ['The 24/7 Filter product', 'The 24/7 Filter'],
    ['send_sms tool section', '## send_sms']
  ];

  let passCount = 0;
  for (const [name, marker] of markers) {
    const found = prompt.includes(marker);
    console.log(found ? '✓' : '✗', name);
    if (found) passCount++;
  }

  console.log(`\n=== RESULT: ${passCount}/${markers.length} v2.0 markers found ===`);

  if (passCount === markers.length) {
    console.log('\n✓ CONFIRMED: Agent has full v2.0 prompt');
  } else if (passCount >= 7) {
    console.log('\n⚠ PARTIAL: Agent has most v2.0 features');
  } else {
    console.log('\n✗ OUTDATED: Agent needs prompt update');
  }

  // Show tools
  const tools = agentConfig.prompt?.tools || [];
  console.log('\n=== TOOLS ===');
  if (tools.length > 0) {
    tools.forEach(t => {
      console.log(`  - ${t.name}: ${t.api_schema?.url || 'no URL'}`);
    });
  } else {
    console.log('  No custom tools configured');
  }
}

main().catch(console.error);
