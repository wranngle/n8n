#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const workflowId = process.argv[2];
if (!workflowId) {
  console.error('Usage: node activate-workflow.js <workflow-id>');
  process.exit(1);
}

function loadApiKey() {
  // Try ~/.claude/.gemini/.gemini/.mcp.json first
  const mcpPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.gemini', '.gemini', '.mcp.json');
  if (fs.existsSync(mcpPath)) {
    const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    if (mcp.N8N_API_KEY) return mcp.N8N_API_KEY;
    // Check mcpServers.n8n-mcp.env
    if (mcp.mcpServers?.['n8n-mcp']?.env?.N8N_API_KEY) {
      return mcp.mcpServers['n8n-mcp'].env.N8N_API_KEY;
    }
  }

  // Fallback to .env
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/N8N_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}
const apiKey = loadApiKey();

if (!apiKey) {
  console.error('No API key found');
  process.exit(1);
}

const req = https.request({
  hostname: 'n8n.wranngle.com',
  path: `/api/v1/workflows/${workflowId}/activate`,
  method: 'POST',
  headers: { 'X-N8N-API-KEY': apiKey }
}, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      console.log('Workflow activated successfully');
    } else {
      console.log('Response:', data);
    }
  });
});
req.on('error', e => console.error('Error:', e.message));
req.end();
