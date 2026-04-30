const fs = require('fs');
const https = require('https');
const env = require('./lib/env');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node update-eval-workflow.js <path-to-workflow.json>');
  process.exit(1);
}
const workflowData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const options = {
  hostname: 'n8n.wranngle.com',
  port: 443,
  path: '/api/v1/workflows/RjLiUAiuUs5XPvBj',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': env.require('N8N_API_KEY')
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Response:', JSON.stringify(json, null, 2).substring(0, 500));
    } catch (e) {
      console.log('Response:', data.substring(0, 500));
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(JSON.stringify(workflowData));
req.end();
