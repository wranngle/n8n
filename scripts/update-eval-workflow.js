const fs = require('fs');
const https = require('https');

const workflowData = JSON.parse(fs.readFileSync('C:/Users/root/Documents/dev/n8n/temp-update-eval-workflow.json', 'utf8'));

const options = {
  hostname: 'n8n.wranngle.com',
  port: 443,
  path: '/api/v1/workflows/RjLiUAiuUs5XPvBj',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs'
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
