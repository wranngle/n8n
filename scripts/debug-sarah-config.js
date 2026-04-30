#!/usr/bin/env node
/**
 * Debug Sarah Agent Config
 */

const env = require('./lib/env');

const API_KEY = env.require('ELEVENLABS_API_KEY');
const AGENT_ID = 'agent_xxxx_demo';

async function main() {
  // Get full agent config
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  const data = await response.json();

  console.log('=== CURRENT AGENT CONFIG ===\n');

  console.log('TTS config:');
  console.log(JSON.stringify(data.conversation_config?.tts, null, 2));

  console.log('\nPrompt LLM:', data.conversation_config?.agent?.prompt?.llm);
  console.log('Agent Language:', data.conversation_config?.agent?.language);
  console.log('Agent Name:', data.name);

  console.log('\n=== ATTEMPTING PARTIAL UPDATE ===\n');

  // Try updating just TTS first (like the working script does partial updates)
  const ttsUpdate = {
    conversation_config: {
      tts: {
        model_id: 'eleven_turbo_v2_5',
        voice_id: 'pFZP5JQG7iQjIQuC4Bku',
        stability: 0.55,
        speed: 0.95,
        similarity_boost: 0.80,
        optimize_streaming_latency: 2
      }
    }
  };

  console.log('Sending TTS update:');
  console.log(JSON.stringify(ttsUpdate, null, 2));

  const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(ttsUpdate)
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    console.log('\nTTS Update Error:', error);
  } else {
    console.log('\n✓ TTS Update succeeded!');
    const result = await updateResponse.json();
    console.log('New TTS:', JSON.stringify(result.conversation_config?.tts, null, 2));
  }
}

main().catch(console.error);
