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
const AGENT_ID = 'agent_8801kdhbm6ane7wbxrq0vfenmsj9';

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

    console.log('=== SEWY GARAGE DOORS AGENT ===\n');
    console.log('First Message:', agentConfig.first_message);
    console.log('\n=== PROMPT (first 2000 chars) ===\n');
    const prompt = agentConfig.prompt?.prompt || 'NO PROMPT';
    console.log(prompt.substring(0, 2000));
    console.log('\n... [truncated]');

    // Save full prompt to file
    fs.writeFileSync('sewy-current-prompt.txt', prompt);
    console.log('\nFull prompt saved to: sewy-current-prompt.txt');
  });
});
