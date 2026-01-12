#!/usr/bin/env node
/**
 * ATDD: Post-Call Webhook Self-Healing API Tests
 *
 * These tests MUST FAIL initially (RED phase).
 * Implementation will make them pass (GREEN phase).
 *
 * Run: node tests/api/postcall-selfhealing.api.spec.js
 */

const https = require('https');
const assert = require('assert');

const N8N_BASE_URL = 'https://n8n.wranngle.com';
const WEBHOOK_PATH = '/webhook/call-completed';
const HEALTH_PATH = '/webhook/call-completed-health';
const DLQ_REPROCESS_PATH = '/webhook/call-completed-dlq-reprocess';

// Helper to call webhook
async function callWebhook(path, payload, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, N8N_BASE_URL);
    const data = JSON.stringify(payload);

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Correlation-ID': `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      },
      timeout
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body), headers: res.headers });
        } catch {
          resolve({ statusCode: res.statusCode, body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

// Test data factories
function createTranscriptionEvent(overrides = {}) {
  const dynamicVars = overrides.dynamic_variables || {};
  delete overrides.dynamic_variables;

  return {
    type: 'post_call_transcription',
    data: {
      conversation_id: `conv_${Date.now()}`,
      agent_id: 'agent_xxxx_demo',
      conversation_initiation_client_data: {
        dynamic_variables: {
          customer_name: 'Test Customer',
          pipedrive_person_id: 99999999, // Non-existent ID to force failure
          ...dynamicVars
        }
      },
      analysis: {
        call_successful: 'success',
        transcript_summary: 'Test call summary',
        ...(overrides.analysis || {})
      },
      metadata: {
        call_duration_secs: 120,
        start_time_unix_secs: Math.floor(Date.now() / 1000),
        ...(overrides.metadata || {})
      },
      transcript: overrides.transcript || []
    },
    event_timestamp: Date.now(),
    ...overrides
  };
}

// ============================================
// AC01: Retry with Exponential Backoff
// ============================================
async function test_AC01_retry_on_pipedrive_failure() {
  console.log('\n[AC01] Testing: Retry with exponential backoff on Pipedrive failure');

  // GIVEN: Event with invalid Pipedrive ID that will fail
  const event = createTranscriptionEvent({
    dynamic_variables: { pipedrive_person_id: 99999999 }
  });

  // WHEN: Sending event that triggers Pipedrive API call
  const startTime = Date.now();
  const response = await callWebhook(WEBHOOK_PATH, event, 60000);
  const duration = Date.now() - startTime;

  // THEN: Response should indicate retries were attempted
  assert.ok(response.body.retry_count >= 1, 'Should have retry count in response');
  assert.ok(response.body.retry_delays, 'Should include retry delay information');
  assert.ok(duration >= 5000, `Duration ${duration}ms should be >= 5000ms (retry backoff)`);

  console.log('  Status: RED (expected - retry logic not implemented)');
}

// ============================================
// AC02: Dead Letter Queue on Permanent Failure
// ============================================
async function test_AC02_dead_letter_queue() {
  console.log('\n[AC02] Testing: Dead letter queue after all retries exhausted');

  // GIVEN: Event that will permanently fail
  const event = createTranscriptionEvent({
    dynamic_variables: { pipedrive_person_id: 99999999 }
  });

  // WHEN: Event fails all retries
  const response = await callWebhook(WEBHOOK_PATH, event, 60000);

  // THEN: Event should be stored in DLQ
  assert.ok(response.body.dlq_id, 'Should have DLQ ID in response');
  assert.strictEqual(response.body.dlq_stored, true, 'Should indicate DLQ storage');
  assert.ok(response.body.dlq_reason, 'Should include DLQ reason');

  console.log('  Status: RED (expected - DLQ not implemented)');
}

// ============================================
// AC03: Unknown Event Type Handling
// ============================================
async function test_AC03_unknown_event_acknowledged() {
  console.log('\n[AC03] Testing: Unknown event type acknowledged (not dropped)');

  // GIVEN: Event with unhandled type
  const event = {
    type: 'call_ringing',
    data: { conversation_id: 'conv_unknown_test' },
    event_timestamp: Date.now()
  };

  // WHEN: Sending unknown event type
  const response = await callWebhook(WEBHOOK_PATH, event);

  // THEN: Should acknowledge receipt with appropriate response
  assert.strictEqual(response.statusCode, 200, 'Should return 200 OK');
  assert.strictEqual(response.body.success, true, 'Should indicate success');
  assert.strictEqual(response.body.event_type, 'call_ringing', 'Should echo event type');
  assert.strictEqual(response.body.action, 'logged', 'Should indicate event was logged');
  assert.ok(response.body.correlation_id, 'Should include correlation ID');

  console.log('  Status: RED (expected - unknown event handler not implemented)');
}

// ============================================
// AC04: Validation Error Response
// ============================================
async function test_AC04_validation_error_actionable() {
  console.log('\n[AC04] Testing: Validation errors are actionable');

  // GIVEN: Event with missing required fields
  const event = {
    type: 'post_call_transcription',
    event_timestamp: Date.now()
  };

  // WHEN: Sending invalid event
  const response = await callWebhook(WEBHOOK_PATH, event);

  // THEN: Should return actionable error
  assert.ok(response.body.error, 'Should have error field');
  assert.ok(response.body.error.code, 'Should have error code');
  assert.ok(response.body.error.message, 'Should have error message');
  assert.ok(response.body.error.field, 'Should identify problematic field');
  assert.ok(response.body.error.suggestion, 'Should include fix suggestion');

  console.log('  Status: RED (expected - actionable errors not implemented)');
}

// ============================================
// AC05: Correlation ID Traceability
// ============================================
async function test_AC05_correlation_id_propagation() {
  console.log('\n[AC05] Testing: Correlation ID propagation');

  // GIVEN: Request with correlation ID header
  const correlationId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // WHEN: Sending event with correlation ID
  const response = await new Promise((resolve, reject) => {
    const data = JSON.stringify(createTranscriptionEvent());
    const url = new URL(WEBHOOK_PATH, N8N_BASE_URL);

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Correlation-ID': correlationId
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body),
            headers: res.headers
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            body: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });

  // THEN: Correlation ID should be echoed and logged
  assert.strictEqual(
    response.body.correlation_id,
    correlationId,
    'Should echo correlation ID in response'
  );
  assert.strictEqual(
    response.headers['x-correlation-id'],
    correlationId,
    'Should include correlation ID in response headers'
  );

  console.log('  Status: RED (expected - correlation ID not implemented)');
}

// ============================================
// AC06: DLQ Reprocessing
// ============================================
async function test_AC06_dlq_reprocessing() {
  console.log('\n[AC06] Testing: Dead letter queue reprocessing');

  // GIVEN: A DLQ entry exists (from previous failure)
  const dlqId = 'dlq_test_' + Date.now();

  // WHEN: Triggering reprocessing
  const response = await callWebhook(DLQ_REPROCESS_PATH, {
    dlq_id: dlqId,
    force_retry: true
  });

  // THEN: Should attempt reprocessing
  assert.strictEqual(response.statusCode, 200, 'Should return 200');
  assert.ok(response.body.reprocess_attempted, 'Should attempt reprocessing');
  assert.ok(['success', 'failed', 'not_found'].includes(response.body.result),
    'Should return valid result status');

  console.log('  Status: RED (expected - DLQ reprocess endpoint not implemented)');
}

// ============================================
// AC07: Health Endpoint
// ============================================
async function test_AC07_health_endpoint() {
  console.log('\n[AC07] Testing: Health endpoint returns metrics');

  // WHEN: Calling health endpoint
  const response = await new Promise((resolve, reject) => {
    const url = new URL(HEALTH_PATH, N8N_BASE_URL);

    https.get({
      hostname: url.hostname,
      port: 443,
      path: url.pathname
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(body)
          });
        } catch {
          resolve({
            statusCode: res.statusCode,
            body: body
          });
        }
      });
    }).on('error', reject);
  });

  // THEN: Should return health metrics
  assert.strictEqual(response.statusCode, 200, 'Should return 200');
  assert.ok(response.body.status, 'Should have status field');
  assert.ok(response.body.metrics, 'Should have metrics object');
  assert.ok(response.body.metrics.events_processed !== undefined, 'Should track events processed');
  assert.ok(response.body.metrics.dlq_depth !== undefined, 'Should track DLQ depth');
  assert.ok(response.body.metrics.error_rate !== undefined, 'Should track error rate');

  console.log('  Status: RED (expected - health endpoint not implemented)');
}

// ============================================
// AC08: Dynamic Action Registration
// ============================================
async function test_AC08_dynamic_action_router() {
  console.log('\n[AC08] Testing: Dynamic action registration');

  // GIVEN: A new event type that should trigger custom action
  const event = {
    type: 'custom_event_type',
    action: 'send_slack_notification',
    data: {
      message: 'Test notification',
      channel: '#test'
    },
    event_timestamp: Date.now()
  };

  // WHEN: Sending event with custom action
  const response = await callWebhook(WEBHOOK_PATH, event);

  // THEN: Should route to appropriate action handler
  assert.strictEqual(response.statusCode, 200, 'Should return 200');
  assert.ok(response.body.action_executed, 'Should indicate action was executed');
  assert.strictEqual(response.body.action_type, 'send_slack_notification',
    'Should identify action type');

  console.log('  Status: RED (expected - dynamic action router not implemented)');
}

// ============================================
// AC09: Burst Handling (100 events)
// ============================================
async function test_AC09_burst_handling() {
  console.log('\n[AC09] Testing: Burst of 100 events without drops');

  // GIVEN: 100 concurrent events
  const events = Array.from({ length: 100 }, (_, i) =>
    createTranscriptionEvent({
      dynamic_variables: { customer_name: `Burst Customer ${i}` }
    })
  );

  // WHEN: Sending all events concurrently
  const startTime = Date.now();
  const responses = await Promise.all(
    events.map(e => callWebhook(WEBHOOK_PATH, e, 60000).catch(err => ({ error: err.message })))
  );
  const duration = Date.now() - startTime;

  // THEN: All events should be processed
  const successful = responses.filter(r => r.statusCode === 200 || r.body?.success);
  const failed = responses.filter(r => r.error || r.statusCode >= 500);

  assert.strictEqual(successful.length, 100, `All 100 events should succeed, got ${successful.length}`);
  assert.strictEqual(failed.length, 0, `No events should fail, got ${failed.length}`);

  console.log(`  Processed 100 events in ${duration}ms (${Math.round(100000/duration)}/sec)`);
  console.log('  Status: RED (expected - burst handling may not be implemented)');
}

// ============================================
// AC10: Circuit Breaker
// ============================================
async function test_AC10_circuit_breaker() {
  console.log('\n[AC10] Testing: Circuit breaker after consecutive failures');

  // GIVEN: Events that will trigger Pipedrive failures
  const failingEvents = Array.from({ length: 6 }, (_, i) =>
    createTranscriptionEvent({
      dynamic_variables: { pipedrive_person_id: 99999999 + i }
    })
  );

  // WHEN: Sending 6 events (5 to trip breaker, 1 to test open state)
  const responses = [];
  for (const event of failingEvents) {
    const response = await callWebhook(WEBHOOK_PATH, event, 30000);
    responses.push(response);
    await new Promise(r => setTimeout(r, 500));
  }

  // THEN: 6th request should hit open circuit breaker
  const lastResponse = responses[responses.length - 1];
  assert.strictEqual(lastResponse.body.circuit_breaker_open, true,
    'Circuit breaker should be open after 5 failures');
  assert.ok(lastResponse.body.circuit_breaker_resets_at,
    'Should indicate when circuit resets');

  console.log('  Status: RED (expected - circuit breaker not implemented)');
}

// ============================================
// Main Test Runner
// ============================================
async function runAllTests() {
  console.log('');
  console.log('======================================================================');
  console.log('  ATDD: Post-Call Webhook Self-Healing Architecture Tests');
  console.log('  Phase: RED (all tests should fail initially)');
  console.log('======================================================================');

  const tests = [
    { name: 'AC01', fn: test_AC01_retry_on_pipedrive_failure },
    { name: 'AC02', fn: test_AC02_dead_letter_queue },
    { name: 'AC03', fn: test_AC03_unknown_event_acknowledged },
    { name: 'AC04', fn: test_AC04_validation_error_actionable },
    { name: 'AC05', fn: test_AC05_correlation_id_propagation },
    { name: 'AC06', fn: test_AC06_dlq_reprocessing },
    { name: 'AC07', fn: test_AC07_health_endpoint },
    { name: 'AC08', fn: test_AC08_dynamic_action_router },
    { name: 'AC09', fn: test_AC09_burst_handling },
    { name: 'AC10', fn: test_AC10_circuit_breaker }
  ];

  const results = { passed: 0, failed: 0, errors: [] };

  for (const test of tests) {
    try {
      await test.fn();
      // In RED phase, passing means test is wrong!
      results.passed++;
      console.log('  UNEXPECTED PASS - Test should fail in RED phase!');
    } catch (error) {
      // In RED phase, failing is correct!
      results.failed++;
      results.errors.push({ test: test.name, error: error.message });
      console.log(`  RED (expected failure): ${error.message.slice(0, 100)}`);
    }
  }

  console.log('\n======================================================================');
  console.log(`  RED Phase Summary: ${results.failed}/${tests.length} tests failing as expected`);
  console.log('======================================================================\n');

  if (results.failed === tests.length) {
    console.log('All tests in RED phase - ready for implementation!');
  } else {
    console.log(`${results.passed} tests passed unexpectedly - review test assertions`);
  }

  return results.failed === tests.length;
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(allRed => process.exit(allRed ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runAllTests, createTranscriptionEvent };
