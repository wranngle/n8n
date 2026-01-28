#!/usr/bin/env node
/**
 * Add send_sms webhook tool to Sarah agent
 * Single source of truth: n8n webhook at https://n8n.wranngle.com/webhook/send-sms
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
const AGENT_ID = 'agent_xxxx_demo';

// Tool configuration pointing to n8n webhook (source of truth)
const SEND_SMS_TOOL = {
  type: "webhook",
  name: "send_sms",
  description: "Sends the demo booking link via SMS to the caller. Only invoke after explicit verbal confirmation.",
  response_timeout_secs: 30,
  api_schema: {
    url: "https://n8n.wranngle.com/webhook/send-sms",
    method: "POST",
    content_type: "application/json",
    request_body_schema: {
      type: "object",
      required: ["phone_number", "caller_name"],
      description: "Payload for sending the demo SMS to the caller",
      properties: {
        phone_number: {
          type: "string",
          description: "The phone number to send SMS to (E.164 format preferred)"
        },
        caller_name: {
          type: "string",
          description: "The name of the caller for personalization"
        },
        industry: {
          type: "string",
          description: "The caller's industry (hvac, plumbing, property_management, legal, other)"
        },
        company_name: {
          type: "string",
          description: "The caller's company name if collected"
        }
      }
    }
  }
};

async function main() {
  if (!API_KEY) {
    console.error('ERROR: No API key found');
    process.exit(1);
  }

  console.log('=== ADD SEND_SMS TOOL TO SARAH AGENT ===\n');
  console.log('Agent ID:', AGENT_ID);
  console.log('Webhook URL:', SEND_SMS_TOOL.api_schema.url);

  // First, get current agent config
  console.log('\nFetching current agent config...');
  const getResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!getResponse.ok) {
    console.error('Failed to get agent:', getResponse.status, await getResponse.text());
    process.exit(1);
  }

  const agent = await getResponse.json();
  const currentPrompt = agent.conversation_config?.agent?.prompt || {};
  const currentTools = currentPrompt.tools || [];

  console.log('Current tools:', currentTools.length);
  currentTools.forEach(t => console.log(`  - ${t.name}`));

  // Check if send_sms already exists
  const existingTool = currentTools.find(t => t.name === 'send_sms');
  if (existingTool) {
    console.log('\n✓ send_sms tool already exists');
    console.log('  URL:', existingTool.api_schema?.url);
    process.exit(0);
  }

  // Add the tool
  const updatedTools = [...currentTools, SEND_SMS_TOOL];

  console.log('\nAdding send_sms tool...');

  const patchResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            tools: updatedTools
          }
        }
      }
    })
  });

  if (!patchResponse.ok) {
    console.error('Failed to update agent:', patchResponse.status, await patchResponse.text());
    process.exit(1);
  }

  console.log('\n✓ SUCCESS: send_sms tool added to Sarah agent');
  console.log('  Webhook: https://n8n.wranngle.com/webhook/send-sms');
  console.log('  Fields: phone_number, caller_name, industry, company_name');
}

main().catch(console.error);
