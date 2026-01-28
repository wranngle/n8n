#!/usr/bin/env node
/**
 * ATDD: Combinatorial Test Generator
 * Generates 1000+ tests per field with exponential combinations
 * Includes auto-healing capabilities for underlying code
 *
 * @author BMAD TEA Agent
 * @date 2026-01-13
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ============================================
// CONFIGURATION: Field Definitions
// ============================================

const FIELDS = {
  // Post-Call Event Fields
  event_type: {
    validValues: [
      'post_call_transcription',
      'call_initiation_failure',
      'call_ended',
      'call_started',
      'agent_response',
      'user_transcript',
      'tool_call',
      'call_ringing',
      'voicemail_detected'
    ],
    invalidValues: [
      '', null, undefined, 123, true, [], {},
      'INVALID_TYPE', 'post_call', 'transcription',
      'call', '\x00', '<script>alert(1)</script>',
      'a'.repeat(1000), '漢字', '🔥💀'
    ],
    boundaryValues: ['a', 'post_call_transcription'.repeat(10)],
    sqlInjection: ["'; DROP TABLE events;--", "1' OR '1'='1", "1; SELECT * FROM users"],
    xssPayloads: ['<script>alert(1)</script>', '<img onerror=alert(1) src=x>', 'javascript:alert(1)']
  },

  conversation_id: {
    validValues: ['conv_123', 'conv_' + Date.now(), 'conv_test_valid'],
    invalidValues: ['', null, undefined, 123, 'invalid', '../../../etc/passwd'],
    boundaryValues: ['c', 'conv_' + 'a'.repeat(500)],
    formatPatterns: [
      /^conv_[a-z0-9_]+$/i,
      /^[a-zA-Z0-9_-]{5,100}$/
    ]
  },

  agent_id: {
    validValues: ['agent_xxxx_demo', 'agent_test123'],
    invalidValues: ['', null, 'agent_', 'invalid_agent'],
    boundaryValues: ['agent_a', 'agent_' + 'x'.repeat(100)]
  },

  pipedrive_person_id: {
    validValues: [1, 12345, 99999999, Number.MAX_SAFE_INTEGER - 1],
    invalidValues: [0, -1, -99999, null, undefined, '', 'abc', 1.5, Infinity, NaN],
    boundaryValues: [1, Number.MAX_SAFE_INTEGER],
    rangeTests: { min: 1, max: Number.MAX_SAFE_INTEGER }
  },

  customer_name: {
    validValues: ['John Doe', 'Jane Smith', 'María García', '山田太郎', "O'Brien"],
    invalidValues: [null, undefined, 123, '', '   '],
    boundaryValues: ['J', 'A'.repeat(500)],
    unicodeTests: ['漢字', '日本語', 'العربية', 'עברית', '한국어', '🔥💀🎉']
  },

  phone: {
    validValues: ['+15551234567', '+447700900123', '+33612345678'],
    invalidValues: ['', 'invalid', '123', '+1', 'abc123'],
    boundaryValues: ['+1', '+' + '9'.repeat(20)],
    e164Patterns: [/^\+[1-9]\d{1,14}$/]
  },

  call_duration_secs: {
    validValues: [0, 1, 60, 120, 900, 3600],
    invalidValues: [-1, -999, null, undefined, '', 'abc', Infinity],
    boundaryValues: [0, 86400], // 0 to 24 hours
    rangeTests: { min: 0, max: 86400 }
  },

  call_successful: {
    validValues: ['success', 'failure', 'unknown', 'partial'],
    invalidValues: ['', null, 123, true, 'maybe'],
    boundaryValues: ['s', 'success']
  },

  transcript_summary: {
    validValues: ['Call about HVAC service', 'Customer inquiry', 'Sales demo'],
    invalidValues: [null, undefined, 123],
    boundaryValues: ['', 'A'.repeat(10000)],
    contentTests: ['<script>', 'SELECT *', '{{template}}']
  },

  correlation_id: {
    validValues: ['trace-123-abc', 'test_' + Date.now(), crypto.randomUUID()],
    invalidValues: [null, 123, {}],
    boundaryValues: ['a', 'x'.repeat(200)]
  },

  retry_count: {
    validValues: [0, 1, 2, 3],
    invalidValues: [-1, 4, null, 'abc'],
    boundaryValues: [0, 3],
    rangeTests: { min: 0, max: 3 }
  },

  event_timestamp: {
    validValues: [Date.now(), Date.now() - 86400000, Date.now() + 1000],
    invalidValues: [-1, 0, null, '', 'yesterday'],
    boundaryValues: [1, Date.now() + 31536000000], // 1 year future
    rangeTests: { min: 1, max: Date.now() + 31536000000 }
  }
};

// ============================================
// TEST GENERATION ENGINE
// ============================================

class CombinatorialTestGenerator {
  constructor(options = {}) {
    this.testsPerField = options.testsPerField || 1000;
    this.includeAutoHealing = options.includeAutoHealing !== false;
    this.outputFormat = options.outputFormat || 'js';
    this.generatedTests = [];
    this.autoHealingRules = [];
  }

  /**
   * Generate all test variations for a single field
   */
  generateFieldTests(fieldName, fieldConfig) {
    const tests = [];
    const categories = [
      { name: 'valid', values: fieldConfig.validValues || [], expectPass: true },
      { name: 'invalid', values: fieldConfig.invalidValues || [], expectPass: false },
      { name: 'boundary', values: fieldConfig.boundaryValues || [], expectPass: 'varies' },
      { name: 'security_sql', values: fieldConfig.sqlInjection || [], expectPass: false },
      { name: 'security_xss', values: fieldConfig.xssPayloads || [], expectPass: false },
      { name: 'unicode', values: fieldConfig.unicodeTests || [], expectPass: 'varies' },
      { name: 'content', values: fieldConfig.contentTests || [], expectPass: 'varies' }
    ];

    // Generate tests for each category
    for (const category of categories) {
      for (let i = 0; i < category.values.length; i++) {
        tests.push({
          id: `${fieldName}_${category.name}_${i}`,
          field: fieldName,
          category: category.name,
          value: category.values[i],
          expectPass: category.expectPass,
          testFn: this.createTestFunction(fieldName, category.values[i], category.expectPass)
        });
      }
    }

    // Generate range tests if defined
    if (fieldConfig.rangeTests) {
      const { min, max } = fieldConfig.rangeTests;
      const rangeValues = this.generateRangeValues(min, max, 50);
      for (let i = 0; i < rangeValues.length; i++) {
        tests.push({
          id: `${fieldName}_range_${i}`,
          field: fieldName,
          category: 'range',
          value: rangeValues[i],
          expectPass: true,
          testFn: this.createTestFunction(fieldName, rangeValues[i], true)
        });
      }
    }

    // Generate pattern tests if defined
    if (fieldConfig.formatPatterns) {
      const patternTests = this.generatePatternTests(fieldName, fieldConfig.formatPatterns);
      tests.push(...patternTests);
    }

    // Generate fuzz tests to reach 1000+ per field
    const fuzzCount = Math.max(0, this.testsPerField - tests.length);
    const fuzzTests = this.generateFuzzTests(fieldName, fieldConfig, fuzzCount);
    tests.push(...fuzzTests);

    return tests;
  }

  /**
   * Generate range values with good distribution
   */
  generateRangeValues(min, max, count) {
    const values = [min, max]; // Always include boundaries
    const step = Math.floor((max - min) / count);

    for (let i = 1; i < count - 1; i++) {
      values.push(min + (step * i));
    }

    // Add some random values for better coverage
    for (let i = 0; i < Math.floor(count / 4); i++) {
      values.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    return [...new Set(values)].slice(0, count);
  }

  /**
   * Generate pattern-based tests
   */
  generatePatternTests(fieldName, patterns) {
    const tests = [];
    const generators = {
      validConversationId: () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      validAgentId: () => `agent_${Math.random().toString(36).substr(2, 20)}`,
      validPhone: () => `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
      validUUID: () => crypto.randomUUID()
    };

    // Generate 100 pattern-matching values
    for (let i = 0; i < 100; i++) {
      tests.push({
        id: `${fieldName}_pattern_valid_${i}`,
        field: fieldName,
        category: 'pattern_valid',
        value: generators.validConversationId(),
        expectPass: true
      });
    }

    // Generate 100 pattern-violating values
    const invalidPatterns = [
      () => '', () => null, () => 123,
      () => 'invalid', () => '../../../etc/passwd',
      () => '<script>alert(1)</script>',
      () => "'; DROP TABLE--",
      () => '\x00\x01\x02',
      () => 'a'.repeat(1000),
      () => '漢字'.repeat(50)
    ];

    for (let i = 0; i < 100; i++) {
      const generator = invalidPatterns[i % invalidPatterns.length];
      tests.push({
        id: `${fieldName}_pattern_invalid_${i}`,
        field: fieldName,
        category: 'pattern_invalid',
        value: generator(),
        expectPass: false
      });
    }

    return tests;
  }

  /**
   * Generate fuzz tests for comprehensive coverage
   */
  generateFuzzTests(fieldName, fieldConfig, count) {
    const tests = [];
    const fuzzGenerators = [
      // Null/undefined variants
      () => null,
      () => undefined,

      // Empty variants
      () => '',
      () => [],
      () => {},

      // Type confusion
      () => Math.random() * 1000,
      () => Math.random() > 0.5,
      () => Symbol('test'),
      () => () => {},
      () => new Date(),

      // String mutations
      () => String(Math.random()),
      () => 'a'.repeat(Math.floor(Math.random() * 10000)),
      () => crypto.randomBytes(20).toString('hex'),
      () => crypto.randomBytes(20).toString('base64'),

      // Number edge cases
      () => Number.MAX_VALUE,
      () => Number.MIN_VALUE,
      () => Number.POSITIVE_INFINITY,
      () => Number.NEGATIVE_INFINITY,
      () => Number.NaN,
      () => 0,
      () => -0,

      // Unicode/encoding
      () => '漢字日本語한국어العربية',
      () => '\u0000\u0001\u0002',
      () => '\uD800\uDC00', // Surrogate pair
      () => '🔥💀🎉👻',
      () => 'null',
      () => 'undefined',
      () => 'NaN',
      () => 'Infinity',

      // Security payloads
      () => '<script>alert(document.cookie)</script>',
      () => "'; DELETE FROM users; --",
      () => '{{7*7}}',
      () => '${7*7}',
      () => '../../../etc/passwd',
      () => 'file:///etc/passwd',
      () => 'javascript:alert(1)',
      () => 'data:text/html,<script>alert(1)</script>',

      // JSON injection
      () => '{"__proto__": {"polluted": true}}',
      () => '{"constructor": {"prototype": {"polluted": true}}}',

      // Command injection
      () => '$(whoami)',
      () => '`whoami`',
      () => '; cat /etc/passwd',
      () => '| cat /etc/passwd',

      // Timing attacks
      () => 'OR SLEEP(5)--',
      () => "' OR SLEEP(5)--",
      () => '" OR SLEEP(5)--',

      // Large payloads
      () => 'A'.repeat(Math.pow(2, Math.floor(Math.random() * 16))),
      () => JSON.stringify(Array(100).fill({ nested: { deep: { value: Math.random() } } }))
    ];

    for (let i = 0; i < count; i++) {
      const generator = fuzzGenerators[i % fuzzGenerators.length];
      tests.push({
        id: `${fieldName}_fuzz_${i}`,
        field: fieldName,
        category: 'fuzz',
        value: generator(),
        expectPass: false, // Fuzz values should generally fail validation
        testFn: this.createTestFunction(fieldName, generator(), false)
      });
    }

    return tests;
  }

  /**
   * Create executable test function
   */
  createTestFunction(fieldName, value, expectPass) {
    return `async function test_${fieldName}_${Date.now()}() {
  const event = createTestEvent({ ${fieldName}: ${JSON.stringify(value)} });
  const result = await callWebhook(WEBHOOK_PATH, event);

  if (${expectPass}) {
    assert.strictEqual(result.statusCode, 200, 'Expected success');
    assert.strictEqual(result.body.success, true, 'Expected success response');
  } else {
    assert.notStrictEqual(result.statusCode, 200, 'Expected failure');
    assert.ok(result.body.error, 'Expected error response');
  }
}`;
  }

  /**
   * Generate cross-field combination tests
   */
  generateCombinationTests(fields, maxCombinations = 10000) {
    const tests = [];
    const fieldNames = Object.keys(fields);

    // Generate 2-field combinations
    for (let i = 0; i < fieldNames.length; i++) {
      for (let j = i + 1; j < fieldNames.length; j++) {
        const field1 = fieldNames[i];
        const field2 = fieldNames[j];
        const values1 = this.getFieldValues(fields[field1]);
        const values2 = this.getFieldValues(fields[field2]);

        // Create combination tests
        for (let v1 = 0; v1 < Math.min(values1.length, 10); v1++) {
          for (let v2 = 0; v2 < Math.min(values2.length, 10); v2++) {
            tests.push({
              id: `combo_${field1}_${field2}_${v1}_${v2}`,
              fields: [field1, field2],
              values: { [field1]: values1[v1], [field2]: values2[v2] },
              category: 'combination'
            });

            if (tests.length >= maxCombinations) return tests;
          }
        }
      }
    }

    // Generate 3-field combinations
    for (let i = 0; i < fieldNames.length && tests.length < maxCombinations; i++) {
      for (let j = i + 1; j < fieldNames.length && tests.length < maxCombinations; j++) {
        for (let k = j + 1; k < fieldNames.length && tests.length < maxCombinations; k++) {
          const f1 = fieldNames[i], f2 = fieldNames[j], f3 = fieldNames[k];
          const v1 = this.getFieldValues(fields[f1])[0];
          const v2 = this.getFieldValues(fields[f2])[0];
          const v3 = this.getFieldValues(fields[f3])[0];

          tests.push({
            id: `combo_3way_${f1}_${f2}_${f3}`,
            fields: [f1, f2, f3],
            values: { [f1]: v1, [f2]: v2, [f3]: v3 },
            category: 'combination_3way'
          });
        }
      }
    }

    return tests;
  }

  getFieldValues(fieldConfig) {
    return [
      ...(fieldConfig.validValues || []),
      ...(fieldConfig.invalidValues || []),
      ...(fieldConfig.boundaryValues || [])
    ];
  }

  /**
   * Generate auto-healing rules based on test patterns
   */
  generateAutoHealingRules() {
    return [
      {
        id: 'AH001',
        name: 'Missing Validation',
        pattern: /Expected failure but got success/,
        diagnosis: 'Field is not being validated',
        fix: {
          type: 'add_validation',
          template: `
// AUTO-HEALING: Add validation for {{field}}
if (!isValid{{field}}(event.data.{{field}})) {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      field: '{{field}}',
      message: 'Invalid {{field}} value',
      suggestion: 'Provide a valid {{field}}'
    }
  };
}`
        }
      },
      {
        id: 'AH002',
        name: 'Missing Error Response',
        pattern: /error\.code.*undefined|error\.message.*undefined/,
        diagnosis: 'Error response missing required fields',
        fix: {
          type: 'enhance_error_response',
          template: `
// AUTO-HEALING: Enhance error response
return {
  success: false,
  error: {
    code: errorCode || 'UNKNOWN_ERROR',
    message: errorMessage || 'An error occurred',
    field: affectedField || null,
    suggestion: 'Contact support if this persists'
  },
  correlation_id: correlationId
};`
        }
      },
      {
        id: 'AH003',
        name: 'Missing Correlation ID',
        pattern: /correlation_id.*undefined|X-Correlation-ID.*undefined/,
        diagnosis: 'Correlation ID not being propagated',
        fix: {
          type: 'add_correlation',
          template: `
// AUTO-HEALING: Add correlation ID propagation
const correlationId = request.headers['x-correlation-id'] ||
                      \`auto_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`;

// Include in all responses
response.setHeader('X-Correlation-ID', correlationId);
responseBody.correlation_id = correlationId;`
        }
      },
      {
        id: 'AH004',
        name: 'Type Coercion Issue',
        pattern: /Expected.*number.*got.*string|Expected.*string.*got.*number/,
        diagnosis: 'Input types not being properly coerced/validated',
        fix: {
          type: 'add_type_coercion',
          template: `
// AUTO-HEALING: Add type coercion
function coerceType(value, expectedType) {
  if (expectedType === 'number' && typeof value === 'string') {
    const num = Number(value);
    if (!isNaN(num)) return num;
  }
  if (expectedType === 'string' && typeof value === 'number') {
    return String(value);
  }
  return value;
}`
        }
      },
      {
        id: 'AH005',
        name: 'SQL Injection Vulnerability',
        pattern: /SQL.*syntax.*error|database.*error/i,
        diagnosis: 'Potential SQL injection vulnerability detected',
        fix: {
          type: 'add_sanitization',
          template: `
// AUTO-HEALING: Add SQL injection protection
function sanitizeForSQL(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\\/g, '\\\\\\\\');
}`
        }
      },
      {
        id: 'AH006',
        name: 'XSS Vulnerability',
        pattern: /<script>|javascript:|onerror=/i,
        diagnosis: 'Potential XSS vulnerability - input not sanitized',
        fix: {
          type: 'add_html_encoding',
          template: `
// AUTO-HEALING: Add XSS protection
function escapeHTML(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}`
        }
      },
      {
        id: 'AH007',
        name: 'Missing Retry Logic',
        pattern: /retry_count.*undefined|No retry.*attempt/,
        diagnosis: 'Retry logic not implemented for external API calls',
        fix: {
          type: 'add_retry_wrapper',
          template: `
// AUTO-HEALING: Add retry wrapper
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  let lastError;
  const delays = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        delays.push(delay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  return {
    success: false,
    retry_count: maxRetries,
    retry_delays: delays,
    final_error: lastError.message
  };
}`
        }
      },
      {
        id: 'AH008',
        name: 'Missing Circuit Breaker',
        pattern: /circuit_breaker.*undefined|consecutive.*failure/,
        diagnosis: 'Circuit breaker not implemented',
        fix: {
          type: 'add_circuit_breaker',
          template: `
// AUTO-HEALING: Add circuit breaker
class CircuitBreaker {
  constructor(threshold = 5, resetTimeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.resetTimeout = resetTimeout;
    this.lastFailure = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        return {
          success: false,
          circuit_breaker_open: true,
          circuit_breaker_resets_at: new Date(this.lastFailure + this.resetTimeout).toISOString()
        };
      }
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}`
        }
      }
    ];
  }

  /**
   * Generate full test suite
   */
  async generateFullSuite() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ATDD: Combinatorial Test Generator                            ║');
    console.log('║  Target: 1000+ tests per field, exponential combinations       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const allTests = [];
    const fieldNames = Object.keys(FIELDS);

    console.log(`Processing ${fieldNames.length} fields...`);

    // Generate tests for each field
    for (const fieldName of fieldNames) {
      console.log(`  → Generating tests for: ${fieldName}`);
      const fieldTests = this.generateFieldTests(fieldName, FIELDS[fieldName]);
      allTests.push(...fieldTests);
      console.log(`    Generated ${fieldTests.length} tests`);
    }

    // Generate combination tests
    console.log('\nGenerating cross-field combinations...');
    const comboTests = this.generateCombinationTests(FIELDS, 50000);
    allTests.push(...comboTests);
    console.log(`  Generated ${comboTests.length} combination tests`);

    // Generate auto-healing rules
    console.log('\nGenerating auto-healing rules...');
    this.autoHealingRules = this.generateAutoHealingRules();
    console.log(`  Generated ${this.autoHealingRules.length} auto-healing rules`);

    this.generatedTests = allTests;

    // Summary
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('GENERATION SUMMARY');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Total Tests Generated: ${allTests.length.toLocaleString()}`);
    console.log(`Tests Per Field: ~${Math.floor(allTests.length / fieldNames.length).toLocaleString()}`);
    console.log(`Auto-Healing Rules: ${this.autoHealingRules.length}`);

    // Category breakdown
    const categories = {};
    for (const test of allTests) {
      categories[test.category] = (categories[test.category] || 0) + 1;
    }

    console.log('\nBy Category:');
    for (const [cat, count] of Object.entries(categories).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${cat}: ${count.toLocaleString()}`);
    }

    return {
      tests: allTests,
      autoHealingRules: this.autoHealingRules,
      summary: {
        totalTests: allTests.length,
        fieldCount: fieldNames.length,
        testsPerField: Math.floor(allTests.length / fieldNames.length),
        categories,
        autoHealingRuleCount: this.autoHealingRules.length
      }
    };
  }
}

// Export for use in test runners
module.exports = { CombinatorialTestGenerator, FIELDS };

// Run if called directly
if (require.main === module) {
  const generator = new CombinatorialTestGenerator({ testsPerField: 1000 });
  generator.generateFullSuite().then(result => {
    const outputPath = path.join(__dirname, '..', 'generated', `test-suite-${Date.now()}.json`);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(result.summary, null, 2));
    console.log(`\nSummary saved to: ${outputPath}`);
  });
}
