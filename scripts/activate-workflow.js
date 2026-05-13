#!/usr/bin/env node
const api = require('./lib/n8n-api');

const workflowId = process.argv[2];
if (!workflowId) {
  console.error('Usage: node activate-workflow.js <workflow-id>');
  process.exit(1);
}

(async () => {
  const res = await api.request('POST', `/api/v1/workflows/${workflowId}/activate`);
  console.log('Status:', res.status);
  if (res.status === 200) {
    console.log('Workflow activated successfully');
    return;
  }
  console.error('Response:', typeof res.body === 'string' ? res.body : JSON.stringify(res.body, null, 2));
  process.exit(1);
})().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
