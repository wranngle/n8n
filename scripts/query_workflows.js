const https = require('https');

const API_KEY = process.env.N8N_API_KEY || '***SCRUBBED_N8N_API_KEY***';

const options = {
  hostname: 'n8n.wranngle.com',
  path: '/api/v1/workflows',
  method: 'GET',
  headers: {
    'X-N8N-API-KEY': API_KEY
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const workflows = JSON.parse(data);
      console.log('=== n8n Workflows ===\n');

      if (workflows.data) {
        workflows.data.forEach(wf => {
          const match = wf.id === 'paneUFRzPscNvih2' ||
                       wf.name.toLowerCase().includes('pipeline') ||
                       wf.name.toLowerCase().includes('webhook');
          console.log(`${match ? '>>> ' : ''}ID: ${wf.id}`);
          console.log(`    Name: ${wf.name}`);
          console.log(`    Active: ${wf.active}`);
          console.log('');
        });
        console.log(`\nTotal workflows: ${workflows.data.length}`);
      } else {
        console.log('Response:', JSON.stringify(workflows, null, 2));
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.end();
