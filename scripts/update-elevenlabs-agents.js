#!/usr/bin/env node
/**
 * Update ElevenLabs Agents - Apply Governance Naming & Unified Parameters
 * 
 * Applies:
 * 1. [PHASE] prefix to agent names
 * 2. Best-practice parameters from 2026 template
 */

require('dotenv').config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY environment variable required');
  process.exit(1);
}

// GOVERNANCE RULE: All agents tagged as [DEV] by default
// Promotions beyond DEV require EXPLICIT USER APPROVAL
// This script only applies [DEV] tags - never auto-promote

const AGENTS = [
  {
    id: 'agent_5701kdgf9s4vfe9rhe68ntjrms9g',
    currentName: 'Wranngle Lead Qualifier',
    newName: '[DEV] Wranngle Lead Qualifier',
    phase: 'DEV'
  },
  {
    id: 'agent_xxxx_demo',
    currentName: 'Sarah - Wranngle Receptionist',
    newName: '[DEV] Sarah - Wranngle Receptionist',
    phase: 'DEV'
  },
  {
    id: 'agent_3801kdf7fkhcev8tkhpm92d65jws',
    currentName: 'Client Data Test Agent',
    newName: '[DEV] Client Data Test Agent',
    phase: 'DEV'
  },
  {
    id: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9',
    currentName: 'Southeastern Wyoming Garage Doors - Sarah',
    newName: '[DEV] Southeastern Wyoming Garage Doors - Sarah',
    phase: 'DEV'
  }
];

// Unified parameters from best-agent-config-2026.yaml (USER-APPROVED)
const UNIFIED_PARAMS = {
  conversation_config: {
    asr: {
      provider: 'scribe_realtime',
      user_input_audio_format: 'pcm_48000'
    },
    tts: {
      model_id: 'eleven_flash_v2',
      agent_output_audio_format: 'pcm_48000',
      optimize_streaming_latency: 2,
      stability: 0.71,
      speed: 1.04,
      similarity_boost: 0.8
    },
    llm: {
      model: 'gemini-3-flash-preview',
      temperature: 0.1,
      max_tokens: -1
    },
    turn: {
      mode: 'turn',
      turn_timeout: 8
    },
    conversation: {
      max_duration_seconds: 1200
    }
  }
};

async function updateAgent(agent) {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agent.id}`;
  
  const payload = {
    name: agent.newName,
    ...UNIFIED_PARAMS
  };
  
  console.log(`\nUpdating ${agent.currentName} → ${agent.newName}`);
  console.log(`  Agent ID: ${agent.id}`);
  console.log(`  Phase: ${agent.phase}`);
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ FAILED: ${response.status} - ${error}`);
      return { success: false, agent: agent.id, error };
    }
    
    const result = await response.json();
    console.log(`  ✅ SUCCESS: Updated to "${result.name}"`);
    return { success: true, agent: agent.id, result };
    
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    return { success: false, agent: agent.id, error: err.message };
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ElevenLabs Agent Governance Update');
  console.log('='.repeat(60));
  console.log(`\nUpdating ${AGENTS.length} agents with:`);
  console.log('  - [PHASE] naming convention');
  console.log('  - Unified 2026 best-practice parameters');
  
  const results = [];
  
  for (const agent of AGENTS) {
    const result = await updateAgent(agent);
    results.push(result);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`  ✅ Succeeded: ${succeeded}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\nFailed agents:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.agent}: ${r.error}`);
    });
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

main();
