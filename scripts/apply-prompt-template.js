#!/usr/bin/env node
/**
 * apply-prompt-template.js
 * 
 * Applies the universal ElevenLabs prompt template to agents.
 * Replaces [insert] placeholders with client-specific values.
 * 
 * Usage:
 *   node scripts/apply-prompt-template.js <agent_id> <config_file>
 *   node scripts/apply-prompt-template.js --all
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'elevenlabs-agents', 'elevenlabs_prompt_template.md');

if (!ELEVENLABS_API_KEY) {
  console.error('ERROR: ELEVENLABS_API_KEY required');
  process.exit(1);
}

/**
 * Load and parse the prompt template
 */
function loadTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error(`Template not found: ${TEMPLATE_PATH}`);
    process.exit(1);
  }
  return fs.readFileSync(TEMPLATE_PATH, 'utf8');
}

/**
 * Replace [insert] placeholders with client values
 */
function applyClientConfig(template, config) {
  let result = template;
  
  // Replace known variables
  const replacements = {
    'ai_agent_name': config.agent_name || '[Agent Name]',
    'client_company_name': config.company_name || '[Company Name]',
    'org_id': config.org_id || '',
    'twilio_messaging_application_id': config.twilio_app_id || '',
    'sms_from_phone_number': config.sms_from || '',
  };
  
  // Replace in VARIABLES section
  for (const [key, value] of Object.entries(replacements)) {
    // Match patterns like: * **ai_agent_name** – ... → `[insert]`
    const pattern = new RegExp(`(\\* \\*\\*${key}\\*\\* [^→]+→ \`)\\[insert\\](\`)`, 'g');
    result = result.replace(pattern, `$1${value}$2`);
  }
  
  // Replace standalone [insert] in Knowledge Base section
  if (config.knowledge_base_name) {
    result = result.replace(/\*\*\[insert\]\*\*/g, `**${config.knowledge_base_name}**`);
  }
  
  // Replace branch_info references
  if (config.branch_info_name) {
    result = result.replace(/`\[insert\]` \(KB\)/g, `\`${config.branch_info_name}\` (KB)`);
    result = result.replace(/Knowledge Base as `\[insert\]`/g, `Knowledge Base as \`${config.branch_info_name}\``);
  }
  
  return result;
}

/**
 * Update agent system prompt via ElevenLabs API
 */
async function updateAgentPrompt(agentId, systemPrompt) {
  const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}`;
  
  console.log(`\nUpdating agent ${agentId}...`);
  console.log(`  Prompt length: ${systemPrompt.length} characters`);
  
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: systemPrompt
            }
          }
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ FAILED: ${response.status} - ${error}`);
      return false;
    }
    
    const result = await response.json();
    console.log(`  ✅ SUCCESS: Prompt updated for "${result.name}"`);
    return true;
    
  } catch (err) {
    console.log(`  ❌ ERROR: ${err.message}`);
    return false;
  }
}

/**
 * Agent configurations
 */
const AGENT_CONFIGS = {
  // Southeastern Wyoming Garage Doors
  'agent_8801kdhbm6ane7wbxrq0vfenmsj9': {
    agent_name: 'Sarah',
    company_name: 'Southeastern Wyoming Garage Doors',
    org_id: 'sewy-garage',
    branch_info_name: 'SEWY Garage Locations',
    knowledge_base_name: 'SEWY Garage Locations'
  },
  
  // Wranngle Receptionist
  'agent_8001kdgp7qbyf4wvhs540be78vew': {
    agent_name: 'Sarah',
    company_name: 'Wranngle Systems',
    org_id: 'wranngle',
    branch_info_name: 'Wranngle Office Info',
    knowledge_base_name: 'Wranngle Office Info'
  },
  
  // Wranngle Lead Qualifier
  'agent_5701kdgf9s4vfe9rhe68ntjrms9g': {
    agent_name: 'Lead Qualifier',
    company_name: 'Wranngle Systems',
    org_id: 'wranngle',
    branch_info_name: 'Wranngle Services',
    knowledge_base_name: 'Wranngle Services'
  },
  
  // Client Data Test Agent
  'agent_3801kdf7fkhcev8tkhpm92d65jws': {
    agent_name: 'Test Agent',
    company_name: 'Test Company',
    org_id: 'test',
    branch_info_name: 'Test KB',
    knowledge_base_name: 'Test KB'
  }
};

async function main() {
  const args = process.argv.slice(2);
  
  console.log('='.repeat(60));
  console.log('ElevenLabs Prompt Template Applicator');
  console.log('='.repeat(60));
  
  const template = loadTemplate();
  console.log(`\nTemplate loaded: ${template.length} characters`);
  
  if (args[0] === '--all') {
    // Apply to all configured agents
    console.log(`\nApplying template to ${Object.keys(AGENT_CONFIGS).length} agents...`);
    
    let succeeded = 0;
    let failed = 0;
    
    for (const [agentId, config] of Object.entries(AGENT_CONFIGS)) {
      const prompt = applyClientConfig(template, config);
      const success = await updateAgentPrompt(agentId, prompt);
      if (success) succeeded++;
      else failed++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`  ✅ Succeeded: ${succeeded}`);
    console.log(`  ❌ Failed: ${failed}`);
    
  } else if (args[0] && args[1]) {
    // Apply to specific agent with config file
    const agentId = args[0];
    const configPath = args[1];
    
    if (!fs.existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`);
      process.exit(1);
    }
    
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const prompt = applyClientConfig(template, config);
    await updateAgentPrompt(agentId, prompt);
    
  } else if (args[0]) {
    // Apply to specific agent with default config
    const agentId = args[0];
    const config = AGENT_CONFIGS[agentId];
    
    if (!config) {
      console.error(`No config found for agent: ${agentId}`);
      console.log('Available agents:', Object.keys(AGENT_CONFIGS).join(', '));
      process.exit(1);
    }
    
    const prompt = applyClientConfig(template, config);
    await updateAgentPrompt(agentId, prompt);
    
  } else {
    console.log('\nUsage:');
    console.log('  node scripts/apply-prompt-template.js --all');
    console.log('  node scripts/apply-prompt-template.js <agent_id>');
    console.log('  node scripts/apply-prompt-template.js <agent_id> <config.json>');
    console.log('\nAvailable agents:');
    for (const [id, config] of Object.entries(AGENT_CONFIGS)) {
      console.log(`  ${id}: ${config.company_name} - ${config.agent_name}`);
    }
  }
}

main();
