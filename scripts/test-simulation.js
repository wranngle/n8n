const https = require('https');

const ELEVENLABS_API_KEY = 'sk_733d2a2707d99f6bcdb9cc330570deea72390b20b6b2915e';
const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Minimal test payload
const payload = {
  simulation_specification: {
    simulated_user_config: {
      first_message: "Hello, I am interested in your services.",
      language: "en"
    }
  },
  new_turns_limit: 5
};

const options = {
  hostname: 'api.elevenlabs.io',
  port: 443,
  path: `/v1/convai/agents/${AGENT_ID}/simulate-conversation`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'xi-api-key': ELEVENLABS_API_KEY
  }
};

console.log('Testing ElevenLabs simulate-conversation API...');
console.log('Payload:', JSON.stringify(payload, null, 2));

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('\nStatus:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    try {
      const json = JSON.parse(data);
      console.log('\nResponse:', JSON.stringify(json, null, 2).substring(0, 3000));
    } catch (e) {
      console.log('\nResponse:', data.substring(0, 3000));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify(payload));
req.end();
