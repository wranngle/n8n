#!/usr/bin/env bun

/**
 * Webhook Health Check Utility
 *
 * Quick diagnostic tool for the client initiation data webhook.
 * Tests connectivity, response format, performance, and data quality.
 *
 * Usage:
 *   bun run supersystem/tools/webhook-health-check.js
 *   bun run supersystem/tools/webhook-health-check.js --verbose
 *   bun run supersystem/tools/webhook-health-check.js --phone=+15551234567
 *
 * Options:
 *   --verbose      Show detailed request/response data
 *   --phone=NUM    Use specific phone number for test
 *   --quick        Skip performance tests (fast check only)
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://n8n.wranngle.com/webhook/client-initiation-data';
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Parse args
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const quick = args.includes('--quick');
const phoneArg = args.find(arg => arg.startsWith('--phone='));
const testPhone = phoneArg ? phoneArg.split('=')[1] : '+15551234567';

// Test results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Test helper
 */
async function test(name, fn) {
  process.stdout.write(`\n🧪 ${name}... `);

  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    process.stdout.write(`✅ (${duration}ms)\n`);

    if (verbose && result) {
      console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
    }

    results.passed++;
    results.tests.push({ name, status: 'passed', duration });
    return result;
  } catch (error) {
    process.stdout.write(`❌\n`);
    console.log(`   Error: ${error.message}`);

    results.failed++;
    results.tests.push({ name, status: 'failed', error: error.message });
    return null;
  }
}

/**
 * Warning helper
 */
function warn(message) {
  console.log(`   ⚠️  ${message}`);
  results.warnings++;
}

/**
 * Call webhook
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
      statusText: response.statusText,
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
 * Health checks
 */

async function checkConnectivity() {
  const payload = {
    caller_id: testPhone,
    agent_id: SARAH_AGENT_ID,
    called_number: '+18882662193',
    call_sid: 'HEALTH_CHECK_CONNECTIVITY'
  };

  const response = await callWebhook(payload);

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  if (response.latency > 1000) {
    warn(`High latency: ${response.latency}ms`);
  }

  return { latency: response.latency };
}

async function checkResponseFormat() {
  const payload = {
    caller_id: testPhone,
    agent_id: SARAH_AGENT_ID,
    called_number: '+18882662193',
    call_sid: 'HEALTH_CHECK_FORMAT'
  };

  const response = await callWebhook(payload);

  if (!response.data) {
    throw new Error('No response data received');
  }

  if (response.data.type !== 'conversation_initiation_client_data') {
    throw new Error(`Invalid type: ${response.data.type}`);
  }

  if (!response.data.dynamic_variables) {
    throw new Error('Missing dynamic_variables object');
  }

  // Check all required variables
  const requiredVars = [
    'customer_name', 'customer_first_name', 'company', 'industry',
    'account_tier', 'call_history', 'interaction_count', 'last_topic',
    'notes', 'lookup_success', 'data_source',
    'secret__pipedrive_person_id', 'secret__pipedrive_org_id', 'secret__google_sheet_row'
  ];

  for (const varName of requiredVars) {
    if (!(varName in response.data.dynamic_variables)) {
      throw new Error(`Missing required variable: ${varName}`);
    }
  }

  return { variableCount: Object.keys(response.data.dynamic_variables).length };
}

async function checkDataQuality() {
  const payload = {
    caller_id: testPhone,
    agent_id: SARAH_AGENT_ID,
    called_number: '+18882662193',
    call_sid: 'HEALTH_CHECK_QUALITY'
  };

  const response = await callWebhook(payload);
  const vars = response.data.dynamic_variables;

  // Check data types
  if (typeof vars.customer_name !== 'string') {
    throw new Error('customer_name should be string');
  }

  if (typeof vars.interaction_count !== 'number') {
    throw new Error('interaction_count should be number');
  }

  if (typeof vars.lookup_success !== 'boolean') {
    throw new Error('lookup_success should be boolean');
  }

  if (typeof vars.secret__pipedrive_person_id !== 'number') {
    throw new Error('secret__pipedrive_person_id should be number');
  }

  // Check valid account tier
  const validTiers = ['New', 'Bronze', 'Silver', 'Gold'];
  if (!validTiers.includes(vars.account_tier)) {
    warn(`Invalid account_tier: ${vars.account_tier}`);
  }

  // Check data source
  const validSources = ['pipedrive', 'sheets', 'cache', 'none'];
  if (!validSources.includes(vars.data_source)) {
    throw new Error(`Invalid data_source: ${vars.data_source}`);
  }

  return {
    dataSource: vars.data_source,
    enriched: vars.lookup_success
  };
}

async function checkInvalidAgent() {
  const payload = {
    caller_id: testPhone,
    agent_id: 'agent_INVALID_ID',
    called_number: '+18882662193',
    call_sid: 'HEALTH_CHECK_INVALID'
  };

  const response = await callWebhook(payload);

  if (response.status !== 400) {
    throw new Error(`Expected 400 for invalid agent, got ${response.status}`);
  }

  return { rejectedCorrectly: true };
}

async function checkPerformance() {
  const latencies = [];
  const iterations = 10;

  for (let i = 0; i < iterations; i++) {
    const payload = {
      caller_id: `+1555${String(i).padStart(7, '0')}`,
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: `HEALTH_PERF_${i}`
    };

    const response = await callWebhook(payload);
    latencies.push(response.latency);
  }

  latencies.sort((a, b) => a - b);
  const p50Index = Math.floor(latencies.length * 0.50);
  const p95Index = Math.floor(latencies.length * 0.95);

  const p50 = latencies[p50Index];
  const p95 = latencies[p95Index];
  const mean = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);

  if (p95 > 500) {
    warn(`P95 latency ${p95}ms exceeds 500ms target`);
  }

  return { mean, p50, p95, iterations };
}

async function checkConcurrency() {
  const promises = [];
  const concurrent = 5;

  for (let i = 0; i < concurrent; i++) {
    const payload = {
      caller_id: `+1555${String(i).padStart(7, '0')}`,
      agent_id: SARAH_AGENT_ID,
      called_number: '+18882662193',
      call_sid: `HEALTH_CONCURRENT_${i}`
    };

    promises.push(callWebhook(payload));
  }

  const responses = await Promise.all(promises);
  const successCount = responses.filter(r => r.status === 200).length;

  if (successCount !== concurrent) {
    throw new Error(`Only ${successCount}/${concurrent} requests succeeded`);
  }

  return { concurrent, allSucceeded: true };
}

async function checkEnrichmentFallback() {
  const payload = {
    caller_id: '+19999999999', // Unknown number
    agent_id: SARAH_AGENT_ID,
    called_number: '+18882662193',
    call_sid: 'HEALTH_CHECK_FALLBACK'
  };

  const response = await callWebhook(payload);
  const vars = response.data.dynamic_variables;

  if (vars.customer_name !== 'there') {
    warn(`Expected customer_name='there' for unknown caller, got '${vars.customer_name}'`);
  }

  if (vars.account_tier !== 'New') {
    warn(`Expected account_tier='New' for unknown caller, got '${vars.account_tier}'`);
  }

  if (vars.lookup_success !== false) {
    throw new Error('lookup_success should be false for unknown caller');
  }

  if (vars.data_source !== 'none') {
    warn(`Expected data_source='none' for unknown caller, got '${vars.data_source}'`);
  }

  return { fallbackWorking: true };
}

/**
 * Main execution
 */
async function main() {
  console.log('================================================================================');
  console.log('CLIENT INITIATION DATA WEBHOOK - HEALTH CHECK');
  console.log('================================================================================');
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Test Phone: ${testPhone}`);
  console.log(`Agent ID: ${SARAH_AGENT_ID}`);

  // Core checks
  await test('Connectivity', checkConnectivity);
  await test('Response Format', checkResponseFormat);
  await test('Data Quality', checkDataQuality);
  await test('Invalid Agent Rejection', checkInvalidAgent);
  await test('Enrichment Fallback', checkEnrichmentFallback);

  // Performance checks (skip if --quick)
  if (!quick) {
    await test('Performance (10 requests)', checkPerformance);
    await test('Concurrency (5 parallel)', checkConcurrency);
  } else {
    console.log('\n⏭️  Skipping performance tests (--quick mode)');
  }

  // Summary
  console.log('\n================================================================================');
  console.log('HEALTH CHECK SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);

  if (results.failed === 0) {
    console.log('\n✅ Webhook is healthy!');
  } else {
    console.log('\n❌ Webhook has issues that need attention');
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  if (results.warnings > 0) {
    console.log('\n⚠️  There are warnings to review (see above)');
  }

  console.log('\n================================================================================\n');

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('\n❌ Health check failed with error:', error);
  process.exit(1);
});
