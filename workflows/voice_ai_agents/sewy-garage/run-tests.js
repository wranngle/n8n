#!/usr/bin/env node
/**
 * Run ElevenLabs native tests for SEWY Garage Doors agent
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

async function makeRequest(url, method, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
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

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function listTests() {
  console.log('Fetching tests for agent...');
  const url = `${CONFIG.API_BASE}/convai/agent-testing?agent_id=${CONFIG.AGENT_ID}`;
  const response = await makeRequest(url, 'GET');
  
  if (response.status !== 200) {
    console.error('Failed to list tests:', response.status, response.data);
    return [];
  }
  
  return response.data.tests || response.data || [];
}

async function runTests() {
  console.log('\n=== SEWY Garage Doors - ElevenLabs Test Runner ===\n');

  if (!CONFIG.ELEVENLABS_API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  // Step 1: Get list of tests
  const tests = await listTests();
  
  if (!tests.length) {
    console.log('No tests found for this agent');
    process.exit(0);
  }
  
  console.log(`Found ${tests.length} tests`);
  
  // Build test_id array
  const testIds = tests.map(t => ({ test_id: t.test_id || t.id }));
  console.log('Test IDs:', testIds.map(t => t.test_id).join(', '));

  // Step 2: Trigger test run with test IDs
  console.log('\nTriggering test run...');
  const runUrl = `${CONFIG.API_BASE}/convai/agents/${CONFIG.AGENT_ID}/run-tests`;
  const runResponse = await makeRequest(runUrl, 'POST', { tests: testIds });

  if (runResponse.status !== 200 && runResponse.status !== 201) {
    console.error('Failed to trigger tests:', runResponse.status, JSON.stringify(runResponse.data, null, 2));
    process.exit(1);
  }

  const invocationId = runResponse.data.invocation_id || runResponse.data.test_run_id || runResponse.data.id;
  console.log(`Test run started. Invocation ID: ${invocationId}`);

  // Step 3: Poll for results
  console.log('\nPolling for results (max 5 minutes)...');
  const maxWait = 5 * 60 * 1000;
  const pollInterval = 10 * 1000;
  const startTime = Date.now();

  let results = null;
  while (Date.now() - startTime < maxWait) {
    await sleep(pollInterval);

    const statusUrl = `${CONFIG.API_BASE}/convai/test-invocations/${invocationId}`;
    const statusResponse = await makeRequest(statusUrl, 'GET');

    if (statusResponse.status !== 200) {
      console.log(`  Status check returned ${statusResponse.status}, retrying...`);
      continue;
    }

    const status = statusResponse.data.status || statusResponse.data.state;
    console.log(`  Status: ${status}`);

    if (status === 'completed' || status === 'finished' || status === 'done') {
      results = statusResponse.data;
      break;
    }

    if (status === 'failed' || status === 'error') {
      console.error('Test run failed:', statusResponse.data);
      process.exit(1);
    }
  }

  if (!results) {
    console.error('Timeout waiting for test results');
    process.exit(1);
  }

  // Step 4: Display results
  console.log('\n=== Test Results ===\n');

  const testResults = results.test_results || results.results || results.tests || [];
  let passed = 0;
  let failed = 0;

  for (const test of testResults) {
    const testName = test.test_name || test.name || test.title || 'Unknown';
    const testPassed = test.passed || test.success || test.result === 'pass' || test.status === 'passed';

    if (testPassed) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.log(`  ✗ ${testName}`);
      console.log(`    Reason: ${test.failure_reason || test.reason || test.message || 'Not specified'}`);
      failed++;
    }
  }

  const total = passed + failed;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : 0;

  console.log('\n=== Summary ===');
  console.log(`Passed: ${passed}/${total} (${passRate}%)`);
  console.log(`Failed: ${failed}/${total}`);

  // Save results
  const resultsPath = path.join(__dirname, `test-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results saved to: ${resultsPath}`);

  return { passed, failed, total, passRate, results };
}

// Run if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, listTests };
