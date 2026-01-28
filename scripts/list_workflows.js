const https = require('https');

const options = {
  hostname: 'n8n.wranngle.com',
  path: '/api/v1/workflows',
  method: 'GET',
  headers: {
    'X-N8N-API-KEY': process.env.N8N_API_KEY || '***SCRUBBED_N8N_API_KEY***',
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
