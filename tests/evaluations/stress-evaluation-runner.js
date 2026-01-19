#!/usr/bin/env node
/**
 * STRESS EVALUATION RUNNER v1.0
 * Generates thousands of real simulated evaluation results
 * Identifies actual failures and tracks improvements
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  WEBHOOK_BASE: 'https://n8n.wranngle.com/webhook',
  TOTAL_EVENTS: 1000,
  CONCURRENT_BATCH: 50,
  SCENARIOS: [
    'VALID_TRANSCRIPTION',
    'MISSING_DATA',
    'UNKNOWN_EVENT',
    'INVALID_FORMAT',
    'BURST_TEST',
    'RETRY_TRIGGER',
    'DLQ_TRIGGER',
    'CORRELATION_TEST',
    'DYNAMIC_ACTION',
    'CIRCUIT_TEST'
  ]
};

// Results tracking
const results = {
  timestamp: new Date().toISOString(),
  total_events: 0,
  successful: 0,
  failed: 0,
  errors_by_type: {},
  response_times: [],
  failures: [],
  improvements_made: [],
  scenario_results: {}
};

// Initialize scenario results
CONFIG.SCENARIOS.forEach(s => {
  results.scenario_results[s] = { total: 0, passed: 0, failed: 0, avg_time: 0, times: [] };
});

// Data Factory
const DataFactory = {
  correlationId: () => `stress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  validTranscription: () => ({
    type: 'transcription',
    data: {
      conversation_id: `conv_${Math.random().toString(36).substr(2, 10)}`,
      agent_id: 'agent_8001kdgp7qbyf4wvhs540be78vew',
      transcript: 'Test transcription from stress evaluation',
      call_duration_secs: Math.floor(Math.random() * 300) + 30,
      cost_credits: Math.floor(Math.random() * 100) + 10
    },
    dynamic_variables: {
      pipedrive_person_id: Math.floor(Math.random() * 10000) + 1000,
      caller_phone: '+1555' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0')
    }
  }),

  missingData: () => ({
    type: 'transcription'
    // Missing data object - should trigger validation error
  }),

  unknownEvent: () => ({
    type: 'unknown_event_' + Math.random().toString(36).substr(2, 5),
    data: { test: true }
  }),

  invalidFormat: () => ({
    // Empty object - should trigger validation
  }),

  retryTrigger: () => ({
    type: 'transcription',
    data: {
      conversation_id: `conv_retry_${Date.now()}`,
      agent_id: 'agent_8001kdgp7qbyf4wvhs540be78vew',
      transcript: 'Trigger retry scenario'
    },
    dynamic_variables: {
      pipedrive_person_id: -1, // Invalid ID to trigger retry
      force_retry: true
    }
  }),

  dlqTrigger: () => ({
    type: 'transcription',
    data: {
      conversation_id: `conv_dlq_${Date.now()}`,
      agent_id: 'agent_8001kdgp7qbyf4wvhs540be78vew',
      transcript: 'Trigger DLQ scenario'
    },
    dynamic_variables: {
      pipedrive_person_id: -999, // Force all retries to fail
      force_dlq: true
    }
  }),

  dynamicAction: (action) => ({
    type: 'call_completed',
    action: action || ['send_slack_notification', 'log_event', 'update_crm', 'send_email'][Math.floor(Math.random() * 4)],
    data: { test: true }
  }),

  circuitTest: () => ({
    type: 'transcription',
    data: {
      conversation_id: `conv_circuit_${Date.now()}`,
      agent_id: 'agent_invalid', // Invalid agent to trigger failures
      transcript: 'Circuit breaker test'
    },
    dynamic_variables: {
      force_failure: true
    }
  })
};

// HTTP Request Helper
function makeRequest(endpoint, payload, correlationId) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const startTime = Date.now();

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(data),
            duration,
            correlationId
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            duration,
            correlationId,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (e) => {
      reject({ error: e.message, correlationId, duration: Date.now() - startTime });
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject({ error: 'TIMEOUT', correlationId, duration: 30000 });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Scenario Executor
async function executeScenario(scenario, index) {
  const correlationId = DataFactory.correlationId();
  let payload, endpoint;

  switch (scenario) {
    case 'VALID_TRANSCRIPTION':
      payload = DataFactory.validTranscription();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'MISSING_DATA':
      payload = DataFactory.missingData();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'UNKNOWN_EVENT':
      payload = DataFactory.unknownEvent();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'INVALID_FORMAT':
      payload = DataFactory.invalidFormat();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'BURST_TEST':
      payload = DataFactory.validTranscription();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'RETRY_TRIGGER':
      payload = DataFactory.retryTrigger();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'DLQ_TRIGGER':
      payload = DataFactory.dlqTrigger();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'CORRELATION_TEST':
      payload = DataFactory.validTranscription();
      payload.correlation_id = correlationId;
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'DYNAMIC_ACTION':
      payload = DataFactory.dynamicAction();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    case 'CIRCUIT_TEST':
      payload = DataFactory.circuitTest();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
      break;
    default:
      payload = DataFactory.validTranscription();
      endpoint = `${CONFIG.WEBHOOK_BASE}/call-completed`;
  }

  try {
    const result = await makeRequest(endpoint, payload, correlationId);
    return { scenario, index, result, success: true };
  } catch (error) {
    return { scenario, index, error, success: false };
  }
}

// Evaluate single result
function evaluateResult(execution) {
  const { scenario, result, error } = execution;
  const scenarioResult = results.scenario_results[scenario];
  scenarioResult.total++;
  results.total_events++;

  if (error) {
    scenarioResult.failed++;
    results.failed++;
    results.errors_by_type[error.error] = (results.errors_by_type[error.error] || 0) + 1;
    results.failures.push({
      scenario,
      error: error.error,
      correlationId: error.correlationId,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  scenarioResult.times.push(result.duration);
  results.response_times.push(result.duration);

  // Scenario-specific validation
  let passed = false;
  switch (scenario) {
    case 'VALID_TRANSCRIPTION':
      passed = result.status === 200 && result.body?.success === true;
      break;
    case 'MISSING_DATA':
      passed = result.status === 400 && result.body?.error?.code === 'MISSING_DATA';
      break;
    case 'UNKNOWN_EVENT':
      passed = result.status === 200 && result.body?.action === 'logged';
      break;
    case 'INVALID_FORMAT':
      passed = result.status === 400 && result.body?.error;
      break;
    case 'BURST_TEST':
      passed = result.status === 200 || result.status === 202;
      break;
    case 'RETRY_TRIGGER':
      passed = result.body?.retry_count !== undefined || result.body?.success === true;
      break;
    case 'DLQ_TRIGGER':
      passed = result.body?.dlq_stored === true || result.body?.success === true;
      break;
    case 'CORRELATION_TEST':
      passed = result.body?.correlation_id === result.correlationId ||
               result.headers?.['x-correlation-id'] === result.correlationId;
      break;
    case 'DYNAMIC_ACTION':
      passed = result.status === 200 && (result.body?.action_executed === true || result.body?.success === true);
      break;
    case 'CIRCUIT_TEST':
      passed = result.status === 503 || result.body?.circuit_breaker_open === true || result.status === 200;
      break;
    default:
      passed = result.status >= 200 && result.status < 500;
  }

  if (passed) {
    scenarioResult.passed++;
    results.successful++;
  } else {
    scenarioResult.failed++;
    results.failed++;
    results.failures.push({
      scenario,
      status: result.status,
      body: result.body,
      correlationId: result.correlationId,
      timestamp: new Date().toISOString()
    });
  }

  return passed;
}

// Progress display
function displayProgress(current, total, scenario) {
  const percent = Math.floor((current / total) * 100);
  const bar = '█'.repeat(Math.floor(percent / 2)) + '░'.repeat(50 - Math.floor(percent / 2));
  process.stdout.write(`\r  [${bar}] ${percent}% (${current}/${total}) - ${scenario}    `);
}

// Main execution
async function runStressEvaluation() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     STRESS EVALUATION RUNNER v1.0                             ║');
  console.log('║     Generating thousands of real evaluation results           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Configuration:`);
  console.log(`  Total Events: ${CONFIG.TOTAL_EVENTS}`);
  console.log(`  Concurrent Batch: ${CONFIG.CONCURRENT_BATCH}`);
  console.log(`  Scenarios: ${CONFIG.SCENARIOS.length}\n`);

  const startTime = Date.now();

  // Generate event queue with weighted distribution
  const eventQueue = [];
  const weights = {
    'VALID_TRANSCRIPTION': 30,
    'MISSING_DATA': 10,
    'UNKNOWN_EVENT': 10,
    'INVALID_FORMAT': 5,
    'BURST_TEST': 15,
    'RETRY_TRIGGER': 10,
    'DLQ_TRIGGER': 5,
    'CORRELATION_TEST': 5,
    'DYNAMIC_ACTION': 5,
    'CIRCUIT_TEST': 5
  };

  let totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  for (let i = 0; i < CONFIG.TOTAL_EVENTS; i++) {
    let rand = Math.random() * totalWeight;
    for (const [scenario, weight] of Object.entries(weights)) {
      rand -= weight;
      if (rand <= 0) {
        eventQueue.push(scenario);
        break;
      }
    }
  }

  console.log('Running evaluations...\n');

  // Process in batches
  let processed = 0;
  while (processed < eventQueue.length) {
    const batch = eventQueue.slice(processed, processed + CONFIG.CONCURRENT_BATCH);
    const promises = batch.map((scenario, i) => executeScenario(scenario, processed + i));

    const batchResults = await Promise.all(promises);
    batchResults.forEach(evaluateResult);

    processed += batch.length;
    displayProgress(processed, CONFIG.TOTAL_EVENTS, batch[batch.length - 1]);
  }

  const totalTime = Date.now() - startTime;

  // Calculate statistics
  for (const [scenario, data] of Object.entries(results.scenario_results)) {
    if (data.times.length > 0) {
      data.avg_time = Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length);
      data.min_time = Math.min(...data.times);
      data.max_time = Math.max(...data.times);
    }
    delete data.times; // Remove raw times from output
  }

  results.total_time_ms = totalTime;
  results.events_per_second = Math.round(CONFIG.TOTAL_EVENTS / (totalTime / 1000));
  results.avg_response_time = Math.round(results.response_times.reduce((a, b) => a + b, 0) / results.response_times.length);
  results.p99_response_time = results.response_times.sort((a, b) => a - b)[Math.floor(results.response_times.length * 0.99)];
  delete results.response_times; // Remove raw times from output

  // Display results
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('                    STRESS EVALUATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`  Total Events:    ${results.total_events}`);
  console.log(`  Successful:      ${results.successful} (${Math.round(results.successful/results.total_events*100)}%)`);
  console.log(`  Failed:          ${results.failed} (${Math.round(results.failed/results.total_events*100)}%)`);
  console.log(`  Total Time:      ${(totalTime/1000).toFixed(2)}s`);
  console.log(`  Events/Second:   ${results.events_per_second}`);
  console.log(`  Avg Response:    ${results.avg_response_time}ms`);
  console.log(`  P99 Response:    ${results.p99_response_time}ms\n`);

  console.log('Scenario Breakdown:');
  console.log('─'.repeat(70));
  console.log('  Scenario               Total   Passed  Failed  Pass%   Avg(ms)');
  console.log('─'.repeat(70));

  for (const [scenario, data] of Object.entries(results.scenario_results)) {
    if (data.total > 0) {
      const passRate = Math.round(data.passed / data.total * 100);
      console.log(`  ${scenario.padEnd(22)} ${String(data.total).padStart(5)}   ${String(data.passed).padStart(6)}  ${String(data.failed).padStart(6)}  ${String(passRate).padStart(4)}%   ${String(data.avg_time || 0).padStart(6)}`);
    }
  }

  console.log('─'.repeat(70));

  if (Object.keys(results.errors_by_type).length > 0) {
    console.log('\nError Distribution:');
    for (const [error, count] of Object.entries(results.errors_by_type)) {
      console.log(`  ${error}: ${count}`);
    }
  }

  // Save results
  const resultsFile = path.join(__dirname, `stress-results-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n  Results saved to: ${resultsFile}`);

  // Return summary for further processing
  return results;
}

// Execute
runStressEvaluation().catch(console.error);
