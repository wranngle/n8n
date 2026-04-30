const https = require('https');
const env = require('./lib/env');

const API_KEY = env.require('N8N_API_KEY');
const BASE_URL = 'n8n.wranngle.com';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: path,
      method: method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const action = process.argv[2] || 'list';

  if (action === 'list') {
    console.log('=== STEP 1: LIST EXISTING WORKFLOWS ===\n');
    const result = await makeRequest('GET', '/api/v1/workflows');
    if (result.data.data) {
      result.data.data.forEach(w => {
        console.log(`ID: ${w.id} | Name: ${w.name} | Active: ${w.active}`);
      });
      console.log(`\nTotal: ${result.data.data.length} workflows`);
    } else {
      console.log(JSON.stringify(result.data, null, 2));
    }
  }

  if (action === 'create') {
    console.log('=== STEP 2: CREATE TEST WORKFLOW ===\n');
    const workflow = {
      name: "[DEV] Pipeline Test - Webhook Processor",
      nodes: [
        {
          id: "webhook-trigger",
          name: "Webhook Trigger",
          type: "n8n-nodes-base.webhook",
          typeVersion: 2,
          position: [250, 300],
          parameters: {
            httpMethod: "POST",
            path: "pipeline-test",
            responseMode: "responseNode"
          },
          webhookId: "pipeline-test"
        },
        {
          id: "process-data",
          name: "Process Data",
          type: "n8n-nodes-base.code",
          typeVersion: 2,
          position: [470, 300],
          parameters: {
            jsCode: "const items = $input.all();\nconst inputData = items[0].json.body || items[0].json;\nconst result = {\n  received: inputData,\n  processed: true,\n  timestamp: new Date().toISOString(),\n  message: `Processed ${Object.keys(inputData).length} fields`\n};\nreturn [{ json: result }];"
          }
        },
        {
          id: "respond-webhook",
          name: "Respond to Webhook",
          type: "n8n-nodes-base.respondToWebhook",
          typeVersion: 1.1,
          position: [690, 300],
          parameters: {
            respondWith: "json",
            responseBody: "={{ { success: true, data: $json, pipeline: 'complete' } }}",
            options: { responseCode: 200 }
          }
        }
      ],
      connections: {
        "Webhook Trigger": {
          main: [[{ node: "Process Data", type: "main", index: 0 }]]
        },
        "Process Data": {
          main: [[{ node: "Respond to Webhook", type: "main", index: 0 }]]
        }
      },
      settings: { executionOrder: "v1" },
      active: true
    };

    const result = await makeRequest('POST', '/api/v1/workflows', workflow);
    console.log('Creation Response:');
    console.log(JSON.stringify(result.data, null, 2));

    if (result.data.id) {
      console.log(`\n=== WORKFLOW CREATED ===`);
      console.log(`Workflow ID: ${result.data.id}`);
      console.log(`Name: ${result.data.name}`);
      console.log(`Active: ${result.data.active}`);
      console.log(`Webhook URL: https://n8n.wranngle.com/webhook/pipeline-test`);
    }
  }

  if (action === 'trigger') {
    console.log('=== STEP 3: TRIGGER WEBHOOK TEST ===\n');
    const testData = { test: "evaluation", value: 42 };

    const options = {
      hostname: BASE_URL,
      path: '/webhook/pipeline-test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:');
        try {
          console.log(JSON.stringify(JSON.parse(data), null, 2));
        } catch (e) {
          console.log(data);
        }
      });
    });
    req.on('error', e => console.error('Error:', e.message));
    req.write(JSON.stringify(testData));
    req.end();
  }
}

main().catch(console.error);
