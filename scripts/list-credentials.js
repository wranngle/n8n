// List n8n credentials
const https = require('https');

const apiKey = '***SCRUBBED_N8N_API_KEY***';

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
