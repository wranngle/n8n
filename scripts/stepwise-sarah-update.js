#!/usr/bin/env node
/**
 * Stepwise Sarah Agent Update
 * Tests incremental updates to identify which field causes validation failure
 */

const env = require('./lib/env');

const API_KEY = env.require('ELEVENLABS_API_KEY');
const AGENT_ID = 'agent_xxxx_demo';
const API_BASE = 'https://api.elevenlabs.io/v1';

async function updateAgent(updateData, description) {
  console.log(`\n=== Testing: ${description} ===`);
  console.log('Payload:', JSON.stringify(updateData, null, 2).substring(0, 200) + '...');

  const response = await fetch(`${API_BASE}/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });

  if (!response.ok) {
    const error = await response.text();
    console.log(`❌ FAILED: ${description}`);
    // Extract the actual error message
    try {
      const errorJson = JSON.parse(error);
      const msg = errorJson?.detail?.message || error;
      console.log('Error:', msg.substring(0, 300));
    } catch {
      console.log('Error:', error.substring(0, 300));
    }
    return false;
  }

  console.log(`✅ SUCCESS: ${description}`);
  return true;
}

async function main() {
  console.log('STEPWISE SARAH UPDATE TEST');
  console.log('Testing incremental updates to identify validation issues\n');

  // Step 1: Name only
  const step1 = await updateAgent(
    { name: '[PROD] Sarah - Wranngle Lead Specialist v2.0' },
    'Name update only'
  );

  if (!step1) {
    console.log('\nName update failed - stopping');
    return;
  }

  // Step 2: TTS voice only (keeping other TTS settings)
  const step2 = await updateAgent(
    {
      conversation_config: {
        tts: {
          voice_id: 'pFZP5JQG7iQjIQuC4Bku'
        }
      }
    },
    'Voice ID only (keeping model)'
  );

  // Step 3: TTS stability/speed
  const step3 = await updateAgent(
    {
      conversation_config: {
        tts: {
          stability: 0.55,
          speed: 0.95,
          similarity_boost: 0.80
        }
      }
    },
    'TTS settings (stability/speed/similarity)'
  );

  // Step 4: TTS model change (the suspected problem)
  const step4 = await updateAgent(
    {
      conversation_config: {
        tts: {
          model_id: 'eleven_turbo_v2_5'
        }
      }
    },
    'TTS model change to turbo v2.5'
  );

  // Step 5: First message
  const step5 = await updateAgent(
    {
      conversation_config: {
        agent: {
          first_message: "Hi, this is Sarah with Wranngle Systems."
        }
      }
    },
    'First message update'
  );

  // Step 6: Prompt (the big one)
  const v2Config = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'workflows', 'voice_ai_agents', 'sarah-agent-config.json'),
    'utf-8'
  ));

  const step6 = await updateAgent(
    {
      conversation_config: {
        agent: {
          prompt: {
            prompt: v2Config.conversation_config.agent.prompt.prompt,
            llm: 'gpt-4o-mini',
            temperature: 0.3,
            tool_ids: [],
            tools: v2Config.conversation_config.agent.prompt.tools
          }
        }
      }
    },
    'Prompt update with v2.0 content'
  );

  console.log('\n=== SUMMARY ===');
  console.log(`Step 1 (Name): ${step1 ? '✅' : '❌'}`);
  console.log(`Step 2 (Voice ID): ${step2 ? '✅' : '❌'}`);
  console.log(`Step 3 (TTS settings): ${step3 ? '✅' : '❌'}`);
  console.log(`Step 4 (TTS model): ${step4 ? '✅' : '❌'}`);
  console.log(`Step 5 (First message): ${step5 ? '✅' : '❌'}`);
  console.log(`Step 6 (Prompt): ${step6 ? '✅' : '❌'}`);
}

main().catch(console.error);
