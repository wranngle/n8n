const fs = require('fs');
const path = require('path');
const { ElevenLabsTestingClient } = require('./lib/api-client');
const client = new ElevenLabsTestingClient();

async function updateAgent() {
  // Read the system prompt
  const promptPath = path.join(__dirname, '../../agents/sarah/system-prompt.md');
  let prompt = fs.readFileSync(promptPath, 'utf8');
  
  // Remove markdown header (first 6 lines)
  prompt = prompt.split('\n').slice(6).join('\n').trim();
  
  console.log('Updating agent:', client.agentId);
  console.log('Prompt length:', prompt.length, 'chars');
  
  // PATCH the agent
  const url = `https://api.elevenlabs.io/v1/convai/agents/${client.agentId}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'xi-api-key': client.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: prompt
          }
        }
      }
    })
  });
  
  if (response.ok) {
    console.log('\n✅ Agent updated successfully!');
    
    // Verify
    const verify = await fetch(url, { headers: { 'xi-api-key': client.apiKey } });
    const data = await verify.json();
    console.log('\nVerified prompt length:', data.conversation_config?.agent?.prompt?.prompt?.length);
  } else {
    console.log('Error:', response.status);
    console.log(await response.text());
  }
}

updateAgent().catch(console.error);
