#!/usr/bin/env node
/**
 * ULTRATHINK Production Runner
 *
 * Connects the ULTRATHINK combinatorial test framework to the REAL
 * n8n webhook endpoints for production testing with auto-healing.
 *
 * Features:
 * - 1000+ tests per field with exponential combinations
 * - Real HTTP calls to production webhook
 * - Auto-healing diagnosis and fix generation
 * - Progressive improvement tracking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Import framework components
const { CombinatorialTestGenerator, FIELDS } = require('./combinatorial-test-generator');
const { ExponentialCombinationGenerator, FIELD_DOMAINS } = require('./exponential-combinations');
const { SelfFixingAssertionRunner, ASSERTION_TYPES, CODE_FIX_GENERATORS } = require('./self-fixing-assertions');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Production webhook endpoints
  N8N_BASE_URL: 'https://n8n.wranngle.com',
  WEBHOOK_PATH: '/webhook/call-completed',
  HEALTH_PATH: '/webhook/call-completed-health',

  // Test parameters
  testsPerField: 100, // Start with 100, scale to 1000
  coverageLevel: 'pairwise',
  concurrency: 2, // Reduced to avoid circuit breaker
  requestTimeout: 30000,

  // Delays to prevent rate limiting and circuit breaker trips
  batchDelay: 500, // ms between batches - increased
  requestDelay: 200, // ms between individual requests - increased

  // Circuit breaker handling
  circuitBreakerWait: 30000, // Wait 30s if circuit breaker trips
  maxCircuitBreakerRetries: 3,

  // Output
  outputDir: './test-results/production',
  patchDir: './patches/production'
};

// ============================================================================
// HTTP EXECUTOR - Real Webhook Calls
// ============================================================================

async function callWebhook(payload, correlationId = null) {
  return new Promise((resolve) => {
    const url = new URL(CONFIG.WEBHOOK_PATH, CONFIG.N8N_BASE_URL);
    const data = JSON.stringify(payload);
    const corrId = correlationId || `ultra-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('N8N_WEBHOOK_SECRET env var is required to call the n8n webhook.');
    }

    const startTime = Date.now();

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'X-Correlation-ID': corrId,
        'X-Webhook-Secret': webhookSecret,
        'User-Agent': 'ULTRATHINK-Test-Runner/1.0'
      },
      timeout: CONFIG.requestTimeout
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            status: res.statusCode,
            headers: Object.fromEntries(
              Object.entries(res.headers).map(([k, v]) => [k.toLowerCase(), v])
            ),
            body: JSON.parse(body),
            correlationId: corrId,
            duration
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            correlationId: corrId,
            duration,
            parseError: true
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        correlationId: corrId,
        duration: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout',
        correlationId: corrId,
        duration: Date.now() - startTime
      });
    });

    req.write(data);
    req.end();
  });
}

// ============================================================================
// PAYLOAD GENERATOR - Creates realistic webhook payloads
// ============================================================================

function generatePayload(testCase) {
  const input = testCase.input || {};

  // Determine event type - ALWAYS set a valid type unless explicitly testing null
  let eventType = 'post_call_transcription'; // Safe default
  
  if ('event_type' in input) {
    // Field explicitly set in test case
    if (input.event_type === null || input.event_type === undefined || input.event_type === '') {
      // Testing invalid event types
      eventType = null;
    } else {
      eventType = input.event_type;
    }
  }

  // Base payload structure matching ElevenLabs webhook format
  const payload = {
    event_timestamp: input.event_timestamp || Date.now(),
    data: {
      conversation_id: input.conversation_id || `conv_test_${Date.now()}`,
      agent_id: input.agent_id || 'agent_xxxx_demo',
      conversation_initiation_client_data: {
        dynamic_variables: {
          customer_name: input.customer_name || 'Test Customer',
          pipedrive_person_id: input.pipedrive_person_id || 12345,
          phone: input.phone || '+15551234567'
        }
      },
      analysis: {
        call_successful: input.call_successful || 'success',
        transcript_summary: input.transcript_summary || 'Test call summary'
      },
      metadata: {
        call_duration_secs: input.call_duration_secs || 120,
        start_time_unix_secs: Math.floor(Date.now() / 1000)
      },
      transcript: []
    }
  };

  // Only set type if valid (for testing missing type scenarios)
  if (eventType !== null) {
    payload.type = eventType;
  }

  return payload;
}

// ============================================================================
// TEST CASE EXECUTOR
// ============================================================================

async function executeTestCase(testCase) {
  const payload = generatePayload(testCase);
  const correlationId = testCase.input?.correlation_id || undefined;

  const response = await callWebhook(payload, correlationId);

  // Map response to expected format for assertions
  return {
    status: response.status,
    headers: response.headers,
    body: response.body,
    correlationId: response.correlationId,
    duration: response.duration,
    error: response.error
  };
}

// ============================================================================
// ASSERTION DEFINITIONS
// ============================================================================

const PRODUCTION_ASSERTIONS = {
  // For valid inputs
  valid: [
    {
      type: 'RESPONSE_STATUS',
      expected: 200,
      describe: 'Valid requests should return 200'
    },
    {
      type: 'RESPONSE_STRUCTURE',
      expected: {
        success: { type: 'boolean', required: true }
      },
      describe: 'Response should have success field'
    }
  ],

  // For invalid inputs
  invalid: [
    {
      type: 'RESPONSE_STATUS',
      expected: 400,
      describe: 'Invalid requests should return 400'
    }
  ],

  // For security payloads
  security: [
    {
      type: 'NO_XSS',
      describe: 'XSS payloads should not be reflected'
    },
    {
      type: 'NO_SQL_ERROR',
      describe: 'SQL errors should not be exposed'
    }
  ],

  // Universal assertions
  universal: [
    {
      type: 'CORRELATION_ID_PROPAGATED',
      describe: 'Correlation ID should be echoed'
    }
  ]
};

// ============================================================================
// PRODUCTION TEST RUNNER
// ============================================================================

class ProductionTestRunner {
  constructor(options = {}) {
    this.config = { ...CONFIG, ...options };

    this.combiGenerator = new CombinatorialTestGenerator({
      testsPerField: this.config.testsPerField
    });

    this.expoGenerator = new ExponentialCombinationGenerator();

    this.assertionRunner = new SelfFixingAssertionRunner({
      dryRun: true,
      outputDir: this.config.outputDir,
      patchDir: this.config.patchDir
    });

    this.stats = {
      total: 0,
      executed: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      avgLatency: 0,
      byCategory: {},
      failureReasons: {}
    };
  }

  /**
   * Generate test cases from field definitions
   */
  generateTestCases() {
    console.log(`\n📊 Generating ${this.config.testsPerField} tests per field...`);

    const testCases = [];
    const perFieldTests = {};

    // Generate per-field tests
    for (const [fieldName, fieldConfig] of Object.entries(FIELDS)) {
      perFieldTests[fieldName] = this.combiGenerator.generateFieldTests(fieldName, fieldConfig);
    }

    // Generate pairwise combinations
    const combinations = this.expoGenerator.generatePairwiseCombinations();

    console.log(`   Generated ${combinations.length} pairwise combinations`);

    // Limit for production testing (don't send 15k requests!)
    const maxTests = Math.min(combinations.length, 500);
    const selectedCombos = combinations.slice(0, maxTests);

    for (let i = 0; i < selectedCombos.length; i++) {
      const combo = selectedCombos[i];

      // Determine test category
      const hasInvalid = Object.values(combo).some(v =>
        v === null || v === undefined || v === '' ||
        (typeof v === 'string' && (v.includes('script') || v.includes('SELECT')))
      );

      const hasSecurity = Object.values(combo).some(v =>
        typeof v === 'string' && (
          v.includes('<script') || v.includes('javascript:') ||
          v.includes('DROP TABLE') || v.includes("'1'='1")
        )
      );

      const category = hasSecurity ? 'security' : (hasInvalid ? 'invalid' : 'valid');

      testCases.push({
        id: `prod-${i + 1}`,
        name: `${Object.keys(combo).slice(0, 2).join('+')} [${category}]`,
        input: combo,
        category,
        assertions: [
          ...PRODUCTION_ASSERTIONS[category] || PRODUCTION_ASSERTIONS.valid,
          ...PRODUCTION_ASSERTIONS.universal
        ]
      });
    }

    console.log(`   Selected ${testCases.length} tests for production run`);
    return testCases;
  }

  /**
   * Execute tests against production webhook
   */
  async execute(testCases) {
    console.log(`\n🚀 Executing ${testCases.length} tests against production webhook...`);
    console.log(`   Target: ${this.config.N8N_BASE_URL}${this.config.WEBHOOK_PATH}`);
    console.log(`   Rate limiting: ${this.config.requestDelay}ms between requests\n`);

    this.stats.total = testCases.length;
    this.stats.startTime = Date.now();

    let totalLatency = 0;
    let lastProgressPct = 0;
    let circuitBreakerTrips = 0;

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      try {
        // Execute test
        const result = await executeTestCase(testCase);

        this.stats.executed++;
        totalLatency += result.duration || 0;

        // Check for circuit breaker
        if (result.status === 503 && result.body?.circuit_breaker_open) {
          circuitBreakerTrips++;
          this.stats.byCategory['circuit_breaker'] = this.stats.byCategory['circuit_breaker'] || { passed: 0, failed: 0 };
          this.stats.byCategory['circuit_breaker'].failed++;
          this.recordFailure('circuit_breaker_open', result.body.circuit_breaker_resets_at);

          // Wait for circuit breaker to reset if this is first trip
          if (circuitBreakerTrips === 1) {
            const resetTime = new Date(result.body.circuit_breaker_resets_at);
            const waitMs = Math.max(0, resetTime - Date.now()) + 5000; // Add 5s buffer
            if (waitMs > 0 && waitMs < 60000) {
              console.log(`\n  ⚡ Circuit breaker tripped! Waiting ${(waitMs/1000).toFixed(0)}s for reset...`);
              await sleep(waitMs);
              circuitBreakerTrips = 0; // Reset counter after waiting
              console.log('  ⚡ Resuming tests...\n');
            }
          }
          continue;
        }

        // Categorize result
        const category = testCase.category;
        if (!this.stats.byCategory[category]) {
          this.stats.byCategory[category] = { passed: 0, failed: 0 };
        }

        if (result.error) {
          this.stats.errors++;
          this.stats.byCategory[category].failed++;
          this.recordFailure('network_error', result.error);
        } else if (result.status === 200 && category === 'valid') {
          this.stats.passed++;
          this.stats.byCategory[category].passed++;
        } else if (result.status === 400 && category === 'invalid') {
          this.stats.passed++;
          this.stats.byCategory[category].passed++;
        } else if (result.status === 200 && category === 'security' && !containsReflection(result.body, testCase.input)) {
          this.stats.passed++;
          this.stats.byCategory[category].passed++;
        } else {
          this.stats.failed++;
          this.stats.byCategory[category].failed++;
          this.recordFailure(`status_${result.status}`, JSON.stringify(result.body).slice(0, 100));
        }

        // Progress
        const pct = Math.floor((this.stats.executed / this.stats.total) * 100);
        if (pct >= lastProgressPct + 10) {
          lastProgressPct = pct;
          const elapsed = (Date.now() - this.stats.startTime) / 1000;
          const rate = this.stats.executed / elapsed;
          const avgLat = totalLatency / this.stats.executed;
          console.log(
            `  [${pct}%] ${this.stats.executed}/${this.stats.total} | ` +
            `✅ ${this.stats.passed} | ❌ ${this.stats.failed} | ⚡ ${circuitBreakerTrips} | ` +
            `${rate.toFixed(1)}/s | ${avgLat.toFixed(0)}ms avg`
          );
        }

        // Rate limiting delay
        await sleep(this.config.requestDelay);

      } catch (error) {
        this.stats.errors++;
        this.recordFailure('execution_error', error.message);
      }
    }

    this.stats.endTime = Date.now();
    this.stats.avgLatency = totalLatency / this.stats.executed;
    this.stats.circuitBreakerTrips = circuitBreakerTrips;
  }

  recordFailure(reason, detail) {
    if (!this.stats.failureReasons[reason]) {
      this.stats.failureReasons[reason] = { count: 0, samples: [] };
    }
    this.stats.failureReasons[reason].count++;
    if (this.stats.failureReasons[reason].samples.length < 5) {
      this.stats.failureReasons[reason].samples.push(detail);
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;

    return {
      summary: {
        total: this.stats.total,
        executed: this.stats.executed,
        passed: this.stats.passed,
        failed: this.stats.failed,
        errors: this.stats.errors,
        passRate: ((this.stats.passed / this.stats.executed) * 100).toFixed(2) + '%'
      },
      performance: {
        duration: `${duration.toFixed(2)}s`,
        throughput: `${(this.stats.executed / duration).toFixed(1)} tests/s`,
        avgLatency: `${this.stats.avgLatency.toFixed(0)}ms`
      },
      byCategory: this.stats.byCategory,
      failureAnalysis: this.stats.failureReasons,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export results
   */
  exportResults() {
    const outputDir = path.resolve(this.config.outputDir);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const report = this.generateReport();

    // Export JSON report
    const jsonPath = path.join(outputDir, `production-report-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Export markdown summary
    const mdPath = path.join(outputDir, `production-summary-${timestamp}.md`);
    fs.writeFileSync(mdPath, this.generateMarkdown(report));

    return { jsonPath, mdPath };
  }

  generateMarkdown(report) {
    return `# ULTRATHINK Production Test Results

## Summary
| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.total} |
| Executed | ${report.summary.executed} |
| Passed | ${report.summary.passed} ✅ |
| Failed | ${report.summary.failed} ❌ |
| Errors | ${report.summary.errors} ⚠️ |
| **Pass Rate** | **${report.summary.passRate}** |

## Performance
- **Duration:** ${report.performance.duration}
- **Throughput:** ${report.performance.throughput}
- **Avg Latency:** ${report.performance.avgLatency}

## Results by Category
${Object.entries(report.byCategory).map(([cat, stats]) =>
  `- **${cat}:** ${stats.passed} passed, ${stats.failed} failed`
).join('\n')}

## Failure Analysis
${Object.entries(report.failureAnalysis).map(([reason, data]) =>
  `### ${reason} (${data.count} occurrences)\n${data.samples.map(s => `- \`${s}\``).join('\n')}`
).join('\n\n')}

---
*Generated: ${report.timestamp}*
`;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function containsReflection(body, input) {
  const bodyStr = JSON.stringify(body || {});
  const securityPayloads = [
    '<script', 'javascript:', 'onerror=', 'DROP TABLE', "OR '1'='1"
  ];

  for (const payload of securityPayloads) {
    if (bodyStr.includes(payload)) {
      return true;
    }
  }
  return false;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let testsPerField = 100;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tests') testsPerField = parseInt(args[++i], 10);
    if (args[i] === '--dry-run') dryRun = true;
  }

  console.log('\n' + '='.repeat(70));
  console.log('  🧠 ULTRATHINK PRODUCTION TEST RUNNER');
  console.log('  Testing Real n8n Webhook with Auto-Healing Framework');
  console.log('='.repeat(70));

  const runner = new ProductionTestRunner({ testsPerField });

  // Generate test cases
  const testCases = runner.generateTestCases();

  if (dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No requests will be sent');
    console.log(`   Would execute ${testCases.length} tests`);

    // Export test cases for review
    const reviewPath = path.join(CONFIG.outputDir, 'test-cases-preview.json');
    if (!fs.existsSync(path.dirname(reviewPath))) {
      fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
    }
    fs.writeFileSync(reviewPath, JSON.stringify(testCases.slice(0, 50), null, 2));
    console.log(`   Exported 50 sample test cases to: ${reviewPath}`);
    return;
  }

  // Execute tests
  await runner.execute(testCases);

  // Generate and export report
  const exported = runner.exportResults();
  const report = runner.generateReport();

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('  📊 PRODUCTION TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`
  Total Tests:    ${report.summary.total}
  Executed:       ${report.summary.executed}
  Passed:         ${report.summary.passed} ✅
  Failed:         ${report.summary.failed} ❌
  Errors:         ${report.summary.errors} ⚠️

  Pass Rate:      ${report.summary.passRate}
  Duration:       ${report.performance.duration}
  Avg Latency:    ${report.performance.avgLatency}
  `);

  console.log('  📁 Results exported to:');
  console.log(`     JSON: ${exported.jsonPath}`);
  console.log(`     Summary: ${exported.mdPath}`);
  console.log('');
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ProductionTestRunner,
  callWebhook,
  generatePayload,
  CONFIG
};

if (require.main === module) {
  main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
}
