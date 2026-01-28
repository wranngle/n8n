/**
 * Post-Call Webhook - Testing Framework PoC
 *
 * Demonstrates the testing framework by converting existing Vitest tests
 * into framework test cases and running them via the orchestrator.
 *
 * Run: bun run scripts/poc-post-call-webhook.ts
 */

import {
  createTestCase,
  clearAllDataSync,
  runTests,
  listTestCases,
} from '../lib/testing';

const WEBHOOK_URL = 'https://n8n.wranngle.com/webhook/post-call';
const VALID_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

async function main() {
  console.log('🧪 Post-Call Webhook - Testing Framework PoC\n');
  console.log('═'.repeat(60));

  // Clear any existing test data
  console.log('\n📋 Clearing existing test data...');
  clearAllDataSync();

  // Create test cases using the framework
  console.log('\n📝 Creating test cases...\n');

  // 1. Agent Validation - Valid
  await createTestCase({
    type: 'webhook',
    name: 'Accept valid agent_id',
    description: 'Should accept requests with valid agent_id and return success',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: VALID_AGENT_ID,
        conversation_id: 'poc-valid-001',
        call_status: 'completed',
        call_duration_seconds: 60,
      },
    },
    expected_output: {
      status: 200,
      response_contains: { success: true },
    },
    tags: ['smoke', 'validation', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Accept valid agent_id');

  // 2. Agent Validation - Invalid
  await createTestCase({
    type: 'webhook',
    name: 'Reject invalid agent_id',
    description: 'Should reject requests with invalid agent_id format',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: 'invalid_agent_123',
        conversation_id: 'poc-invalid-001',
        call_status: 'completed',
      },
    },
    expected_output: {
      status: 400,
      response_contains: { error: 'Invalid agent_id' },
    },
    tags: ['validation', 'error-handling', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Reject invalid agent_id');

  // 3. Completed Call - Booking Intent
  await createTestCase({
    type: 'webhook',
    name: 'Process booking intent call',
    description: 'Should detect booking keywords and set high priority follow-up',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: VALID_AGENT_ID,
        conversation_id: 'poc-booking-001',
        call_status: 'completed',
        call_duration_seconds: 180,
        transcript: 'I would like to book a demo for next week',
        customer_sentiment: 'positive',
      },
    },
    expected_output: {
      status: 200,
      response_contains: {
        success: true,
        call_status: 'completed',
        follow_up_type: 'booking',
        follow_up_priority: 'high',
      },
    },
    tags: ['business-logic', 'intent-detection', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Process booking intent call');

  // 4. Failed Call - Retryable
  await createTestCase({
    type: 'webhook',
    name: 'Process retryable failed call',
    description: 'Should mark timeout errors as retryable',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: VALID_AGENT_ID,
        conversation_id: 'poc-retry-001',
        call_status: 'failed',
        call_duration_seconds: 10,
        error_type: 'timeout',
      },
    },
    expected_output: {
      status: 200,
      response_contains: {
        call_status: 'failed',
        should_retry: true,
        follow_up_type: 'error_recovery',
      },
    },
    tags: ['error-handling', 'retry-logic', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Process retryable failed call');

  // 5. Abandoned Call - Early
  await createTestCase({
    type: 'webhook',
    name: 'Process early abandonment',
    description: 'Should classify 5-30s calls as early abandonment with callback',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: VALID_AGENT_ID,
        conversation_id: 'poc-early-001',
        call_status: 'abandoned',
        call_duration_seconds: 15,
        caller_id: '+15551234567',
      },
    },
    expected_output: {
      status: 200,
      response_contains: {
        abandon_reason: 'early_abandonment',
        follow_up_type: 'callback',
      },
    },
    tags: ['business-logic', 'abandonment', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Process early abandonment');

  // 6. Negative Sentiment Escalation
  await createTestCase({
    type: 'webhook',
    name: 'Escalate negative sentiment',
    description: 'Should set urgent priority for negative sentiment calls',
    input: {
      url: WEBHOOK_URL,
      method: 'POST',
      body: {
        agent_id: VALID_AGENT_ID,
        conversation_id: 'poc-negative-001',
        call_status: 'completed',
        call_duration_seconds: 90,
        transcript: 'This is frustrating, I need help',
        customer_sentiment: 'negative',
      },
    },
    expected_output: {
      status: 200,
      response_contains: {
        follow_up_priority: 'urgent',
      },
    },
    tags: ['business-logic', 'sentiment', 'poc'],
    enabled: true,
  });
  console.log('  ✓ Created: Escalate negative sentiment');

  // List created tests
  console.log('\n' + '═'.repeat(60));
  console.log('\n📊 Test Cases in Storage:\n');
  const casesResult = await listTestCases({ tag: 'poc' });
  const cases = casesResult.data || [];
  for (const tc of cases) {
    console.log(`  [${tc.test_id}] ${tc.name}`);
    console.log(`      Type: ${tc.type} | Tags: ${tc.tags.join(', ')}`);
  }

  // Run tests via orchestrator
  console.log('\n' + '═'.repeat(60));
  console.log('\n🚀 Running tests via orchestrator...\n');

  const summary = await runTests({
    tags: ['poc'],
    triggeredBy: 'manual',
    triggerSource: 'poc-script',
  });

  // Display results
  console.log('═'.repeat(60));
  console.log('\n📈 Test Run Summary\n');
  console.log(`  Execution ID: ${summary.execution_id}`);
  console.log(`  Duration:     ${summary.duration_ms}ms`);
  console.log(`  Total Tests:  ${summary.total_tests}`);
  console.log(`  ✅ Passed:    ${summary.passed}`);
  console.log(`  ❌ Failed:    ${summary.failed}`);
  console.log(`  ⚠️  Errors:    ${summary.errors}`);
  console.log(`  ⏭️  Skipped:   ${summary.skipped}`);
  console.log(`  📊 Pass Rate: ${summary.pass_rate}%`);
  console.log(`  ⏱️  Avg Latency: ${summary.avg_latency_ms}ms`);

  if (summary.slowest_test) {
    console.log(`\n  🐢 Slowest: ${summary.slowest_test.name} (${summary.slowest_test.latency_ms}ms)`);
  }

  if (summary.failures.length > 0) {
    console.log('\n  ❌ Failures:');
    for (const f of summary.failures) {
      console.log(`     - ${f.name}: ${f.error_message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n✨ PoC Complete!\n');

  // Exit with appropriate code
  process.exit(summary.failed > 0 || summary.errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
