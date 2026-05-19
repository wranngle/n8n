// HTTP GET helper for the n8n REST API. Sibling to scripts/install-workflow.js
// (PR #25), which used the same URL/auth shape for POST /rest/workflows.

const http = require('http');
const https = require('https');
const { URL } = require('url');

function getJson({ n8nUrl, apiKey, path }) {
  const url = new URL(path, n8nUrl);
  const lib = url.protocol === 'https:' ? https : http;
  const opts = {
    method: 'GET',
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname + (url.search || ''),
    headers: {
      'Accept': 'application/json',
      'X-N8N-API-KEY': apiKey,
    },
  };
  return new Promise((resolve, reject) => {
    const req = lib.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`GET ${path} failed: HTTP ${res.statusCode} ${data}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`GET ${path} returned non-JSON: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function listDeployedWorkflows({ n8nUrl, apiKey }) {
  const payload = await getJson({ n8nUrl, apiKey, path: '/rest/workflows' });
  const items = Array.isArray(payload) ? payload : payload.data;
  if (!Array.isArray(items)) {
    throw new Error('Unexpected /rest/workflows shape: missing array');
  }
  return items;
}

module.exports = { getJson, listDeployedWorkflows };
