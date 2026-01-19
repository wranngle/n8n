#!/usr/bin/env node
/**
 * Test ElevenLabs Simulation API with minimal payload
 */

const fs = require('fs');
const path = require('path');

// Load API key
const CLAUDE_JSON_PATH = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude.json');
let API_KEY = null;
try {
  const claudeJson = JSON.parse(fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8'));
  if (claudeJson.projects) {
    for (const [key, value] of Object.entries(claudeJson.projects)) {
      if (value?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY) {
        API_KEY = value.mcpServers.elevenlabs.env.ELEVENLABS_API_KEY;
        break;
      }
    }
  }
} catch {}

const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const API_BASE = 'https://api.elevenlabs.io/v1';

async function main() {
  console.log('Testing ElevenLabs Simulation API\n');

  // Test 1: Minimal payload based on docs
  const minimalPayload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: "You are a busy HVAC contractor owner who got a cold call. Be skeptical but curious.",
        first_message_mode: "simulate_user_input"
      }
    }
  };

  console.log('Test 1: Minimal payload');
  console.log('Payload:', JSON.stringify(minimalPayload, null, 2));

  try {
    const response = await fetch(`${API_BASE}/convai/agents/${AGENT_ID}/simulate_conversation`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(minimalPayload)
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.log('Error:', error.substring(0, 500));
    } else {
      const result = await response.json();
      console.log('SUCCESS!');
      console.log('Result keys:', Object.keys(result));
      if (result.simulated_conversation) {
        console.log('Conversation turns:', result.simulated_conversation.length);
        console.log('First message:', result.simulated_conversation[0]?.message?.substring(0, 100));
      }
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }

  // Test 2: With dynamic variables (via extra_body)
  console.log('\n\nTest 2: With extra_body for dynamic variables');
  const withDynVarsPayload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: "You are a busy HVAC contractor owner. Someone cold-called you. Be skeptical but curious."
      }
    },
    extra_body: {
      dynamic_variables: {
        call_direction: "outbound"
      }
    }
  };

  console.log('Payload:', JSON.stringify(withDynVarsPayload, null, 2));

  try {
    const response = await fetch(`${API_BASE}/convai/agents/${AGENT_ID}/simulate_conversation`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(withDynVarsPayload)
    });

    console.log(`Response status: ${response.status}`);

    if (!response.ok) {
      const error = await response.text();
      console.log('Error:', error.substring(0, 500));
    } else {
      const result = await response.json();
      console.log('SUCCESS!');
      console.log('Result keys:', Object.keys(result));
    }
  } catch (e) {
    console.log('Fetch error:', e.message);
  }
}

main().catch(console.error);
