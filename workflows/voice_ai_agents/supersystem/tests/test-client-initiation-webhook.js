/**
 * Test Suite: Client Initiation Data Webhook
 *
 * Validates the n8n webhook for ElevenLabs client initiation data enrichment.
 * Tests cover: response format, data merging, performance, error handling.
 *
 * Usage:
 *   bun run supersystem/tests/test-client-initiation-webhook.js
 *
 * Prerequisites:
 *   - n8n workflow deployed and active
 *   - WEBHOOK_URL env variable set (or uses default)
 *   - Network access to n8n instance
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://n8n.wranngle.com/webhook/client-initiation-data';
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper: Make webhook request
 */
async function callWebhook(payload) {
  const startTime = Date.now();

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const latency = Date.now() - startTime;
    const data = await response.json();

    return {
      status: response.status,
      data,
      latency,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      latency: Date.now() - startTime
    };
  }
}

/**
 * Helper: Assert condition
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Helper: Run test
 */
async function test(name, fn) {
  console.log(`\\n🧪 Running: ${name}`);

  try {
    await fn();
    console.log(`✅ PASSED: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'passed' });
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.log(`   Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
  }
}

/**
 * Test Suite
 */

async function runTests() {
  console.log('========================================');
  console.log('Client Initiation Data Webhook - Test Suite');
  console.log('========================================');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Agent ID: ${SARAH_AGENT_ID}`);
  console.log('');

  // Test 1: Valid Request Returns 200
  await test('Valid request returns HTTP 200', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_001'
    };

    const response = await callWebhook(payload);
    assert(response.status === 200, `Expected status 200, got ${response.status}`);
  });

  // Test 2: Response Has Correct Structure
  await test('Response has correct conversation_initiation_client_data structure', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_002'
    };

    const response = await callWebhook(payload);
    const { data } = response;

    assert(data.type === 'conversation_initiation_client_data',
      `Expected type 'conversation_initiation_client_data', got '${data.type}'`);

    assert(data.dynamic_variables !== undefined,
      'Missing dynamic_variables object');

    // Check all required variables exist
    const requiredVars = [
      'customer_name', 'customer_first_name', 'company', 'industry',
      'account_tier', 'call_history', 'interaction_count', 'last_topic',
      'notes', 'lookup_success', 'data_source',
      'secret__pipedrive_person_id', 'secret__pipedrive_org_id', 'secret__google_sheet_row'
    ];

    for (const varName of requiredVars) {
      assert(varName in data.dynamic_variables,
        `Missing required variable: ${varName}`);
    }
  });

  // Test 3: Unknown Caller Returns Generic Data
  await test('Unknown caller returns generic fallback data', async () => {
    const payload = {
      caller_id: '+19999999999', // Unknown number
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_003'
    };

    const response = await callWebhook(payload);
    const { dynamic_variables } = response.data;

    assert(dynamic_variables.customer_name === 'there',
      `Expected customer_name='there', got '${dynamic_variables.customer_name}'`);

    assert(dynamic_variables.account_tier === 'New',
      `Expected account_tier='New', got '${dynamic_variables.account_tier}'`);

    assert(dynamic_variables.lookup_success === false,
      'Expected lookup_success=false for unknown caller');

    assert(dynamic_variables.data_source === 'none',
      `Expected data_source='none', got '${dynamic_variables.data_source}'`);

    assert(dynamic_variables.secret__pipedrive_person_id === 0,
      'Expected secret__pipedrive_person_id=0 for unknown caller');
  });

  // Test 4: Invalid Agent ID Returns 400
  await test('Invalid agent_id returns HTTP 400', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: 'agent_INVALID_ID_12345',
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_004'
    };

    const response = await callWebhook(payload);
    assert(response.status === 400,
      `Expected status 400 for invalid agent_id, got ${response.status}`);
  });

  // Test 5: Response Time < 500ms
  await test('Webhook responds within 500ms (P95 target)', async () => {
    const latencies = [];

    // Run 10 requests to get average
    for (let i = 0; i < 10; i++) {
      const payload = {
        caller_id: '+15551234567',
        agent_id: SARAH_AGENT_ID,
        called_number: '+18882662193',
        call_sid: `TEST_CALL_PERF_${i}`
      };

      const response = await callWebhook(payload);
      latencies.push(response.latency);
    }

    // Calculate P95
    latencies.sort((a, b) => a - b);
    const p95Index = Math.ceil(latencies.length * 0.95) - 1;
    const p95Latency = latencies[p95Index];

    console.log(`   Latencies: ${latencies.join(', ')}ms`);
    console.log(`   P95: ${p95Latency}ms`);

    assert(p95Latency < 500,
      `P95 latency ${p95Latency}ms exceeds 500ms target`);
  });

  // Test 6: Concurrent Requests Handled
  await test('Handles 10 concurrent requests without errors', async () => {
    const promises = [];

    for (let i = 0; i < 10; i++) {
      const payload = {
        caller_id: `+155512345${i.toString().padStart(2, '0')}`,
        agent_id: SARAH_AGENT_ID,
        called_number: '+18882662193',
        call_sid: `TEST_CALL_CONCURRENT_${i}`
      };

      promises.push(callWebhook(payload));
    }

    const responses = await Promise.all(promises);

    const successCount = responses.filter(r => r.status === 200).length;
    assert(successCount === 10,
      `Expected 10 successful responses, got ${successCount}`);
  });

  // Test 7: Secret Variables Are Numbers
  await test('Secret variables have correct data types', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_007'
    };

    const response = await callWebhook(payload);
    const { dynamic_variables } = response.data;

    assert(typeof dynamic_variables.secret__pipedrive_person_id === 'number',
      'secret__pipedrive_person_id must be a number');

    assert(typeof dynamic_variables.secret__pipedrive_org_id === 'number',
      'secret__pipedrive_org_id must be a number');

    assert(typeof dynamic_variables.secret__google_sheet_row === 'number',
      'secret__google_sheet_row must be a number');

    assert(typeof dynamic_variables.interaction_count === 'number',
      'interaction_count must be a number');
  });

  // Test 8: Account Tier Calculation
  await test('Account tier calculated correctly when not in CRM', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_008'
    };

    const response = await callWebhook(payload);
    const { dynamic_variables } = response.data;

    const validTiers = ['New', 'Bronze', 'Silver', 'Gold'];
    assert(validTiers.includes(dynamic_variables.account_tier),
      `account_tier '${dynamic_variables.account_tier}' is not valid. Must be one of: ${validTiers.join(', ')}`);
  });

  // Test 9: Response Headers
  await test('Response includes correct headers', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: 'TEST_CALL_009'
    };

    const response = await callWebhook(payload);

    assert(response.headers['content-type']?.includes('application/json'),
      `Expected Content-Type: application/json, got ${response.headers['content-type']}`);

    // Check for execution time header
    if (response.headers['x-execution-time-ms']) {
      const execTime = parseInt(response.headers['x-execution-time-ms']);
      console.log(`   Execution time: ${execTime}ms`);
    }
  });

  // Test 10: Missing Fields Fallback
  await test('Handles missing request fields gracefully', async () => {
    const payload = {
      caller_id: '+15551234567',
      agent_id: SARAH_AGENT_ID
      // Missing: called_number, call_sid
    };

    const response = await callWebhook(payload);

    // Should still return 200 with fallback data
    assert(response.status === 200,
      `Expected status 200 even with missing fields, got ${response.status}`);
  });

  // Results Summary
  console.log('\\n========================================');
  console.log('Test Results Summary');
  console.log('========================================');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\\nFailed Tests:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    ${t.error}`);
      });
  }

  console.log('\\n========================================\\n');

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('\\n❌ Test suite failed with error:', error);
  process.exit(1);
});
