#!/usr/bin/env node
// List n8n credential IDs, names, and types without printing credential data.
const api = require('./lib/n8n-api');

(async () => {
  const res = await api.request('GET', '/api/v1/credentials');
  if (res.status !== 200) {
    console.error(`ERROR: HTTP ${res.status}`);
    console.error(typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  const list = res.body.data || res.body;
  if (!Array.isArray(list)) {
    console.error('Unexpected response:', JSON.stringify(res.body, null, 2));
    process.exit(1);
  }

  console.log('Existing credentials:');
  list.forEach(credential => {
    console.log(`  - ${credential.id}: ${credential.name} (${credential.type})`);
  });
})().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
