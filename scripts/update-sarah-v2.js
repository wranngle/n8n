#!/usr/bin/env node
/**
 * Update Sarah Agent to v2.0 B2B Sales SDR Configuration
 *
 * Pushes the full sarah-agent-config.json to the ElevenLabs cloud agent.
 *
 * Usage:
 *   node scripts/update-sarah-v2.js [--dry-run] [--voice-only]
 *
 * Options:
 *   --dry-run     Show what would be updated without making changes
 *   --voice-only  Only update voice/TTS settings
 */

const fs = require('fs');
const path = require('path');

// Load credentials from ~/.claude/.env
function loadEnvFile(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

const CLAUDE_ENV_PATH = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', '.env');
const envFile = loadEnvFile(CLAUDE_ENV_PATH);
// Also check .claude.json for MCP-configured API key (may be nested under projects)
const CLAUDE_JSON_PATH = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude.json');
let mcpApiKey = null;
try {
  const claudeJson = JSON.parse(fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8'));
  // Check root mcpServers
  mcpApiKey = claudeJson?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY;
  // Check projects (Claude Code stores project-specific MCP configs here)
  if (!mcpApiKey && claudeJson.projects) {
    for (const [key, value] of Object.entries(claudeJson.projects)) {
      if (value?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY) {
        mcpApiKey = value.mcpServers.elevenlabs.env.ELEVENLABS_API_KEY;
        break;
      }
    }
  }
} catch {}
const API_KEY = process.env.ELEVENLABS_API_KEY || mcpApiKey || envFile.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

// Sarah Agent ID
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Path to v2.0 config
const CONFIG_PATH = path.join(__dirname, '..', 'workflows', 'voice_ai_agents', 'sarah-agent-config.json');

async function getAgent(agentId) {
  const response = await fetch(`${API_BASE}/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!response.ok) {
    throw new Error(`Failed to get agent: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function updateAgent(agentId, updateData) {
  const response = await fetch(`${API_BASE}/convai/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateData)
  });
  if (!response.ok) {
    throw new Error(`Failed to update agent: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const voiceOnly = args.includes('--voice-only');

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     SARAH v2.0 UPDATE - B2B Sales SDR Configuration          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found in environment or ~/.claude/.env');
    process.exit(1);
  }

  // Load v2.0 config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`ERROR: Config file not found: ${CONFIG_PATH}`);
    process.exit(1);
  }

  const v2Config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  console.log(`Loaded v2.0 config: ${v2Config.name}`);
  console.log(`  Prompt length: ${v2Config.conversation_config.agent.prompt.prompt.length} chars`);
  console.log(`  Voice ID: ${v2Config.conversation_config.tts.voice_id}`);
  console.log(`  Stability: ${v2Config.conversation_config.tts.stability}`);
  console.log(`  Speed: ${v2Config.conversation_config.tts.speed}\n`);

  // Get current agent state
  console.log('Fetching current agent state...');
  const currentAgent = await getAgent(SARAH_AGENT_ID);
  const currentPrompt = currentAgent.conversation_config?.agent?.prompt?.prompt || '';
  const currentVoice = currentAgent.conversation_config?.tts?.voice_id || '';

  console.log(`Current state:`);
  console.log(`  Name: ${currentAgent.name}`);
  console.log(`  Prompt length: ${currentPrompt.length} chars`);
  console.log(`  Voice ID: ${currentVoice}`);
  console.log(`  Stability: ${currentAgent.conversation_config?.tts?.stability}`);
  console.log(`  Speed: ${currentAgent.conversation_config?.tts?.speed}\n`);

  // Build update payload
  let updatePayload;

  if (voiceOnly) {
    console.log('MODE: Voice settings only\n');
    updatePayload = {
      conversation_config: {
        tts: {
          voice_id: v2Config.conversation_config.tts.voice_id,
          stability: v2Config.conversation_config.tts.stability,
          similarity_boost: v2Config.conversation_config.tts.similarity_boost,
          speed: v2Config.conversation_config.tts.speed,
          optimize_streaming_latency: v2Config.conversation_config.tts.optimize_streaming_latency
        }
      }
    };
  } else {
    console.log('MODE: Full configuration update\n');
    updatePayload = {
      name: v2Config.name,
      conversation_config: v2Config.conversation_config
    };
  }

  // Show changes
  console.log('Changes to apply:');
  if (!voiceOnly) {
    console.log(`  Name: "${currentAgent.name}" → "${v2Config.name}"`);
    console.log(`  Prompt: ${currentPrompt.length} chars → ${v2Config.conversation_config.agent.prompt.prompt.length} chars`);
  }
  console.log(`  Voice: ${currentVoice} → ${v2Config.conversation_config.tts.voice_id}`);
  console.log(`  Stability: ${currentAgent.conversation_config?.tts?.stability} → ${v2Config.conversation_config.tts.stability}`);
  console.log(`  Speed: ${currentAgent.conversation_config?.tts?.speed} → ${v2Config.conversation_config.tts.speed}`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - No changes made');
    console.log('\nPayload preview:');
    console.log(JSON.stringify(updatePayload, null, 2).substring(0, 500) + '...');
    return;
  }

  // Apply update
  console.log('Applying update...');
  try {
    const result = await updateAgent(SARAH_AGENT_ID, updatePayload);
    console.log('\n✓ SUCCESS: Sarah agent updated to v2.0');
    console.log(`  Agent ID: ${SARAH_AGENT_ID}`);
    console.log(`  New name: ${result.name || v2Config.name}`);

    // Verify the update
    console.log('\nVerifying update...');
    const verifyAgent = await getAgent(SARAH_AGENT_ID);
    const verifyPrompt = verifyAgent.conversation_config?.agent?.prompt?.prompt || '';

    console.log('Verification:');
    console.log(`  Name: ${verifyAgent.name}`);
    console.log(`  Prompt length: ${verifyPrompt.length} chars`);
    console.log(`  Voice ID: ${verifyAgent.conversation_config?.tts?.voice_id}`);
    console.log(`  Stability: ${verifyAgent.conversation_config?.tts?.stability}`);
    console.log(`  Speed: ${verifyAgent.conversation_config?.tts?.speed}`);

    // Check if key v2.0 elements are present
    const hasV2Elements = verifyPrompt.includes('OUTBOUND_AWARENESS') ||
                          verifyPrompt.includes('call_direction') ||
                          verifyPrompt.includes('B2B sales') ||
                          verifyPrompt.includes('24/7 Filter');

    if (hasV2Elements || voiceOnly) {
      console.log('\n✓ v2.0 configuration verified');
    } else {
      console.log('\n⚠ WARNING: v2.0 prompt elements not detected - verify manually');
    }

  } catch (error) {
    console.error(`\n✗ ERROR: ${error.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
