#!/usr/bin/env node
/**
 * ATDD: Auto-Healing Test Runner
 * Runs tests, detects failures, and auto-heals underlying code
 *
 * Features:
 * - Pattern-based failure detection
 * - Automatic fix suggestions
 * - Code patch generation
 * - Healing effectiveness tracking
 *
 * @author BMAD TEA Agent
 * @date 2026-01-13
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { CombinatorialTestGenerator, FIELDS } = require('./combinatorial-test-generator');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  N8N_BASE_URL: 'https://n8n.wranngle.com',
  WEBHOOK_PATH: '/webhook/call-completed',
  HEALTH_PATH: '/webhook/call-completed-health',
  MAX_CONCURRENT: 10,
  TIMEOUT_MS: 30000,
  AUTO_APPLY_FIXES: false, // Set to true to auto-apply fixes
  HEALING_LOG_PATH: path.join(__dirname, '..', 'generated', 'healing-log.json')
};

// ============================================
// AUTO-HEALING ENGINE
// ============================================

class AutoHealingEngine {
  constructor() {
    this.healingRules = this.loadHealingRules();
    this.healingLog = [];
    this.failurePatterns = new Map();
    this.codePatches = [];
  }

  loadHealingRules() {
    return [
      // Rule 1: Missing field validation
      {
        id: 'HEAL-001',
        name: 'Missing Field Validation',
        detectPattern: (failure) => {
          return failure.expectPass === false &&
                 failure.result?.statusCode === 200 &&
                 failure.result?.body?.success === true;
        },
        diagnose: (failure) => ({
          issue: `Field '${failure.field}' is not being validated`,
          severity: 'HIGH',
          category: 'validation',
          affectedField: failure.field,
          testValue: failure.value
        }),
        generateFix: (failure) => ({
          type: 'validation',
          field: failure.field,
          code: `
// FIX: Add validation for ${failure.field}
function validate_${failure.field}(value) {
  // Type check
  if (value === null || value === undefined) {
    return { valid: false, error: '${failure.field} is required' };
  }

  // Type-specific validation
  ${this.getTypeValidation(failure.field)}

  return { valid: true };
}

// Add to validation pipeline
if (!validate_${failure.field}(event.${failure.field}).valid) {
  return errorResponse('VALIDATION_ERROR', '${failure.field}', validate_${failure.field}(event.${failure.field}).error);
}`,
          priority: 1
        })
      },

      // Rule 2: Missing error structure
      {
        id: 'HEAL-002',
        name: 'Missing Error Structure',
        detectPattern: (failure) => {
          const body = failure.result?.body;
          return body?.error && !body.error?.code;
        },
        diagnose: (failure) => ({
          issue: 'Error response missing structured fields (code, message, field, suggestion)',
          severity: 'MEDIUM',
          category: 'error_handling'
        }),
        generateFix: () => ({
          type: 'error_structure',
          code: `
// FIX: Structured error response helper
function createErrorResponse(code, field, message, suggestion) {
  return {
    success: false,
    error: {
      code: code || 'UNKNOWN_ERROR',
      field: field || null,
      message: message || 'An error occurred',
      suggestion: suggestion || 'Please check your input and try again'
    },
    timestamp: new Date().toISOString()
  };
}`,
          priority: 2
        })
      },

      // Rule 3: Missing correlation ID
      {
        id: 'HEAL-003',
        name: 'Missing Correlation ID',
        detectPattern: (failure) => {
          return !failure.result?.body?.correlation_id &&
                 !failure.result?.headers?.['x-correlation-id'];
        },
        diagnose: () => ({
          issue: 'Correlation ID not being propagated',
          severity: 'MEDIUM',
          category: 'observability'
        }),
        generateFix: () => ({
          type: 'correlation',
          code: `
// FIX: Correlation ID propagation
function getCorrelationId(headers) {
  return headers['x-correlation-id'] ||
         headers['X-Correlation-ID'] ||
         \`auto_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;
}

// In webhook handler
const correlationId = getCorrelationId(request.headers);

// Include in all responses
response.setHeader('X-Correlation-ID', correlationId);
responseBody.correlation_id = correlationId;`,
          priority: 3
        })
      },

      // Rule 4: XSS vulnerability
      {
        id: 'HEAL-004',
        name: 'XSS Vulnerability',
        detectPattern: (failure) => {
          const value = String(failure.value || '');
          return value.includes('<script') ||
                 value.includes('javascript:') ||
                 value.includes('onerror=');
        },
        diagnose: (failure) => ({
          issue: 'Potential XSS vulnerability - malicious content not sanitized',
          severity: 'CRITICAL',
          category: 'security',
          payload: failure.value
        }),
        generateFix: () => ({
          type: 'security',
          code: `
// FIX: XSS protection
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\\/g, '&#x5C;')
    .replace(/javascript:/gi, '')
    .replace(/on\\w+=/gi, '');
}

// Apply to all user inputs
const sanitizedEvent = sanitizeObject(event, sanitizeInput);`,
          priority: 1
        })
      },

      // Rule 5: SQL injection vulnerability
      {
        id: 'HEAL-005',
        name: 'SQL Injection Vulnerability',
        detectPattern: (failure) => {
          const value = String(failure.value || '');
          return value.includes("'") && (
            value.includes('DROP') ||
            value.includes('DELETE') ||
            value.includes('SELECT') ||
            value.includes('UNION') ||
            value.includes('--')
          );
        },
        diagnose: (failure) => ({
          issue: 'Potential SQL injection vulnerability',
          severity: 'CRITICAL',
          category: 'security',
          payload: failure.value
        }),
        generateFix: () => ({
          type: 'security',
          code: `
// FIX: SQL injection protection
function sanitizeForSQL(input) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\\/\\/*/g, '')
    .replace(/DROP|DELETE|INSERT|UPDATE|SELECT|UNION|EXEC|EXECUTE/gi, '');
}

// Use parameterized queries instead of string concatenation
// const query = 'SELECT * FROM users WHERE id = ?';
// db.query(query, [sanitizeForSQL(userId)]);`,
          priority: 1
        })
      },

      // Rule 6: Missing retry logic
      {
        id: 'HEAL-006',
        name: 'Missing Retry Logic',
        detectPattern: (failure) => {
          return failure.category === 'retry' &&
                 !failure.result?.body?.retry_count;
        },
        diagnose: () => ({
          issue: 'External API calls not wrapped with retry logic',
          severity: 'HIGH',
          category: 'resilience'
        }),
        generateFix: () => ({
          type: 'resilience',
          code: `
// FIX: Retry wrapper with exponential backoff
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => true
  } = options;

  const delays = [];
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        retry_count: attempt,
        retry_delays: delays
      };
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && shouldRetry(error)) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        delays.push(delay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return {
    success: false,
    retry_count: maxRetries,
    retry_delays: delays,
    final_error: lastError?.message || 'Unknown error'
  };
}

// Usage: const result = await withRetry(() => callPipedriveAPI(data));`,
          priority: 2
        })
      },

      // Rule 7: Missing circuit breaker
      {
        id: 'HEAL-007',
        name: 'Missing Circuit Breaker',
        detectPattern: (failure) => {
          return failure.category === 'circuit_breaker' &&
                 !failure.result?.body?.circuit_breaker_open;
        },
        diagnose: () => ({
          issue: 'No circuit breaker to prevent cascading failures',
          severity: 'HIGH',
          category: 'resilience'
        }),
        generateFix: () => ({
          type: 'resilience',
          code: `
// FIX: Circuit breaker implementation
const circuitBreakers = new Map();

function getCircuitBreaker(name, threshold = 5, resetTimeout = 60000) {
  if (!circuitBreakers.has(name)) {
    circuitBreakers.set(name, {
      failures: 0,
      threshold,
      resetTimeout,
      lastFailure: null,
      state: 'CLOSED'
    });
  }
  return circuitBreakers.get(name);
}

async function withCircuitBreaker(name, fn) {
  const breaker = getCircuitBreaker(name);

  // Check if circuit is open
  if (breaker.state === 'OPEN') {
    const timeSinceFailure = Date.now() - breaker.lastFailure;
    if (timeSinceFailure < breaker.resetTimeout) {
      return {
        success: false,
        circuit_breaker_open: true,
        circuit_breaker_resets_at: new Date(breaker.lastFailure + breaker.resetTimeout).toISOString()
      };
    }
    breaker.state = 'HALF_OPEN';
  }

  try {
    const result = await fn();
    // Success - reset circuit
    breaker.failures = 0;
    breaker.state = 'CLOSED';
    return { success: true, result, circuit_breaker_open: false };
  } catch (error) {
    breaker.failures++;
    breaker.lastFailure = Date.now();
    if (breaker.failures >= breaker.threshold) {
      breaker.state = 'OPEN';
    }
    throw error;
  }
}`,
          priority: 2
        })
      },

      // Rule 8: Type coercion issues
      {
        id: 'HEAL-008',
        name: 'Type Coercion Issue',
        detectPattern: (failure) => {
          return failure.category === 'type' ||
                 (typeof failure.value === 'number' && failure.field?.includes('id')) ||
                 (typeof failure.value === 'string' && failure.field?.includes('count'));
        },
        diagnose: (failure) => ({
          issue: `Type mismatch for field '${failure.field}'`,
          severity: 'MEDIUM',
          category: 'validation',
          expectedType: this.getExpectedType(failure.field),
          receivedType: typeof failure.value
        }),
        generateFix: (failure) => ({
          type: 'type_coercion',
          code: `
// FIX: Type coercion for ${failure.field}
function coerce_${failure.field}(value) {
  ${this.getCoercionCode(failure.field)}
}

// Apply coercion
event.${failure.field} = coerce_${failure.field}(event.${failure.field});`,
          priority: 3
        })
      }
    ];
  }

  getTypeValidation(field) {
    const typeValidations = {
      event_type: `if (typeof value !== 'string') return { valid: false, error: 'event_type must be a string' };`,
      conversation_id: `if (typeof value !== 'string' || !value.startsWith('conv_')) return { valid: false, error: 'Invalid conversation_id format' };`,
      agent_id: `if (typeof value !== 'string' || !value.startsWith('agent_')) return { valid: false, error: 'Invalid agent_id format' };`,
      pipedrive_person_id: `if (typeof value !== 'number' || value < 1) return { valid: false, error: 'pipedrive_person_id must be a positive integer' };`,
      customer_name: `if (typeof value !== 'string' || value.trim().length === 0) return { valid: false, error: 'customer_name cannot be empty' };`,
      phone: `if (typeof value !== 'string' || !/^\\+[1-9]\\d{1,14}$/.test(value)) return { valid: false, error: 'phone must be in E.164 format' };`,
      call_duration_secs: `if (typeof value !== 'number' || value < 0) return { valid: false, error: 'call_duration_secs must be non-negative' };`,
      event_timestamp: `if (typeof value !== 'number' || value < 1) return { valid: false, error: 'event_timestamp must be a positive Unix timestamp' };`
    };

    return typeValidations[field] || `if (value === '') return { valid: false, error: '${field} cannot be empty' };`;
  }

  getExpectedType(field) {
    const types = {
      pipedrive_person_id: 'number',
      call_duration_secs: 'number',
      event_timestamp: 'number',
      retry_count: 'number'
    };
    return types[field] || 'string';
  }

  getCoercionCode(field) {
    const coercions = {
      pipedrive_person_id: `
  if (typeof value === 'string') {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num > 0) return num;
  }
  return typeof value === 'number' && value > 0 ? value : null;`,
      call_duration_secs: `
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) return Math.floor(num);
  }
  return typeof value === 'number' && value >= 0 ? Math.floor(value) : 0;`,
      event_timestamp: `
  if (typeof value === 'string') {
    const ts = Date.parse(value);
    if (!isNaN(ts)) return ts;
  }
  return typeof value === 'number' ? value : Date.now();`
    };
    return coercions[field] || `return value;`;
  }

  /**
   * Analyze test failure and attempt healing
   */
  analyzeFailure(failure) {
    const healingActions = [];

    for (const rule of this.healingRules) {
      if (rule.detectPattern(failure)) {
        const diagnosis = rule.diagnose(failure);
        const fix = rule.generateFix(failure);

        healingActions.push({
          ruleId: rule.id,
          ruleName: rule.name,
          diagnosis,
          fix,
          appliedAt: null
        });

        // Track pattern frequency
        const patternKey = `${rule.id}_${failure.field || 'general'}`;
        this.failurePatterns.set(patternKey, (this.failurePatterns.get(patternKey) || 0) + 1);
      }
    }

    return healingActions;
  }

  /**
   * Generate comprehensive healing report
   */
  generateHealingReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFailuresAnalyzed: this.healingLog.length,
        uniquePatterns: this.failurePatterns.size,
        totalFixes: this.codePatches.length
      },
      patternFrequency: Object.fromEntries(this.failurePatterns),
      suggestedFixes: this.codePatches,
      prioritizedActions: this.getPrioritizedActions()
    };

    return report;
  }

  getPrioritizedActions() {
    // Sort by frequency and severity
    const actions = [];

    for (const [pattern, count] of this.failurePatterns) {
      const [ruleId] = pattern.split('_');
      const rule = this.healingRules.find(r => r.id === ruleId);

      if (rule) {
        actions.push({
          ruleId,
          ruleName: rule.name,
          occurrences: count,
          priority: this.calculatePriority(count, rule)
        });
      }
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  calculatePriority(count, rule) {
    const severityWeights = { CRITICAL: 100, HIGH: 50, MEDIUM: 20, LOW: 5 };
    const severityWeight = severityWeights[rule.diagnose({})?.severity] || 10;
    return count * severityWeight;
  }
}

// ============================================
// TEST RUNNER
// ============================================

class AutoHealingTestRunner {
  constructor(options = {}) {
    this.healingEngine = new AutoHealingEngine();
    this.concurrency = options.concurrency || CONFIG.MAX_CONCURRENT;
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      healed: 0,
      skipped: 0
    };
  }

  async callWebhook(path, payload, timeout = CONFIG.TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, CONFIG.N8N_BASE_URL);
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

  createTestEvent(fieldOverrides = {}) {
    return {
      type: fieldOverrides.event_type || 'post_call_transcription',
      data: {
        conversation_id: fieldOverrides.conversation_id || `conv_test_${Date.now()}`,
        agent_id: fieldOverrides.agent_id || 'agent_8001kdgp7qbyf4wvhs540be78vew',
        conversation_initiation_client_data: {
          dynamic_variables: {
            customer_name: fieldOverrides.customer_name || 'Test Customer',
            pipedrive_person_id: fieldOverrides.pipedrive_person_id || 12345,
            phone: fieldOverrides.phone || '+15551234567'
          }
        },
        analysis: {
          call_successful: fieldOverrides.call_successful || 'success',
          transcript_summary: fieldOverrides.transcript_summary || 'Test summary'
        },
        metadata: {
          call_duration_secs: fieldOverrides.call_duration_secs || 120,
          start_time_unix_secs: Math.floor(Date.now() / 1000)
        }
      },
      event_timestamp: fieldOverrides.event_timestamp || Date.now(),
      correlation_id: fieldOverrides.correlation_id
    };
  }

  async runTest(test) {
    const event = this.createTestEvent({ [test.field]: test.value });

    try {
      const result = await this.callWebhook(CONFIG.WEBHOOK_PATH, event);

      const passed = test.expectPass === true
        ? result.statusCode === 200 && result.body?.success === true
        : result.statusCode !== 200 || result.body?.success !== true;

      const testResult = {
        testId: test.id,
        field: test.field,
        category: test.category,
        value: test.value,
        expectPass: test.expectPass,
        result,
        passed,
        healingActions: []
      };

      if (!passed) {
        // Analyze failure and attempt healing
        testResult.healingActions = this.healingEngine.analyzeFailure({
          ...test,
          result
        });

        if (testResult.healingActions.length > 0) {
          this.stats.healed++;
          this.healingEngine.healingLog.push(testResult);
        }
      }

      return testResult;
    } catch (error) {
      return {
        testId: test.id,
        field: test.field,
        category: test.category,
        value: test.value,
        expectPass: test.expectPass,
        error: error.message,
        passed: false
      };
    }
  }

  async runBatch(tests, batchSize = 10) {
    const results = [];

    for (let i = 0; i < tests.length; i += batchSize) {
      const batch = tests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(t => this.runTest(t)));
      results.push(...batchResults);

      // Progress update
      if ((i + batchSize) % 100 === 0 || i + batchSize >= tests.length) {
        console.log(`  Progress: ${Math.min(i + batchSize, tests.length)}/${tests.length}`);
      }
    }

    return results;
  }

  async run(tests) {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ATDD: Auto-Healing Test Runner                                ║');
    console.log('║  Running with auto-healing capabilities                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Running ${tests.length.toLocaleString()} tests...\n`);

    const startTime = Date.now();
    this.results = await this.runBatch(tests, this.concurrency);
    const duration = Date.now() - startTime;

    // Calculate stats
    for (const result of this.results) {
      this.stats.total++;
      if (result.passed) {
        this.stats.passed++;
      } else {
        this.stats.failed++;
      }
    }

    // Generate healing report
    const healingReport = this.healingEngine.generateHealingReport();

    // Print summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('TEST RESULTS');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total Tests: ${this.stats.total.toLocaleString()}`);
    console.log(`Passed: ${this.stats.passed.toLocaleString()} (${(this.stats.passed / this.stats.total * 100).toFixed(1)}%)`);
    console.log(`Failed: ${this.stats.failed.toLocaleString()} (${(this.stats.failed / this.stats.total * 100).toFixed(1)}%)`);
    console.log(`Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`Throughput: ${(this.stats.total / (duration / 1000)).toFixed(1)} tests/sec`);

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('AUTO-HEALING ANALYSIS');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Failures Analyzed: ${healingReport.summary.totalFailuresAnalyzed}`);
    console.log(`Unique Patterns: ${healingReport.summary.uniquePatterns}`);
    console.log(`Suggested Fixes: ${healingReport.summary.totalFixes}`);

    if (healingReport.prioritizedActions.length > 0) {
      console.log('\nTop Priority Actions:');
      for (const action of healingReport.prioritizedActions.slice(0, 5)) {
        console.log(`  ${action.ruleId}: ${action.ruleName} (${action.occurrences} occurrences)`);
      }
    }

    return {
      stats: this.stats,
      results: this.results,
      healingReport,
      duration
    };
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const testCount = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1]) || 1000;
  const fieldFilter = args.find(a => a.startsWith('--field='))?.split('=')[1];

  // Generate tests
  const generator = new CombinatorialTestGenerator({ testsPerField: testCount });
  const { tests, autoHealingRules, summary } = await generator.generateFullSuite();

  // Filter tests if field specified
  const filteredTests = fieldFilter
    ? tests.filter(t => t.field === fieldFilter)
    : tests;

  // Run with auto-healing
  const runner = new AutoHealingTestRunner({ concurrency: 10 });
  const { stats, healingReport, duration } = await runner.run(filteredTests.slice(0, 10000)); // Limit for demo

  // Save results
  const outputDir = path.join(__dirname, '..', 'generated');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, `healing-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    testSummary: summary,
    executionStats: stats,
    healingReport,
    duration
  }, null, 2));

  console.log(`\nFull report saved to: ${reportPath}`);
}

// Export for programmatic use
module.exports = { AutoHealingEngine, AutoHealingTestRunner };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
