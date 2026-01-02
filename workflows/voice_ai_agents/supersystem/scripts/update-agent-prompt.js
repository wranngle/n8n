#!/usr/bin/env node
/**
 * Update ElevenLabs Agent with Prompt Template
 * Appends the standardized prompt template to existing agent prompts
 */

const fs = require('fs');
const path = require('path');

const API_KEY = 'sk_733d2a2707d99f6bcdb9cc330570deea72390b20b6b2915e';
const API_BASE = 'https://api.elevenlabs.io/v1';

const AGENTS = [
  { id: 'agent_8001kdgp7qbyf4wvhs540be78vew', name: 'Sarah - Wranngle Receptionist' },
  { id: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9', name: 'SEWY Garage Doors - Sarah' },
];

// Read the prompt template
const TEMPLATE_PATH = path.join(__dirname, '..', '..', '..', '..', 'templates', 'elevenlabs-agents', 'elevenlabs_prompt_template.md');

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
  console.log('='.repeat(60));
  console.log('ElevenLabs Agent Prompt Template Updater');
  console.log('='.repeat(60));

  // Read template
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  console.log(`\nLoaded template: ${template.length} characters\n`);

  for (const agent of AGENTS) {
    console.log(`\n--- Processing: ${agent.name} ---`);

    try {
      // Get current agent config
      console.log('Fetching current config...');
      const config = await getAgent(agent.id);

      const currentPrompt = config.conversation_config?.agent?.prompt?.prompt || '';
      console.log(`Current prompt length: ${currentPrompt.length} chars`);

      // Check if template already appended
      if (currentPrompt.includes('# ENVIRONMENT') && currentPrompt.includes('# GUARDRAILS')) {
        console.log('✓ Template already applied, skipping');
        continue;
      }

      // Append template
      const newPrompt = currentPrompt + '\n\n---\n\n' + template;
      console.log(`New prompt length: ${newPrompt.length} chars`);

      // Update agent
      console.log('Updating agent...');
      const updatePayload = {
        conversation_config: {
          agent: {
            prompt: {
              prompt: newPrompt
            }
          }
        }
      };

      await updateAgent(agent.id, updatePayload);
      console.log('✓ Agent updated successfully');

    } catch (error) {
      console.error(`✗ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done');
  console.log('='.repeat(60));
}

main().catch(console.error);
