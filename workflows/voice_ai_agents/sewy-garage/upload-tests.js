#!/usr/bin/env node
/**
 * Upload ElevenLabs native tests for SEWY Garage Doors agent
 * Agent ID: agent_8801kdhbm6ane7wbxrq0vfenmsj9
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  AGENT_ID: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9',
  API_BASE: 'https://api.elevenlabs.io/v1',
};

const ENDPOINTS = {
  createTest: `${CONFIG.API_BASE}/convai/agent-testing/create`,
  runTests: `${CONFIG.API_BASE}/convai/agents/${CONFIG.AGENT_ID}/run-tests`,
};

async function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method,
      headers: {
        'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function uploadTests() {
  console.log('\\n=== SEWY Garage Doors - ElevenLabs Test Upload ===\\n');

  if (!CONFIG.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  // Load tests
  const testsPath = path.join(__dirname, 'tests-elevenlabs.json');
  const tests = JSON.parse(fs.readFileSync(testsPath, 'utf8'));
  console.log(`Loaded ${tests.length} tests`);

  const results = { created: [], failed: [] };

  for (const test of tests) {
    console.log(`\\nUploading: ${test.name}`);

    const payload = {
      agent_id: CONFIG.AGENT_ID,
      name: test.name,
      chat_history: test.chat_history,
      success_condition: test.success_condition,
      success_examples: test.success_examples,
      failure_examples: test.failure_examples,
      type: test.type || 'llm',
    };

    try {
      const response = await makeRequest(ENDPOINTS.createTest, 'POST', payload);

      if (response.status >= 200 && response.status < 300) {
        console.log(`  ✓ Created: ${response.data.test_id || 'OK'}`);
        results.created.push({
          name: test.name,
          id: response.data.test_id,
        });
      } else {
        console.log(`  ✗ Failed: ${response.status} - ${JSON.stringify(response.data)}`);
        results.failed.push({
          name: test.name,
          error: response.data,
        });
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      results.failed.push({ name: test.name, error: error.message });
    }

    // Rate limit delay
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('\\n=== Upload Complete ===');
  console.log(`Created: ${results.created.length}`);
  console.log(`Failed: ${results.failed.length}`);

  // Save results
  const resultsPath = path.join(__dirname, `upload-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\\nResults saved to: ${resultsPath}`);

  return results;
}

// Run if called directly
if (require.main === module) {
  uploadTests().catch(console.error);
}

module.exports = { uploadTests };
