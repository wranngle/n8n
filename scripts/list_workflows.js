const api = require('./lib/n8n-api');

(async () => {
  const res = await api.request('GET', '/api/v1/workflows');
  if (res.status !== 200) {
    console.error(`ERROR: HTTP ${res.status}`);
    console.error(typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(res.body, null, 2));
})().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
