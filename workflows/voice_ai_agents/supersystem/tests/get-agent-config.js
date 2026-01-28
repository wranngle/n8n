const https = require('https');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

const API_KEY = loadCredentials();
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

https.get({
  hostname: 'api.elevenlabs.io',
  path: `/v1/convai/agents/${AGENT_ID}`,
  headers: { 'xi-api-key': API_KEY },
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const agent = JSON.parse(data);
    const config = agent.conversation_config || {};
    const agentConfig = config.agent || {};

    console.log('=== AGENT CONFIGURATION ===\n');
    console.log('First Message:', agentConfig.first_message || 'NOT SET');
    console.log('\nLanguage:', agentConfig.language || 'NOT SET');

    console.log('\n=== PROMPT (first 500 chars) ===');
    const prompt = agentConfig.prompt?.prompt || 'NO PROMPT';
    console.log(prompt.substring(0, 500) + '...');

    console.log('\n=== FULL CONFIG JSON ===');
    console.log(JSON.stringify(config, null, 2));
  });
});
