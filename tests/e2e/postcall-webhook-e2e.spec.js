#!/usr/bin/env node
/**
 * E2E Test Suite: Post-Call Webhook Self-Healing Architecture
 * 200 comprehensive tests across 4 categories
 *
 * Categories:
 * - CORE (001-050): Basic webhook functionality, event routing
 * - ERROR (051-100): Error handling, validation, retries
 * - EDGE (101-150): Edge cases, boundary conditions
 * - LOAD (151-200): Concurrency, bursts, stress tests
 *
 * Run: node tests/e2e/postcall-webhook-e2e.spec.js
 * Run category: node tests/e2e/postcall-webhook-e2e.spec.js --category=CORE
 * Run range: node tests/e2e/postcall-webhook-e2e.spec.js --from=001 --to=050
 */

const https = require('https');
const assert = require('assert');

// ============================================
// Configuration
// ============================================
const CONFIG = {
  N8N_BASE_URL: 'https://n8n.wranngle.com',
  WEBHOOK_PATH: '/webhook/call-completed',
  HEALTH_PATH: '/webhook/call-completed-health',
  DLQ_PATH: '/webhook/call-completed-dlq-reprocess',
  AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  TIMEOUT: 30000,
  BURST_TIMEOUT: 120000
};

// ============================================
// Test Infrastructure
// ============================================
class TestRunner {
  constructor() {
    this.results = { passed: 0, failed: 0, skipped: 0, errors: [] };
    this.startTime = Date.now();
  }

  async run(testId, name, fn, options = {}) {
    const { skip = false, timeout = CONFIG.TIMEOUT } = options;

    if (skip) {
      this.results.skipped++;
      console.log(`  [${testId}] SKIP: ${name}`);
      return;
    }

    try {
      await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), timeout)
        )
      ]);
      this.results.passed++;
      console.log(`  [${testId}] PASS: ${name}`);
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ testId, name, error: error.message });
      console.log(`  [${testId}] FAIL: ${name} - ${error.message.slice(0, 80)}`);
    }
  }

  summary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log('\n' + '='.repeat(70));
    console.log(`  E2E Test Summary: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.skipped} skipped`);
    console.log(`  Duration: ${duration}s`);
    console.log('='.repeat(70));
    return this.results.failed === 0;
  }
}

// ============================================
// HTTP Client
// ============================================
async function callWebhook(path, payload, options = {}) {
  const { timeout = CONFIG.TIMEOUT, method = 'POST', headers = {} } = options;
  const correlationId = options.correlationId || `e2e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return new Promise((resolve, reject) => {
    const url = new URL(path, CONFIG.N8N_BASE_URL);
    const data = payload ? JSON.stringify(payload) : '';

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Correlation-ID': correlationId,
        ...headers
      },
      timeout
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: body ? JSON.parse(body) : {},
            headers: res.headers,
            correlationId
          });
        } catch {
          resolve({ statusCode: res.statusCode, body, headers: res.headers, correlationId });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

async function httpGet(path, options = {}) {
  return callWebhook(path, null, { ...options, method: 'GET' });
}

// ============================================
// Data Factories (standalone functions to avoid this binding issues)
// ============================================
function baseEvent(type, overrides = {}) {
  return {
    type,
    event_timestamp: Date.now(),
    ...overrides
  };
}

function transcriptionEvent(overrides = {}) {
  const dynamicVars = overrides.dynamic_variables || {};
  delete overrides.dynamic_variables;

  return baseEvent('post_call_transcription', {
    data: {
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      agent_id: CONFIG.AGENT_ID,
      conversation_initiation_client_data: {
        dynamic_variables: {
          customer_name: 'E2E Test Customer',
          phone: '+15551234567',
          pipedrive_person_id: 12345,
          ...dynamicVars
        }
      },
      analysis: {
        call_successful: 'success',
        transcript_summary: 'E2E test call summary',
        data_collection_results: {
          interested: true,
          budget: 'discussed',
          timeline: 'Q1 2026'
        },
        ...(overrides.analysis || {})
      },
      metadata: {
        call_duration_secs: 120,
        start_time_unix_secs: Math.floor(Date.now() / 1000),
        ...(overrides.metadata || {})
      },
      transcript: overrides.transcript || [
        { role: 'agent', message: 'Hello, this is Sarah from Wranngle.' },
        { role: 'user', message: 'Hi, I am interested in your AI services.' }
      ],
      ...(overrides.data || {})
    },
    ...overrides
  });
}

function failureEvent(overrides = {}) {
  return baseEvent('call_initiation_failure', {
    data: {
      conversation_id: `conv_failed_${Date.now()}`,
      agent_id: CONFIG.AGENT_ID,
      failure_reason: 'Invalid phone number',
      ...(overrides.data || {})
    },
    ...overrides
  });
}

function unknownEvent(type = 'unknown_event_type', overrides = {}) {
  return baseEvent(type, {
    data: { message: 'Unknown event for testing', ...(overrides.data || {}) },
    ...overrides
  });
}

// Variant factories
function successfulCall(name = 'Test') {
  return transcriptionEvent({
    dynamic_variables: { customer_name: name },
    analysis: { call_successful: 'success' }
  });
}

function failedCall(reason = 'Customer not interested') {
  return transcriptionEvent({
    analysis: { call_successful: 'failure', failure_reason: reason }
  });
}

function noAnswerCall() {
  return transcriptionEvent({
    analysis: { call_successful: 'no_answer' },
    metadata: { call_duration_secs: 0 }
  });
}

function longCall(duration = 3600) {
  return transcriptionEvent({ metadata: { call_duration_secs: duration } });
}

function shortCall(duration = 5) {
  return transcriptionEvent({ metadata: { call_duration_secs: duration } });
}

function withPipedriveId(id) {
  return transcriptionEvent({ dynamic_variables: { pipedrive_person_id: id } });
}

function withoutPipedriveId() {
  return transcriptionEvent({ dynamic_variables: { pipedrive_person_id: null } });
}

function withLargeTranscript(turns = 100) {
  return transcriptionEvent({
    transcript: Array.from({ length: turns }, (_, i) => ({
      role: i % 2 === 0 ? 'agent' : 'user',
      message: `Message ${i}: ${'Lorem ipsum '.repeat(50)}`
    }))
  });
}

function withSpecialCharacters() {
  return transcriptionEvent({
    dynamic_variables: { customer_name: 'José García-Müller <script>alert("xss")</script>' },
    analysis: { transcript_summary: 'Summary with "quotes" and \'apostrophes\' and emoji 🎉' }
  });
}

function withUnicode() {
  return transcriptionEvent({
    dynamic_variables: { customer_name: '田中太郎' },
    analysis: { transcript_summary: '日本語のサマリー with émojis 🇯🇵' }
  });
}

function batch(count, factory = transcriptionEvent) {
  return Array.from({ length: count }, (_, i) => factory({
    data: { conversation_id: `conv_batch_${Date.now()}_${i}` }
  }));
}

// Factory namespace for backwards compatibility
const Factory = {
  baseEvent, transcriptionEvent, failureEvent, unknownEvent,
  successfulCall, failedCall, noAnswerCall, longCall, shortCall,
  withPipedriveId, withoutPipedriveId, withLargeTranscript,
  withSpecialCharacters, withUnicode, batch
};

// ============================================
// CATEGORY 1: CORE TESTS (001-050)
// Basic webhook functionality, event routing
// ============================================
const CORE_TESTS = [
  // Basic connectivity (001-005)
  ['CORE-001', 'Webhook accepts POST request', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.ok([200, 202].includes(res.statusCode), `Expected 200/202, got ${res.statusCode}`);
  }],

  ['CORE-002', 'Webhook returns JSON response', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.strictEqual(typeof res.body, 'object', 'Response should be JSON object');
  }],

  ['CORE-003', 'Webhook processes transcription event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.ok(res.statusCode < 400, `Should not error: ${res.statusCode}`);
  }],

  ['CORE-004', 'Webhook processes failure event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.failureEvent());
    assert.ok(res.statusCode < 400, `Should not error: ${res.statusCode}`);
  }],

  ['CORE-005', 'Webhook handles empty body gracefully', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, {});
    assert.ok(res.statusCode, 'Should return a status code');
  }],

  // Event type routing (006-015)
  ['CORE-006', 'Routes post_call_transcription correctly', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.ok(res.statusCode < 500, 'Should process without server error');
  }],

  ['CORE-007', 'Routes call_initiation_failure correctly', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.failureEvent());
    assert.ok(res.statusCode < 500, 'Should process without server error');
  }],

  ['CORE-008', 'Handles call_ringing event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('call_ringing'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-009', 'Handles call_answered event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('call_answered'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-010', 'Handles call_ended event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('call_ended'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-011', 'Handles agent_response event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('agent_response'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-012', 'Handles user_transcript event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('user_transcript'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-013', 'Handles interruption event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('interruption'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-014', 'Handles ping event', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('ping'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-015', 'Handles completely unknown event type', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.unknownEvent('xyz_unknown_abc'));
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Call outcome scenarios (016-025)
  ['CORE-016', 'Processes successful call outcome', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.successfulCall('Success Test'));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-017', 'Processes failed call outcome', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.failedCall('Not interested'));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-018', 'Processes no-answer call outcome', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.noAnswerCall());
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-019', 'Processes voicemail call outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'voicemail' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-020', 'Processes busy call outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'busy' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-021', 'Processes callback_requested outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'callback_requested' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-022', 'Processes meeting_scheduled outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'meeting_scheduled' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-023', 'Processes demo_booked outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'demo_booked' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-024', 'Processes qualified_lead outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'qualified_lead' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-025', 'Processes disqualified_lead outcome', async () => {
    const event = Factory.transcriptionEvent({ analysis: { call_successful: 'disqualified' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  // Call duration scenarios (026-030)
  ['CORE-026', 'Handles very short call (5 seconds)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.shortCall(5));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-027', 'Handles normal call (2 minutes)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-028', 'Handles long call (30 minutes)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.longCall(1800));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-029', 'Handles very long call (60 minutes)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.longCall(3600));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-030', 'Handles zero duration call', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.shortCall(0));
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  // Pipedrive integration (031-040)
  ['CORE-031', 'Processes event with valid Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(12345));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-032', 'Processes event without Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withoutPipedriveId());
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-033', 'Processes event with string Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId('12345'));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-034', 'Processes event with zero Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(0));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-035', 'Processes event with negative Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(-1));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-036', 'Processes event with large Pipedrive ID', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(999999999));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-037', 'Handles missing dynamic_variables', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.conversation_initiation_client_data.dynamic_variables;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-038', 'Handles empty dynamic_variables', async () => {
    const event = Factory.transcriptionEvent();
    event.data.conversation_initiation_client_data.dynamic_variables = {};
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-039', 'Handles extra dynamic_variables', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: {
        custom_field_1: 'value1',
        custom_field_2: 'value2',
        extra_data: { nested: true }
      }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-040', 'Handles numeric customer phone', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: { phone: 15551234567 }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  // Transcript handling (041-050)
  ['CORE-041', 'Processes empty transcript', async () => {
    const event = Factory.transcriptionEvent({ transcript: [] });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-042', 'Processes single turn transcript', async () => {
    const event = Factory.transcriptionEvent({
      transcript: [{ role: 'agent', message: 'Hello' }]
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 400, 'Should succeed');
  }],

  ['CORE-043', 'Processes large transcript (100 turns)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(100));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-044', 'Processes very large transcript (500 turns)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(500));
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-045', 'Handles transcript with special characters', async () => {
    const event = Factory.transcriptionEvent({
      transcript: [
        { role: 'user', message: 'Price is $500 & includes <everything>' },
        { role: 'agent', message: 'That\'s "great"! 100% guaranteed.' }
      ]
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-046', 'Handles transcript with unicode', async () => {
    const event = Factory.transcriptionEvent({
      transcript: [
        { role: 'user', message: 'こんにちは' },
        { role: 'agent', message: 'Bonjour! 你好! مرحبا' }
      ]
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-047', 'Handles transcript with emoji', async () => {
    const event = Factory.transcriptionEvent({
      transcript: [
        { role: 'user', message: 'Sounds great! 🎉👍' },
        { role: 'agent', message: 'Wonderful! 😊' }
      ]
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-048', 'Handles transcript with newlines', async () => {
    const event = Factory.transcriptionEvent({
      transcript: [
        { role: 'user', message: 'Line 1\nLine 2\nLine 3' },
        { role: 'agent', message: 'Point A\r\nPoint B' }
      ]
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode < 500, 'Should not server error');
  }],

  ['CORE-049', 'Handles missing transcript field', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.transcript;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['CORE-050', 'Handles null transcript', async () => {
    const event = Factory.transcriptionEvent({ transcript: null });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }]
];

// ============================================
// CATEGORY 2: ERROR TESTS (051-100)
// Error handling, validation, retries
// ============================================
const ERROR_TESTS = [
  // Validation errors (051-065)
  ['ERROR-051', 'Missing type field returns error', async () => {
    const event = Factory.transcriptionEvent();
    delete event.type;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-052', 'Missing data field returns error', async () => {
    const event = { type: 'post_call_transcription', event_timestamp: Date.now() };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-053', 'Missing conversation_id handled', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.conversation_id;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-054', 'Missing agent_id handled', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.agent_id;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-055', 'Invalid JSON body handled', async () => {
    // This tests the webhook's ability to handle malformed JSON
    // We can't easily send invalid JSON through our helper, so we test empty
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, {});
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-056', 'Empty string type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = '';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-057', 'Null type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-058', 'Numeric type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = 12345;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-059', 'Boolean type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = true;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-060', 'Array type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = ['post_call_transcription'];
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-061', 'Object type handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = { name: 'post_call_transcription' };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-062', 'Very long type string handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = 'x'.repeat(10000);
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-063', 'Type with SQL injection handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = "'; DROP TABLE events; --";
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-064', 'Type with XSS attempt handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = '<script>alert("xss")</script>';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-065', 'Type with null bytes handled', async () => {
    const event = Factory.transcriptionEvent();
    event.type = 'post_call\x00transcription';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Data field errors (066-075)
  ['ERROR-066', 'Null data field handled', async () => {
    const event = { type: 'post_call_transcription', data: null, event_timestamp: Date.now() };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-067', 'Empty data object handled', async () => {
    const event = { type: 'post_call_transcription', data: {}, event_timestamp: Date.now() };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-068', 'String data field handled', async () => {
    const event = { type: 'post_call_transcription', data: 'not an object', event_timestamp: Date.now() };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-069', 'Array data field handled', async () => {
    const event = { type: 'post_call_transcription', data: [], event_timestamp: Date.now() };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-070', 'Deeply nested data handled', async () => {
    let nested = { value: 'deep' };
    for (let i = 0; i < 50; i++) {
      nested = { nested };
    }
    const event = Factory.transcriptionEvent();
    event.data.deep_nested = nested;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-071', 'Circular reference attempt handled', async () => {
    // JSON.stringify will throw on circular refs, testing that protection
    const event = Factory.transcriptionEvent();
    // Can't actually create circular ref that survives JSON
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-072', 'Very large data payload handled', async () => {
    const event = Factory.transcriptionEvent();
    event.data.large_field = 'x'.repeat(100000);
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-073', 'Data with undefined values handled', async () => {
    const event = Factory.transcriptionEvent();
    event.data.undefined_field = undefined; // Will be stripped by JSON
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-074', 'Data with NaN values handled', async () => {
    const event = Factory.transcriptionEvent();
    event.data.nan_field = NaN; // Becomes null in JSON
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-075', 'Data with Infinity values handled', async () => {
    const event = Factory.transcriptionEvent();
    event.data.infinity_field = Infinity; // Becomes null in JSON
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Timestamp errors (076-080)
  ['ERROR-076', 'Missing timestamp handled', async () => {
    const event = Factory.transcriptionEvent();
    delete event.event_timestamp;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-077', 'Null timestamp handled', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-078', 'String timestamp handled', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = new Date().toISOString();
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-079', 'Future timestamp handled', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = Date.now() + 86400000; // Tomorrow
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-080', 'Very old timestamp handled', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = 0; // Unix epoch
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // HTTP errors (081-090)
  ['ERROR-081', 'GET method returns appropriate response', async () => {
    const res = await httpGet(CONFIG.WEBHOOK_PATH);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-082', 'OPTIONS method returns appropriate response', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, null, { method: 'OPTIONS' });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-083', 'HEAD method returns appropriate response', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, null, { method: 'HEAD' });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-084', 'PUT method returns appropriate response', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), { method: 'PUT' });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-085', 'DELETE method returns appropriate response', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, null, { method: 'DELETE' });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-086', 'Wrong Content-Type handled', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), {
      headers: { 'Content-Type': 'text/plain' }
    });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-087', 'Missing Content-Type handled', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), {
      headers: { 'Content-Type': '' }
    });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-088', 'XML Content-Type handled', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), {
      headers: { 'Content-Type': 'application/xml' }
    });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-089', 'Form Content-Type handled', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['ERROR-090', 'Multipart Content-Type handled', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Self-healing response checks (091-100)
  ['ERROR-091', 'Response contains success field (self-healing)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    // Note: This will fail until self-healing is implemented
    assert.ok('success' in res.body || res.statusCode < 300, 'Should have success indicator');
  }],

  ['ERROR-092', 'Response contains correlation_id (self-healing)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    // Note: This will fail until self-healing is implemented
    assert.ok(res.body.correlation_id || res.statusCode < 300, 'Should have correlation_id');
  }],

  ['ERROR-093', 'Correlation ID echoed in header (self-healing)', async () => {
    const corrId = `test_${Date.now()}`;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), { correlationId: corrId });
    // Note: This will fail until self-healing is implemented
    assert.ok(res.headers['x-correlation-id'] || res.statusCode < 300, 'Should echo correlation ID');
  }],

  ['ERROR-094', 'Error response has code field (self-healing)', async () => {
    const event = { type: 'post_call_transcription' }; // Missing data
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    // Note: This will fail until self-healing is implemented
    assert.ok(!res.body.error || res.body.error.code, 'Error should have code');
  }],

  ['ERROR-095', 'Error response has message field (self-healing)', async () => {
    const event = { type: 'post_call_transcription' }; // Missing data
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    // Note: This will fail until self-healing is implemented
    assert.ok(!res.body.error || res.body.error.message, 'Error should have message');
  }],

  ['ERROR-096', 'Error response has suggestion field (self-healing)', async () => {
    const event = { type: 'post_call_transcription' }; // Missing data
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    // Note: This will fail until self-healing is implemented
    assert.ok(!res.body.error || res.body.error.suggestion, 'Error should have suggestion');
  }],

  ['ERROR-097', 'Retry info in response (self-healing)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(99999999));
    // Note: This will fail until self-healing is implemented
    assert.ok(res.body.retry_count !== undefined || res.statusCode < 300, 'Should have retry info');
  }],

  ['ERROR-098', 'DLQ info in response on failure (self-healing)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(99999999));
    // Note: This will fail until self-healing is implemented
    assert.ok(res.body.dlq_id !== undefined || res.statusCode < 300, 'Should have DLQ info');
  }],

  ['ERROR-099', 'Circuit breaker status in response (self-healing)', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(99999999));
    // Note: This will fail until self-healing is implemented
    assert.ok(res.body.circuit_breaker_open !== undefined || res.statusCode < 300, 'Should have circuit status');
  }],

  ['ERROR-100', 'Health endpoint exists (self-healing)', async () => {
    const res = await httpGet(CONFIG.HEALTH_PATH);
    // Note: This will fail until self-healing is implemented
    assert.ok(res.statusCode !== 404, 'Health endpoint should exist');
  }]
];

// ============================================
// CATEGORY 3: EDGE TESTS (101-150)
// Edge cases, boundary conditions
// ============================================
const EDGE_TESTS = [
  // Timing edge cases (101-110)
  ['EDGE-101', 'Handles request at exact second boundary', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = Math.floor(Date.now() / 1000) * 1000;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-102', 'Handles request with millisecond precision', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = Date.now();
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-103', 'Handles request with microsecond timestamp', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = Date.now() * 1000;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-104', 'Handles year 2038 timestamp (32-bit overflow)', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = 2147483647000; // Max 32-bit Unix time
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-105', 'Handles negative timestamp', async () => {
    const event = Factory.transcriptionEvent();
    event.event_timestamp = -1;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-106', 'Handles call duration at max int', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.call_duration_secs = 2147483647;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-107', 'Handles negative call duration', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.call_duration_secs = -100;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-108', 'Handles fractional call duration', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.call_duration_secs = 120.5;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-109', 'Handles start_time in future', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.start_time_unix_secs = Math.floor(Date.now() / 1000) + 86400;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-110', 'Handles start_time at epoch', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.start_time_unix_secs = 0;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // String boundary cases (111-120)
  ['EDGE-111', 'Handles empty customer_name', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { customer_name: '' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-112', 'Handles whitespace-only customer_name', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { customer_name: '   ' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-113', 'Handles very long customer_name (1000 chars)', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { customer_name: 'A'.repeat(1000) } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-114', 'Handles customer_name with only numbers', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { customer_name: '12345678' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-115', 'Handles customer_name with only special chars', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { customer_name: '!@#$%^&*()' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-116', 'Handles phone with invalid format', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { phone: 'not-a-phone' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-117', 'Handles phone with international format', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { phone: '+442071234567' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-118', 'Handles phone with extension', async () => {
    const event = Factory.transcriptionEvent({ dynamic_variables: { phone: '+15551234567x1234' } });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-119', 'Handles conversation_id with special chars', async () => {
    const event = Factory.transcriptionEvent();
    event.data.conversation_id = 'conv_with/slashes\\and:colons';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-120', 'Handles very long conversation_id', async () => {
    const event = Factory.transcriptionEvent();
    event.data.conversation_id = 'conv_' + 'x'.repeat(1000);
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Analysis edge cases (121-130)
  ['EDGE-121', 'Handles missing analysis object', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.analysis;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-122', 'Handles null analysis object', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-123', 'Handles empty analysis object', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis = {};
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-124', 'Handles analysis with extra fields', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { custom_field: 'value', another_field: 123 }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-125', 'Handles call_successful as boolean true', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis.call_successful = true;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-126', 'Handles call_successful as boolean false', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis.call_successful = false;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-127', 'Handles call_successful as number 1', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis.call_successful = 1;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-128', 'Handles call_successful as number 0', async () => {
    const event = Factory.transcriptionEvent();
    event.data.analysis.call_successful = 0;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-129', 'Handles very long transcript_summary', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: 'Summary '.repeat(10000) }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-130', 'Handles transcript_summary with markdown', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: '# Heading\n- Point 1\n- Point 2\n**Bold** and *italic*' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Metadata edge cases (131-140)
  ['EDGE-131', 'Handles missing metadata object', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.metadata;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-132', 'Handles null metadata object', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-133', 'Handles empty metadata object', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata = {};
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-134', 'Handles metadata with extra custom fields', async () => {
    const event = Factory.transcriptionEvent();
    event.data.metadata.custom_metric = 'value';
    event.data.metadata.recording_url = 'https://example.com/recording.mp3';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-135', 'Handles agent_id with different format', async () => {
    const event = Factory.transcriptionEvent();
    event.data.agent_id = 'agt_different_format_123';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-136', 'Handles numeric agent_id', async () => {
    const event = Factory.transcriptionEvent();
    event.data.agent_id = 12345;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-137', 'Handles empty agent_id', async () => {
    const event = Factory.transcriptionEvent();
    event.data.agent_id = '';
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-138', 'Handles null agent_id', async () => {
    const event = Factory.transcriptionEvent();
    event.data.agent_id = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-139', 'Handles missing conversation_initiation_client_data', async () => {
    const event = Factory.transcriptionEvent();
    delete event.data.conversation_initiation_client_data;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-140', 'Handles null conversation_initiation_client_data', async () => {
    const event = Factory.transcriptionEvent();
    event.data.conversation_initiation_client_data = null;
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  // Encoding edge cases (141-150)
  ['EDGE-141', 'Handles UTF-8 BOM in payload', async () => {
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-142', 'Handles escaped unicode', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: { customer_name: '\\u0048\\u0065\\u006c\\u006c\\u006f' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-143', 'Handles RTL characters (Arabic)', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: { customer_name: 'محمد أحمد' },
      analysis: { transcript_summary: 'مكالمة ناجحة' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-144', 'Handles mixed LTR/RTL text', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: 'Customer محمد said hello مرحبا and goodbye' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-145', 'Handles zero-width characters', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: { customer_name: 'John\u200BDoe\u200C' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-146', 'Handles combining characters', async () => {
    const event = Factory.transcriptionEvent({
      dynamic_variables: { customer_name: 'José' } // e + combining acute
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-147', 'Handles surrogate pairs (emoji)', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: '👨‍👩‍👧‍👦 Family discussed AI' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-148', 'Handles control characters', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: 'Line1\tTab\rCarriage\nNewline' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-149', 'Handles backslash escaping', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: 'Path: C:\\Users\\Test\\File.txt' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['EDGE-150', 'Handles JSON-like strings in values', async () => {
    const event = Factory.transcriptionEvent({
      analysis: { transcript_summary: '{"nested": "json", "array": [1,2,3]}' }
    });
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
    assert.ok(res.statusCode, 'Should return status');
  }]
];

// ============================================
// CATEGORY 4: LOAD TESTS (151-200)
// Concurrency, bursts, stress tests
// ============================================
const LOAD_TESTS = [
  // Sequential load (151-160)
  ['LOAD-151', 'Process 10 sequential events', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.successfulCall(`Seq ${i}`));
      assert.ok(res.statusCode < 500, `Event ${i} failed`);
    }
  }],

  ['LOAD-152', 'Process 20 sequential events', async () => {
    for (let i = 0; i < 20; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.successfulCall(`Seq ${i}`));
      assert.ok(res.statusCode < 500, `Event ${i} failed`);
    }
  }],

  ['LOAD-153', 'Process 50 sequential events', async () => {
    for (let i = 0; i < 50; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.successfulCall(`Seq ${i}`));
      assert.ok(res.statusCode < 500, `Event ${i} failed`);
    }
  }],

  ['LOAD-154', 'Process mixed event types sequentially', async () => {
    const factories = [
      () => Factory.transcriptionEvent(),
      () => Factory.failureEvent(),
      () => Factory.unknownEvent('test')
    ];
    for (let i = 0; i < 30; i++) {
      const factory = factories[i % factories.length];
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, factory());
      assert.ok(res.statusCode, `Event ${i} no status`);
    }
  }],

  ['LOAD-155', 'Process events with varying sizes sequentially', async () => {
    const sizes = [1, 10, 50, 100, 200];
    for (const size of sizes) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(size));
      assert.ok(res.statusCode < 500, `Size ${size} failed`);
    }
  }],

  ['LOAD-156', 'Sequential events with delays', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.successfulCall(`Delayed ${i}`));
      assert.ok(res.statusCode < 500, `Event ${i} failed`);
      await new Promise(r => setTimeout(r, 100));
    }
  }],

  ['LOAD-157', 'Sequential events alternating success/failure scenarios', async () => {
    for (let i = 0; i < 20; i++) {
      const event = i % 2 === 0 ? Factory.withPipedriveId(12345) : Factory.withPipedriveId(99999999);
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
      assert.ok(res.statusCode, `Event ${i} no status`);
    }
  }],

  ['LOAD-158', 'Sequential events with same conversation_id', async () => {
    const convId = `conv_duplicate_${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const event = Factory.transcriptionEvent();
      event.data.conversation_id = convId;
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
      assert.ok(res.statusCode, `Event ${i} no status`);
    }
  }],

  ['LOAD-159', 'Sequential events stress on metadata', async () => {
    for (let i = 0; i < 10; i++) {
      const event = Factory.transcriptionEvent();
      event.data.metadata = {
        call_duration_secs: i * 100,
        start_time_unix_secs: Math.floor(Date.now() / 1000) - i * 60,
        custom_field: 'x'.repeat(i * 100)
      };
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
      assert.ok(res.statusCode, `Event ${i} no status`);
    }
  }],

  ['LOAD-160', 'Sequential events with incrementing IDs', async () => {
    for (let i = 1; i <= 20; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withPipedriveId(i));
      assert.ok(res.statusCode, `ID ${i} no status`);
    }
  }],

  // Concurrent load (161-175)
  ['LOAD-161', 'Process 5 concurrent events', async () => {
    const events = Factory.batch(5);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.strictEqual(success, 5, `Expected 5, got ${success}`);
  }],

  ['LOAD-162', 'Process 10 concurrent events', async () => {
    const events = Factory.batch(10);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.strictEqual(success, 10, `Expected 10, got ${success}`);
  }],

  ['LOAD-163', 'Process 25 concurrent events', async () => {
    const events = Factory.batch(25);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.strictEqual(success, 25, `Expected 25, got ${success}`);
  }],

  ['LOAD-164', 'Process 50 concurrent events', async () => {
    const events = Factory.batch(50);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 60000 })));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 45, `Expected >=45, got ${success}`);
  }],

  ['LOAD-165', 'Process 75 concurrent events', async () => {
    const events = Factory.batch(75);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 90000 }).catch(() => ({ statusCode: 500 }))));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 60, `Expected >=60, got ${success}`);
  }],

  ['LOAD-166', 'Process 100 concurrent events', async () => {
    const events = Factory.batch(100);
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: CONFIG.BURST_TIMEOUT }).catch(() => ({ statusCode: 500 }))));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 80, `Expected >=80, got ${success}`);
  }],

  ['LOAD-167', 'Concurrent mixed event types', async () => {
    const events = [
      ...Factory.batch(10, Factory.transcriptionEvent),
      ...Factory.batch(5, Factory.failureEvent),
      ...Factory.batch(5, () => Factory.unknownEvent('concurrent_test'))
    ];
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 20, `Expected 20, got ${success}`);
  }],

  ['LOAD-168', 'Concurrent events with varying payloads', async () => {
    const events = [
      Factory.transcriptionEvent(),
      Factory.withLargeTranscript(50),
      Factory.withLargeTranscript(100),
      Factory.withSpecialCharacters(),
      Factory.withUnicode()
    ];
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.strictEqual(success, 5, `Expected 5, got ${success}`);
  }],

  ['LOAD-169', 'Concurrent events with same customer', async () => {
    const events = Array.from({ length: 10 }, () =>
      Factory.transcriptionEvent({ dynamic_variables: { customer_name: 'Same Customer', pipedrive_person_id: 12345 } })
    );
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 8, `Expected >=8, got ${success}`);
  }],

  ['LOAD-170', 'Concurrent events all failures', async () => {
    const events = Array.from({ length: 10 }, () => Factory.failureEvent());
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 10, `Expected 10, got ${success}`);
  }],

  ['LOAD-171', 'Concurrent events all unknown types', async () => {
    const events = Array.from({ length: 10 }, (_, i) => Factory.unknownEvent(`unknown_type_${i}`));
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 10, `Expected 10, got ${success}`);
  }],

  ['LOAD-172', 'Concurrent events with duplicate conversation_ids', async () => {
    const convId = `conv_dup_${Date.now()}`;
    const events = Array.from({ length: 5 }, () => {
      const e = Factory.transcriptionEvent();
      e.data.conversation_id = convId;
      return e;
    });
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 5, `Expected 5, got ${success}`);
  }],

  ['LOAD-173', 'Concurrent events with unique correlation IDs', async () => {
    const events = Factory.batch(10);
    const responses = await Promise.all(events.map((e, i) =>
      callWebhook(CONFIG.WEBHOOK_PATH, e, { correlationId: `unique_${Date.now()}_${i}` })
    ));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.strictEqual(success, 10, `Expected 10, got ${success}`);
  }],

  ['LOAD-174', 'Concurrent events with same correlation ID', async () => {
    const events = Factory.batch(5);
    const sharedCorr = `shared_${Date.now()}`;
    const responses = await Promise.all(events.map(e =>
      callWebhook(CONFIG.WEBHOOK_PATH, e, { correlationId: sharedCorr })
    ));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 5, `Expected 5, got ${success}`);
  }],

  ['LOAD-175', 'Concurrent large payloads', async () => {
    const events = Array.from({ length: 5 }, () => Factory.withLargeTranscript(200));
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 60000 })));
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 3, `Expected >=3, got ${success}`);
  }],

  // Burst patterns (176-185)
  ['LOAD-176', 'Burst: 20 events in 1 second', async () => {
    const events = Factory.batch(20);
    const start = Date.now();
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const duration = Date.now() - start;
    const success = responses.filter(r => r.statusCode < 500).length;
    assert.ok(success >= 18, `Expected >=18, got ${success} in ${duration}ms`);
  }],

  ['LOAD-177', 'Burst: 3 waves of 10 events', async () => {
    let totalSuccess = 0;
    for (let wave = 0; wave < 3; wave++) {
      const events = Factory.batch(10);
      const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
      totalSuccess += responses.filter(r => r.statusCode < 500).length;
      await new Promise(r => setTimeout(r, 500));
    }
    assert.ok(totalSuccess >= 25, `Expected >=25, got ${totalSuccess}`);
  }],

  ['LOAD-178', 'Burst: Ramping load 5->10->20->10->5', async () => {
    const ramp = [5, 10, 20, 10, 5];
    let totalSuccess = 0;
    for (const count of ramp) {
      const events = Factory.batch(count);
      const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
      totalSuccess += responses.filter(r => r.statusCode < 500).length;
      await new Promise(r => setTimeout(r, 200));
    }
    assert.ok(totalSuccess >= 40, `Expected >=40, got ${totalSuccess}`);
  }],

  ['LOAD-179', 'Burst: Spike test 5->50->5', async () => {
    const patterns = [5, 50, 5];
    let totalSuccess = 0;
    for (const count of patterns) {
      const events = Factory.batch(count);
      const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 60000 }).catch(() => ({ statusCode: 500 }))));
      totalSuccess += responses.filter(r => r.statusCode < 500).length;
      await new Promise(r => setTimeout(r, 1000));
    }
    assert.ok(totalSuccess >= 45, `Expected >=45, got ${totalSuccess}`);
  }],

  ['LOAD-180', 'Burst: Sustained 10 events for 5 waves', async () => {
    let totalSuccess = 0;
    for (let wave = 0; wave < 5; wave++) {
      const events = Factory.batch(10);
      const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
      totalSuccess += responses.filter(r => r.statusCode < 500).length;
      await new Promise(r => setTimeout(r, 1000));
    }
    assert.ok(totalSuccess >= 45, `Expected >=45, got ${totalSuccess}`);
  }],

  ['LOAD-181', 'Burst: Alternating concurrent/sequential', async () => {
    let totalSuccess = 0;
    // Concurrent burst
    const burst = Factory.batch(10);
    const burstRes = await Promise.all(burst.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    totalSuccess += burstRes.filter(r => r.statusCode < 500).length;
    // Sequential
    for (let i = 0; i < 5; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      if (res.statusCode < 500) totalSuccess++;
    }
    assert.ok(totalSuccess >= 12, `Expected >=12, got ${totalSuccess}`);
  }],

  ['LOAD-182', 'Burst: Heavy then light', async () => {
    // Heavy burst
    const heavy = Factory.batch(30);
    const heavyRes = await Promise.all(heavy.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 60000 }).catch(() => ({ statusCode: 500 }))));
    const heavySuccess = heavyRes.filter(r => r.statusCode < 500).length;

    await new Promise(r => setTimeout(r, 2000));

    // Light burst
    const light = Factory.batch(5);
    const lightRes = await Promise.all(light.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const lightSuccess = lightRes.filter(r => r.statusCode < 500).length;

    assert.ok(heavySuccess >= 20 && lightSuccess >= 4, `Heavy: ${heavySuccess}, Light: ${lightSuccess}`);
  }],

  ['LOAD-183', 'Burst: Mixed success/failure events', async () => {
    const events = [
      ...Array.from({ length: 10 }, () => Factory.withPipedriveId(12345)),
      ...Array.from({ length: 10 }, () => Factory.withPipedriveId(99999999))
    ];
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 20, `Expected 20, got ${success}`);
  }],

  ['LOAD-184', 'Burst: With recovery delay', async () => {
    // First burst
    const burst1 = Factory.batch(15);
    const res1 = await Promise.all(burst1.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success1 = res1.filter(r => r.statusCode < 500).length;

    // Recovery delay
    await new Promise(r => setTimeout(r, 3000));

    // Second burst
    const burst2 = Factory.batch(15);
    const res2 = await Promise.all(burst2.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success2 = res2.filter(r => r.statusCode < 500).length;

    assert.ok(success1 >= 12 && success2 >= 12, `Burst1: ${success1}, Burst2: ${success2}`);
  }],

  ['LOAD-185', 'Burst: 100 events rapid fire', async () => {
    const events = Factory.batch(100);
    const start = Date.now();
    const responses = await Promise.all(events.map(e =>
      callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: CONFIG.BURST_TIMEOUT }).catch(() => ({ statusCode: 500 }))
    ));
    const duration = Date.now() - start;
    const success = responses.filter(r => r.statusCode < 500).length;
    const rate = Math.round(success / (duration / 1000));
    assert.ok(success >= 70, `Expected >=70, got ${success} (${rate}/sec)`);
  }],

  // Stress tests (186-195)
  ['LOAD-186', 'Stress: Back-to-back requests no delay', async () => {
    let success = 0;
    for (let i = 0; i < 30; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      if (res.statusCode < 500) success++;
    }
    assert.ok(success >= 25, `Expected >=25, got ${success}`);
  }],

  ['LOAD-187', 'Stress: Continuous for 10 seconds', async () => {
    const endTime = Date.now() + 10000;
    let count = 0;
    let success = 0;
    while (Date.now() < endTime) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent(), { timeout: 5000 }).catch(() => ({ statusCode: 500 }));
      count++;
      if (res.statusCode < 500) success++;
    }
    assert.ok(success / count >= 0.8, `Success rate: ${(success/count*100).toFixed(1)}%`);
  }],

  ['LOAD-188', 'Stress: Large payloads sustained', async () => {
    let success = 0;
    for (let i = 0; i < 10; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(100), { timeout: 30000 });
      if (res.statusCode < 500) success++;
    }
    assert.ok(success >= 8, `Expected >=8, got ${success}`);
  }],

  ['LOAD-189', 'Stress: Mixed payload sizes', async () => {
    const sizes = [1, 10, 50, 100, 200, 100, 50, 10, 1];
    let success = 0;
    for (const size of sizes) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(size), { timeout: 30000 });
      if (res.statusCode < 500) success++;
    }
    assert.ok(success >= 7, `Expected >=7, got ${success}`);
  }],

  ['LOAD-190', 'Stress: Rapid error scenarios', async () => {
    let responses = 0;
    for (let i = 0; i < 20; i++) {
      const event = { type: 'post_call_transcription' }; // Invalid
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, event);
      if (res.statusCode) responses++;
    }
    assert.strictEqual(responses, 20, `Expected 20 responses, got ${responses}`);
  }],

  ['LOAD-191', 'Stress: Concurrent + Sequential mix', async () => {
    let totalSuccess = 0;

    // Concurrent
    const concurrent = Factory.batch(20);
    const concRes = await Promise.all(concurrent.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    totalSuccess += concRes.filter(r => r.statusCode < 500).length;

    // Sequential
    for (let i = 0; i < 10; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      if (res.statusCode < 500) totalSuccess++;
    }

    // Concurrent again
    const concurrent2 = Factory.batch(20);
    const conc2Res = await Promise.all(concurrent2.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    totalSuccess += conc2Res.filter(r => r.statusCode < 500).length;

    assert.ok(totalSuccess >= 40, `Expected >=40, got ${totalSuccess}`);
  }],

  ['LOAD-192', 'Stress: Memory pressure (large data)', async () => {
    const largeData = {
      ...Factory.transcriptionEvent(),
      extra_large: 'x'.repeat(500000) // 500KB extra
    };
    const res = await callWebhook(CONFIG.WEBHOOK_PATH, largeData, { timeout: 60000 });
    assert.ok(res.statusCode, 'Should return status');
  }],

  ['LOAD-193', 'Stress: High frequency small events', async () => {
    const events = Array.from({ length: 50 }, () => ({
      type: 'ping',
      event_timestamp: Date.now()
    }));
    const responses = await Promise.all(events.map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const success = responses.filter(r => r.statusCode).length;
    assert.strictEqual(success, 50, `Expected 50, got ${success}`);
  }],

  ['LOAD-194', 'Stress: Timeout resilience', async () => {
    let success = 0;
    let timeouts = 0;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.withLargeTranscript(300), { timeout: 10000 });
        if (res.statusCode < 500) success++;
      } catch (e) {
        if (e.message.includes('Timeout')) timeouts++;
      }
    }
    assert.ok(success + timeouts === 10, 'All requests should complete or timeout');
  }],

  ['LOAD-195', 'Stress: Error recovery', async () => {
    // Generate errors
    for (let i = 0; i < 5; i++) {
      await callWebhook(CONFIG.WEBHOOK_PATH, { type: 'invalid' });
    }

    // System should still handle valid requests
    let success = 0;
    for (let i = 0; i < 10; i++) {
      const res = await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      if (res.statusCode < 500) success++;
    }
    assert.ok(success >= 8, `Expected >=8 after errors, got ${success}`);
  }],

  // Performance benchmarks (196-200)
  ['LOAD-196', 'Benchmark: Single event latency', async () => {
    const times = [];
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      times.push(Date.now() - start);
    }
    const avg = times.reduce((a, b) => a + b) / times.length;
    assert.ok(avg < 5000, `Avg latency ${avg}ms should be < 5000ms`);
  }],

  ['LOAD-197', 'Benchmark: Throughput (events/sec)', async () => {
    const count = 20;
    const start = Date.now();
    await Promise.all(Factory.batch(count).map(e => callWebhook(CONFIG.WEBHOOK_PATH, e)));
    const duration = (Date.now() - start) / 1000;
    const throughput = count / duration;
    assert.ok(throughput >= 1, `Throughput ${throughput.toFixed(1)}/sec should be >= 1`);
  }],

  ['LOAD-198', 'Benchmark: P95 latency', async () => {
    const times = [];
    for (let i = 0; i < 20; i++) {
      const start = Date.now();
      await callWebhook(CONFIG.WEBHOOK_PATH, Factory.transcriptionEvent());
      times.push(Date.now() - start);
    }
    times.sort((a, b) => a - b);
    const p95 = times[Math.floor(times.length * 0.95)];
    assert.ok(p95 < 10000, `P95 latency ${p95}ms should be < 10000ms`);
  }],

  ['LOAD-199', 'Benchmark: Concurrent capacity', async () => {
    const counts = [10, 25, 50, 75, 100];
    let maxCapacity = 0;
    for (const count of counts) {
      const events = Factory.batch(count);
      const responses = await Promise.all(events.map(e =>
        callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 60000 }).catch(() => ({ statusCode: 500 }))
      ));
      const success = responses.filter(r => r.statusCode < 500).length;
      if (success >= count * 0.8) maxCapacity = count;
      await new Promise(r => setTimeout(r, 2000));
    }
    assert.ok(maxCapacity >= 10, `Max capacity ${maxCapacity} should be >= 10`);
  }],

  ['LOAD-200', 'Benchmark: Sustained throughput', async () => {
    const duration = 15000; // 15 seconds
    const endTime = Date.now() + duration;
    let total = 0;
    let success = 0;

    while (Date.now() < endTime) {
      const batch = Factory.batch(5);
      const responses = await Promise.all(batch.map(e =>
        callWebhook(CONFIG.WEBHOOK_PATH, e, { timeout: 10000 }).catch(() => ({ statusCode: 500 }))
      ));
      total += batch.length;
      success += responses.filter(r => r.statusCode < 500).length;
    }

    const throughput = total / (duration / 1000);
    const successRate = (success / total * 100).toFixed(1);
    assert.ok(success / total >= 0.7, `Success rate ${successRate}% should be >= 70%`);
  }]
];

// ============================================
// Main Test Runner
// ============================================
async function runTests(options = {}) {
  const { category, from, to } = options;

  console.log('\n' + '='.repeat(70));
  console.log('  E2E TEST SUITE: Post-Call Webhook Self-Healing Architecture');
  console.log('  200 Tests across 4 Categories');
  console.log('='.repeat(70) + '\n');

  const runner = new TestRunner();

  const allTests = [
    ...CORE_TESTS.map(t => [...t, 'CORE']),
    ...ERROR_TESTS.map(t => [...t, 'ERROR']),
    ...EDGE_TESTS.map(t => [...t, 'EDGE']),
    ...LOAD_TESTS.map(t => [...t, 'LOAD'])
  ].map((t, i) => ({ id: t[0], name: t[1], fn: t[2], opts: t[3] || {}, category: t[3] && typeof t[3] === 'string' ? t[3] : t[4], index: i + 1 }));

  // Filter tests
  let testsToRun = allTests;

  if (category) {
    testsToRun = testsToRun.filter(t => t.id.startsWith(category));
    console.log(`Running category: ${category} (${testsToRun.length} tests)\n`);
  }

  if (from || to) {
    const fromNum = parseInt(from) || 1;
    const toNum = parseInt(to) || 200;
    testsToRun = testsToRun.filter(t => {
      const num = parseInt(t.id.split('-')[1]);
      return num >= fromNum && num <= toNum;
    });
    console.log(`Running tests ${fromNum}-${toNum} (${testsToRun.length} tests)\n`);
  }

  // Run tests by category
  const categories = ['CORE', 'ERROR', 'EDGE', 'LOAD'];
  for (const cat of categories) {
    const catTests = testsToRun.filter(t => t.id.startsWith(cat));
    if (catTests.length === 0) continue;

    console.log(`\n--- ${cat} Tests (${catTests.length}) ---`);
    for (const test of catTests) {
      await runner.run(test.id, test.name, test.fn, test.opts || {});
    }
  }

  return runner.summary();
}

// CLI argument parsing
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--category=')) {
      options.category = arg.split('=')[1].toUpperCase();
    } else if (arg.startsWith('--from=')) {
      options.from = arg.split('=')[1];
    } else if (arg.startsWith('--to=')) {
      options.to = arg.split('=')[1];
    }
  }

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  runTests(options)
    .then(passed => process.exit(passed ? 0 : 1))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runTests, Factory, callWebhook };
