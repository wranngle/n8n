#!/usr/bin/env node
/**
 * Inspect agent tool configuration to understand why send_sms is being called
 */

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

async function getAgentTools() {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  const data = await response.json();
  
  console.log('=== AGENT TOOL CONFIGURATION ===\n');
  
  // Check platform tools
  const platformTools = data.conversation_config?.agent?.tools || [];
  console.log('Platform Tools:', platformTools.length);
  platformTools.forEach(t => {
    console.log('  -', t.type || t.name || JSON.stringify(t).slice(0, 100));
  });
  
  // Check custom client tools  
  const customTools = data.platform_settings?.client_tools || [];
  console.log('\nClient Tools:', customTools.length);
  customTools.forEach(t => {
    console.log('  -', t.name, '|', t.description?.slice(0, 60));
  });
  
  // Check webhook tools
  const webhookTools = data.platform_settings?.webhooks || {};
  console.log('\nWebhook Config:', Object.keys(webhookTools).length ? 'Present' : 'None');
  
  // Look for send_sms specifically
  console.log('\n=== SEARCHING FOR send_sms CONFIG ===');
  const fullConfig = JSON.stringify(data, null, 2);
  
  // Find all occurrences of send_sms
  let idx = 0;
  let count = 0;
  while ((idx = fullConfig.indexOf('send_sms', idx)) !== -1) {
    count++;
    console.log(`\nOccurrence ${count} at index ${idx}:`);
    console.log(fullConfig.slice(Math.max(0, idx - 150), idx + 200));
    idx++;
  }
  
  if (count === 0) {
    console.log('send_sms not found in config - checking tools array directly');
    console.log('\nFull tools array:');
    console.log(JSON.stringify(data.conversation_config?.agent?.tools, null, 2));
  }
  
  console.log('\n=== FULL AGENT CONFIG (truncated) ===');
  console.log(fullConfig.slice(0, 5000));
}

getAgentTools().catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
