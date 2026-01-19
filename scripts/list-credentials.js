// List n8n credentials
const https = require('https');

const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY3NzQ5Mzg1LCJleHAiOjE3NzI4NTk2MDB9.OhBR-5ck0D1VwhQ21cCjolvIhvEU_P5a6neR-wAGLPs';

const options = {
  hostname: 'n8n.wranngle.com',
  port: 443,
  path: '/api/v1/credentials',
  method: 'GET',
  headers: {
    'X-N8N-API-KEY': apiKey
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Raw response:', data);
    try {
      const creds = JSON.parse(data);
      console.log('\nExisting credentials:');
      const list = creds.data || creds;
      if (Array.isArray(list)) {
        list.forEach(c => console.log(`  - ${c.id}: ${c.name} (${c.type})`));
      } else {
        console.log('Response structure:', JSON.stringify(creds, null, 2));
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
  });
});

req.on('error', e => console.error(e));
req.end();
