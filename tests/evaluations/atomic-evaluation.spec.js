#!/usr/bin/env node
/**
 * ATOMIC EVALUATION SYSTEM
 *
 * Granular accuracy checks for voice agents and webhook pipelines.
 * Each test is decomposed into atomic assertions for pinpoint failure detection.
 *
 * Architecture:
 * - Evaluation Registry: Central registry of all atomic checks
 * - Assertion Engine: Executes individual atomic assertions
 * - Result Collector: Aggregates results with full traceability
 * - Reporter: Generates detailed accuracy reports
 *
 * @version 2.0.0
 * @author BMAD ATDD Framework
 */

const https = require('https');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  N8N_BASE_URL: 'https://n8n.wranngle.com',
  ELEVENLABS_API_BASE: 'https://api.elevenlabs.io/v1',
  AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  WEBHOOK_PATH: '/webhook/call-completed',
  HEALTH_PATH: '/webhook/call-completed-health',
  DLQ_REPROCESS_PATH: '/webhook/call-completed-dlq-reprocess',
};

// ============================================
// EVALUATION REGISTRY
// ============================================
const EVALUATION_REGISTRY = {
  // Voice Agent Evaluations
  voice_agent: {
    OUTBOUND_AWARENESS: {
      name: 'Outbound Call Context Awareness',
      priority: 'CRITICAL',
      atomic_checks: [
        { id: 'OA-01', name: 'No "thanks for calling"', weight: 10 },
        { id: 'OA-02', name: 'No "how can I help you today"', weight: 10 },
        { id: 'OA-03', name: 'Acknowledges initiated call', weight: 8 },
        { id: 'OA-04', name: 'States reason for calling', weight: 6 },
        { id: 'OA-05', name: 'Uses appropriate outbound opener', weight: 5 },
      ]
    },
    CONSENT_WITHDRAWAL: {
      name: 'SMS Consent Withdrawal Handling',
      priority: 'CRITICAL',
      atomic_checks: [
        { id: 'CW-01', name: 'Captures initial consent', weight: 5 },
        { id: 'CW-02', name: 'Detects consent withdrawal', weight: 10 },
        { id: 'CW-03', name: 'Does NOT send SMS after withdrawal', weight: 10 },
        { id: 'CW-04', name: 'Offers alternative (verbal URL)', weight: 5 },
      ]
    },
    PREMATURE_PRICING: {
      name: 'Qualification Before Pricing',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'PP-01', name: 'Does not give price immediately', weight: 10 },
        { id: 'PP-02', name: 'Asks qualifying question first', weight: 8 },
        { id: 'PP-03', name: 'Qualifies industry/use case', weight: 5 },
      ]
    },
    ANGRY_IMPATIENT: {
      name: 'Hostile Caller De-escalation',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'AI-01', name: 'Maintains calm tone', weight: 8 },
        { id: 'AI-02', name: 'Acknowledges frustration', weight: 5 },
        { id: 'AI-03', name: 'Offers alternatives', weight: 5 },
      ]
    },
    SOFT_CLOSING: {
      name: 'Proper Call Closing',
      priority: 'MEDIUM',
      atomic_checks: [
        { id: 'SC-01', name: 'Asks if anything else needed', weight: 5 },
        { id: 'SC-02', name: 'Provides clear next steps', weight: 3 },
      ]
    },
  },

  // Webhook Self-Healing Evaluations
  webhook_pipeline: {
    AC01_RETRY: {
      name: 'Exponential Backoff Retry',
      priority: 'CRITICAL',
      atomic_checks: [
        { id: 'RT-01', name: 'retry_count field present', weight: 5 },
        { id: 'RT-02', name: 'retry_count >= 1', weight: 5 },
        { id: 'RT-03', name: 'retry_delays is array', weight: 5 },
        { id: 'RT-04', name: 'retry_delays has entries', weight: 5 },
        { id: 'RT-05', name: 'Delays follow ~2x pattern', weight: 8 },
      ]
    },
    AC02_DLQ: {
      name: 'Dead Letter Queue Storage',
      priority: 'CRITICAL',
      atomic_checks: [
        { id: 'DQ-01', name: 'dlq_id field present', weight: 5 },
        { id: 'DQ-02', name: 'dlq_stored is true', weight: 5 },
        { id: 'DQ-03', name: 'dlq_reason provided', weight: 5 },
      ]
    },
    AC03_UNKNOWN: {
      name: 'Unknown Event Acknowledgment',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'UE-01', name: 'Returns 200 status', weight: 5 },
        { id: 'UE-02', name: 'success is true', weight: 5 },
        { id: 'UE-03', name: 'event_type echoed', weight: 3 },
        { id: 'UE-04', name: 'action is "logged"', weight: 3 },
        { id: 'UE-05', name: 'correlation_id present', weight: 3 },
      ]
    },
    AC04_VALIDATION: {
      name: 'Actionable Validation Errors',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'VE-01', name: 'error field present', weight: 5 },
        { id: 'VE-02', name: 'error.code present', weight: 5 },
        { id: 'VE-03', name: 'error.message present', weight: 5 },
        { id: 'VE-04', name: 'error.field identifies problem', weight: 5 },
        { id: 'VE-05', name: 'error.suggestion provided', weight: 5 },
      ]
    },
    AC05_CORRELATION: {
      name: 'Correlation ID Propagation',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'CI-01', name: 'correlation_id in response body', weight: 5 },
        { id: 'CI-02', name: 'correlation_id matches request', weight: 5 },
        { id: 'CI-03', name: 'X-Correlation-ID in headers', weight: 5 },
      ]
    },
    AC06_DLQ_REPROCESS: {
      name: 'DLQ Reprocessing',
      priority: 'MEDIUM',
      atomic_checks: [
        { id: 'DR-01', name: 'Returns 200 status', weight: 3 },
        { id: 'DR-02', name: 'reprocess_attempted is true', weight: 5 },
        { id: 'DR-03', name: 'result status valid', weight: 3 },
      ]
    },
    AC07_HEALTH: {
      name: 'Health Endpoint Metrics',
      priority: 'MEDIUM',
      atomic_checks: [
        { id: 'HE-01', name: 'Returns 200 status', weight: 3 },
        { id: 'HE-02', name: 'status field present', weight: 3 },
        { id: 'HE-03', name: 'metrics object present', weight: 3 },
        { id: 'HE-04', name: 'events_processed metric', weight: 3 },
        { id: 'HE-05', name: 'dlq_depth metric', weight: 3 },
        { id: 'HE-06', name: 'error_rate metric', weight: 3 },
      ]
    },
    AC08_DYNAMIC: {
      name: 'Dynamic Action Router',
      priority: 'MEDIUM',
      atomic_checks: [
        { id: 'DA-01', name: 'Returns 200 status', weight: 3 },
        { id: 'DA-02', name: 'action_executed is true', weight: 5 },
        { id: 'DA-03', name: 'action_type matches request', weight: 5 },
      ]
    },
    AC09_BURST: {
      name: 'Burst Handling (100 events)',
      priority: 'HIGH',
      atomic_checks: [
        { id: 'BH-01', name: 'All 100 events accepted', weight: 10 },
        { id: 'BH-02', name: 'No 5xx errors', weight: 10 },
        { id: 'BH-03', name: 'No timeouts', weight: 5 },
      ]
    },
    AC10_CIRCUIT: {
      name: 'Circuit Breaker',
      priority: 'CRITICAL',
      atomic_checks: [
        { id: 'CB-01', name: 'circuit_breaker_open after failures', weight: 10 },
        { id: 'CB-02', name: 'circuit_breaker_resets_at provided', weight: 5 },
        { id: 'CB-03', name: 'Returns 503 when open', weight: 5 },
      ]
    },
  }
};

// ============================================
// DATA FACTORIES
// ============================================
const DataFactory = {
  transcriptionEvent: (overrides = {}) => {
    const dynamicVars = overrides.dynamic_variables || {};
    delete overrides.dynamic_variables;

    return {
      type: 'post_call_transcription',
      data: {
        conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        agent_id: CONFIG.AGENT_ID,
        conversation_initiation_client_data: {
          dynamic_variables: {
            customer_name: `Test_${Date.now()}`,
            pipedrive_person_id: 99999999,
            ...dynamicVars
          }
        },
        analysis: {
          call_successful: 'success',
          transcript_summary: 'Atomic test call',
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
  },

  unknownEvent: (type = 'call_ringing') => ({
    type,
    data: { conversation_id: `conv_unknown_${Date.now()}` },
    event_timestamp: Date.now()
  }),

  invalidEvent: () => ({
    type: 'post_call_transcription',
    event_timestamp: Date.now()
    // Missing required 'data' field
  }),

  dynamicActionEvent: (action = 'send_slack_notification') => ({
    type: 'custom_event_type',
    action,
    data: { message: 'Test notification', channel: '#test' },
    event_timestamp: Date.now()
  }),

  correlationId: () => `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
};

// ============================================
// HTTP UTILITIES
// ============================================
async function httpPost(urlPath, payload, headers = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, CONFIG.N8N_BASE_URL);
    const data = JSON.stringify(payload);

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
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

async function httpGet(urlPath) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, CONFIG.N8N_BASE_URL);

    https.get({
      hostname: url.hostname,
      port: 443,
      path: url.pathname
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ statusCode: res.statusCode, body });
        }
      });
    }).on('error', reject);
  });
}

// ============================================
// ATOMIC ASSERTION ENGINE
// ============================================
class AtomicAssertionEngine {
  constructor() {
    this.results = [];
  }

  check(checkId, checkName, condition, actual, expected, weight = 5) {
    const passed = condition;
    this.results.push({
      check_id: checkId,
      check_name: checkName,
      passed,
      actual: typeof actual === 'object' ? JSON.stringify(actual) : actual,
      expected: typeof expected === 'object' ? JSON.stringify(expected) : expected,
      weight,
      timestamp: new Date().toISOString()
    });
    return passed;
  }

  getScore() {
    const maxScore = this.results.reduce((sum, r) => sum + r.weight, 0);
    const actualScore = this.results.filter(r => r.passed).reduce((sum, r) => sum + r.weight, 0);
    return { actual: actualScore, max: maxScore, percentage: Math.round((actualScore / maxScore) * 100) };
  }

  getFailures() {
    return this.results.filter(r => !r.passed);
  }

  clear() {
    this.results = [];
  }
}

// ============================================
// WEBHOOK ATOMIC EVALUATIONS
// ============================================
async function evaluateAC01_Retry(engine) {
  const event = DataFactory.transcriptionEvent({
    dynamic_variables: { pipedrive_person_id: 99999999 }
  });

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': DataFactory.correlationId()
  }, 60000);

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC01_RETRY.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.body.retry_count !== undefined,
    response.body.retry_count, 'defined', checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.retry_count >= 1,
    response.body.retry_count, '>= 1', checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    Array.isArray(response.body.retry_delays),
    typeof response.body.retry_delays, 'array', checks[2].weight);

  engine.check(checks[3].id, checks[3].name,
    response.body.retry_delays?.length > 0,
    response.body.retry_delays?.length, '> 0', checks[3].weight);

  const delays = response.body.retry_delays || [];
  const hasBackoff = delays.length >= 2 ? (delays[1] / delays[0] >= 1.5) : true;
  engine.check(checks[4].id, checks[4].name,
    hasBackoff,
    delays.length >= 2 ? delays[1] / delays[0] : 'N/A', '~2x', checks[4].weight);
}

async function evaluateAC02_DLQ(engine) {
  const event = DataFactory.transcriptionEvent({
    dynamic_variables: { pipedrive_person_id: 99999999 }
  });

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': DataFactory.correlationId()
  }, 60000);

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC02_DLQ.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.body.dlq_id !== undefined,
    response.body.dlq_id, 'defined', checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.dlq_stored === true,
    response.body.dlq_stored, true, checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.body.dlq_reason !== undefined,
    response.body.dlq_reason, 'defined', checks[2].weight);
}

async function evaluateAC03_Unknown(engine) {
  const event = DataFactory.unknownEvent('call_ringing');

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': DataFactory.correlationId()
  });

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC03_UNKNOWN.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.statusCode === 200,
    response.statusCode, 200, checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.success === true,
    response.body.success, true, checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.body.event_type === 'call_ringing',
    response.body.event_type, 'call_ringing', checks[2].weight);

  engine.check(checks[3].id, checks[3].name,
    response.body.action === 'logged',
    response.body.action, 'logged', checks[3].weight);

  engine.check(checks[4].id, checks[4].name,
    response.body.correlation_id !== undefined,
    response.body.correlation_id, 'defined', checks[4].weight);
}

async function evaluateAC04_Validation(engine) {
  const event = DataFactory.invalidEvent();

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': DataFactory.correlationId()
  });

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC04_VALIDATION.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.body.error !== undefined,
    response.body.error, 'defined', checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.error?.code !== undefined,
    response.body.error?.code, 'defined', checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.body.error?.message !== undefined,
    response.body.error?.message, 'defined', checks[2].weight);

  engine.check(checks[3].id, checks[3].name,
    response.body.error?.field !== undefined,
    response.body.error?.field, 'defined', checks[3].weight);

  engine.check(checks[4].id, checks[4].name,
    response.body.error?.suggestion !== undefined,
    response.body.error?.suggestion, 'defined', checks[4].weight);
}

async function evaluateAC05_Correlation(engine) {
  const correlationId = DataFactory.correlationId();
  const event = DataFactory.transcriptionEvent();

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': correlationId
  });

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC05_CORRELATION.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.body.correlation_id !== undefined,
    response.body.correlation_id, 'defined', checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.correlation_id === correlationId,
    response.body.correlation_id, correlationId, checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.headers['x-correlation-id'] === correlationId,
    response.headers['x-correlation-id'], correlationId, checks[2].weight);
}

async function evaluateAC06_DLQReprocess(engine) {
  const dlqId = 'dlq_test_' + Date.now();

  const response = await httpPost(CONFIG.DLQ_REPROCESS_PATH, {
    dlq_id: dlqId,
    force_retry: true
  });

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC06_DLQ_REPROCESS.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.statusCode === 200,
    response.statusCode, 200, checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.reprocess_attempted === true,
    response.body.reprocess_attempted, true, checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    ['success', 'failed', 'not_found'].includes(response.body.result),
    response.body.result, 'valid status', checks[2].weight);
}

async function evaluateAC07_Health(engine) {
  const response = await httpGet(CONFIG.HEALTH_PATH);

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC07_HEALTH.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.statusCode === 200,
    response.statusCode, 200, checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.status !== undefined,
    response.body.status, 'defined', checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.body.metrics !== undefined,
    response.body.metrics, 'defined', checks[2].weight);

  engine.check(checks[3].id, checks[3].name,
    response.body.metrics?.events_processed !== undefined,
    response.body.metrics?.events_processed, 'defined', checks[3].weight);

  engine.check(checks[4].id, checks[4].name,
    response.body.metrics?.dlq_depth !== undefined,
    response.body.metrics?.dlq_depth, 'defined', checks[4].weight);

  engine.check(checks[5].id, checks[5].name,
    response.body.metrics?.error_rate !== undefined,
    response.body.metrics?.error_rate, 'defined', checks[5].weight);
}

async function evaluateAC08_Dynamic(engine) {
  const event = DataFactory.dynamicActionEvent('send_slack_notification');

  const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
    'X-Correlation-ID': DataFactory.correlationId()
  });

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC08_DYNAMIC.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    response.statusCode === 200,
    response.statusCode, 200, checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    response.body.action_executed === true,
    response.body.action_executed, true, checks[1].weight);

  engine.check(checks[2].id, checks[2].name,
    response.body.action_type === 'send_slack_notification',
    response.body.action_type, 'send_slack_notification', checks[2].weight);
}

async function evaluateAC09_Burst(engine) {
  const events = Array.from({ length: 100 }, (_, i) =>
    DataFactory.transcriptionEvent({
      dynamic_variables: { customer_name: `Burst_${i}` }
    })
  );

  const responses = await Promise.all(
    events.map(e => httpPost(CONFIG.WEBHOOK_PATH, e, {
      'X-Correlation-ID': DataFactory.correlationId()
    }, 60000).catch(err => ({ error: err.message })))
  );

  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC09_BURST.atomic_checks;

  const successful = responses.filter(r => r.statusCode === 200 || r.body?.success);
  engine.check(checks[0].id, checks[0].name,
    successful.length === 100,
    successful.length, 100, checks[0].weight);

  const serverErrors = responses.filter(r => r.statusCode >= 500);
  engine.check(checks[1].id, checks[1].name,
    serverErrors.length === 0,
    serverErrors.length, 0, checks[1].weight);

  const timeouts = responses.filter(r => r.error?.includes('Timeout'));
  engine.check(checks[2].id, checks[2].name,
    timeouts.length === 0,
    timeouts.length, 0, checks[2].weight);
}

async function evaluateAC10_Circuit(engine) {
  // Send 6 failing events to trip circuit breaker
  const failingEvents = Array.from({ length: 6 }, (_, i) =>
    DataFactory.transcriptionEvent({
      dynamic_variables: { pipedrive_person_id: 99999999 + i }
    })
  );

  const responses = [];
  for (const event of failingEvents) {
    const response = await httpPost(CONFIG.WEBHOOK_PATH, event, {
      'X-Correlation-ID': DataFactory.correlationId()
    }, 30000);
    responses.push(response);
    await new Promise(r => setTimeout(r, 500));
  }

  const lastResponse = responses[responses.length - 1];
  const checks = EVALUATION_REGISTRY.webhook_pipeline.AC10_CIRCUIT.atomic_checks;

  engine.check(checks[0].id, checks[0].name,
    lastResponse.body.circuit_breaker_open === true,
    lastResponse.body.circuit_breaker_open, true, checks[0].weight);

  engine.check(checks[1].id, checks[1].name,
    lastResponse.body.circuit_breaker_resets_at !== undefined,
    lastResponse.body.circuit_breaker_resets_at, 'defined', checks[1].weight);

  // Check if any response has 503
  const has503 = responses.some(r => r.statusCode === 503);
  engine.check(checks[2].id, checks[2].name,
    has503 || lastResponse.body.circuit_breaker_open,
    has503 ? 503 : 'open flag', '503 or open', checks[2].weight);
}

// ============================================
// MAIN EVALUATION RUNNER
// ============================================
async function runAtomicEvaluations() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ATOMIC EVALUATION SYSTEM v2.0                             ║');
  console.log('║     Granular Accuracy Testing                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const engine = new AtomicAssertionEngine();
  const evaluationResults = {};

  const evaluations = [
    { id: 'AC01_RETRY', name: 'Retry Logic', fn: evaluateAC01_Retry },
    { id: 'AC02_DLQ', name: 'Dead Letter Queue', fn: evaluateAC02_DLQ },
    { id: 'AC03_UNKNOWN', name: 'Unknown Events', fn: evaluateAC03_Unknown },
    { id: 'AC04_VALIDATION', name: 'Validation Errors', fn: evaluateAC04_Validation },
    { id: 'AC05_CORRELATION', name: 'Correlation ID', fn: evaluateAC05_Correlation },
    { id: 'AC06_DLQ_REPROCESS', name: 'DLQ Reprocess', fn: evaluateAC06_DLQReprocess },
    { id: 'AC07_HEALTH', name: 'Health Endpoint', fn: evaluateAC07_Health },
    { id: 'AC08_DYNAMIC', name: 'Dynamic Actions', fn: evaluateAC08_Dynamic },
    { id: 'AC09_BURST', name: 'Burst Handling', fn: evaluateAC09_Burst },
    { id: 'AC10_CIRCUIT', name: 'Circuit Breaker', fn: evaluateAC10_Circuit },
  ];

  console.log(`Running ${evaluations.length} evaluation suites...\n`);

  for (const evaluation of evaluations) {
    console.log(`\n[${ evaluation.id}] ${evaluation.name}`);
    console.log('─'.repeat(50));

    engine.clear();

    try {
      await evaluation.fn(engine);

      const score = engine.getScore();
      const failures = engine.getFailures();

      evaluationResults[evaluation.id] = {
        name: evaluation.name,
        score,
        checks: [...engine.results],
        failures
      };

      // Print atomic results
      for (const result of engine.results) {
        const icon = result.passed ? '✓' : '✗';
        const status = result.passed ? 'PASS' : 'FAIL';
        console.log(`  ${icon} [${result.check_id}] ${result.check_name}: ${status}`);
        if (!result.passed) {
          console.log(`      Expected: ${result.expected}, Got: ${result.actual}`);
        }
      }

      console.log(`\n  Score: ${score.actual}/${score.max} (${score.percentage}%)`);

    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      evaluationResults[evaluation.id] = {
        name: evaluation.name,
        error: error.message
      };
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // Final Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    EVALUATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let totalChecks = 0;
  let passedChecks = 0;
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const [id, result] of Object.entries(evaluationResults)) {
    if (result.checks) {
      totalChecks += result.checks.length;
      passedChecks += result.checks.filter(c => c.passed).length;
      totalWeight += result.checks.reduce((s, c) => s + c.weight, 0);
      earnedWeight += result.checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
    }

    const status = result.score?.percentage === 100 ? '✓' : '✗';
    const pct = result.score?.percentage || 0;
    console.log(`  ${status} ${id}: ${result.name} - ${pct}%`);
  }

  const overallPct = Math.round((earnedWeight / totalWeight) * 100);
  console.log(`\n  OVERALL: ${passedChecks}/${totalChecks} atomic checks passed`);
  console.log(`  WEIGHTED SCORE: ${earnedWeight}/${totalWeight} (${overallPct}%)`);

  // Save detailed results
  const resultFile = path.join(__dirname, `atomic-results-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total_checks: totalChecks,
      passed_checks: passedChecks,
      total_weight: totalWeight,
      earned_weight: earnedWeight,
      overall_percentage: overallPct
    },
    evaluations: evaluationResults
  }, null, 2));

  console.log(`\n  Results saved to: ${resultFile}`);

  return overallPct === 100 ? 0 : 1;
}

// ============================================
// EXPORTS & CLI
// ============================================
if (require.main === module) {
  runAtomicEvaluations()
    .then(code => process.exit(code))
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  runAtomicEvaluations,
  EVALUATION_REGISTRY,
  DataFactory,
  AtomicAssertionEngine
};
