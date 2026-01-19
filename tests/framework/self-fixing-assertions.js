/**
 * Self-Fixing Test Assertions - Auto-Healing Code Modification System
 *
 * This module ties combinatorial test generation to auto-healing,
 * enabling automatic code fixes when tests fail. It can:
 * 1. Run test cases and detect failures
 * 2. Diagnose root causes using pattern matching
 * 3. Generate code patches to fix underlying issues
 * 4. Apply patches and verify fixes
 *
 * Part of the ATDD framework for 1000+ tests/field with exponential combinations.
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// ASSERTION PATTERNS - What tests check for
// ============================================================================

const ASSERTION_TYPES = {
  // Response structure assertions
  RESPONSE_STATUS: {
    name: 'Response Status',
    check: (response, expected) => response.status === expected,
    diagnose: (response, expected) => ({
      issue: `Expected status ${expected}, got ${response.status}`,
      category: 'status_mismatch',
      severity: response.status >= 500 ? 'critical' : 'error'
    })
  },

  RESPONSE_STRUCTURE: {
    name: 'Response Structure',
    check: (response, schema) => validateSchema(response.body, schema),
    diagnose: (response, schema) => ({
      issue: `Response doesn't match expected schema`,
      category: 'schema_violation',
      missingFields: findMissingFields(response.body, schema),
      extraFields: findExtraFields(response.body, schema)
    })
  },

  FIELD_TYPE: {
    name: 'Field Type',
    check: (value, expectedType) => typeof value === expectedType,
    diagnose: (value, expectedType) => ({
      issue: `Expected type ${expectedType}, got ${typeof value}`,
      category: 'type_mismatch',
      actualValue: value
    })
  },

  FIELD_RANGE: {
    name: 'Field Range',
    check: (value, { min, max }) => value >= min && value <= max,
    diagnose: (value, { min, max }) => ({
      issue: `Value ${value} out of range [${min}, ${max}]`,
      category: 'range_violation'
    })
  },

  FIELD_PATTERN: {
    name: 'Field Pattern',
    check: (value, pattern) => new RegExp(pattern).test(value),
    diagnose: (value, pattern) => ({
      issue: `Value doesn't match pattern ${pattern}`,
      category: 'pattern_violation',
      actualValue: value
    })
  },

  // Security assertions
  NO_XSS: {
    name: 'No XSS in Response',
    check: (response) => !containsXSS(response),
    diagnose: (response) => ({
      issue: 'XSS payload reflected in response',
      category: 'security_xss',
      severity: 'critical'
    })
  },

  NO_SQL_ERROR: {
    name: 'No SQL Error Exposure',
    check: (response) => !containsSQLError(response),
    diagnose: (response) => ({
      issue: 'SQL error exposed in response',
      category: 'security_sql_exposure',
      severity: 'critical'
    })
  },

  // Business logic assertions
  IDEMPOTENT: {
    name: 'Idempotent Operation',
    check: (response1, response2) => deepEqual(response1, response2),
    diagnose: (response1, response2) => ({
      issue: 'Non-idempotent operation detected',
      category: 'idempotency_violation',
      diff: generateDiff(response1, response2)
    })
  },

  CORRELATION_ID_PROPAGATED: {
    name: 'Correlation ID Propagated',
    // Note: check receives (response, expected) where expected contains the correlationId
    check: (response, expected) => {
      const responseCorrelationId = response.headers?.['x-correlation-id'];
      // If expected is provided, check against it; otherwise just verify presence
      if (expected && expected.correlationId) {
        return responseCorrelationId === expected.correlationId;
      }
      // Just check that correlation ID exists
      return !!responseCorrelationId;
    },
    diagnose: (response, expected) => ({
      issue: 'Correlation ID not propagated',
      category: 'observability_violation',
      expected: expected?.correlationId || 'any',
      actual: response.headers?.['x-correlation-id']
    })
  }
};

// ============================================================================
// CODE FIX GENERATORS - Patches to fix failing tests
// ============================================================================

const CODE_FIX_GENERATORS = {
  // Fix missing validation
  missing_validation: {
    detect: (diagnosis) => diagnosis.category === 'type_mismatch' || diagnosis.category === 'range_violation',
    generate: (diagnosis, context) => {
      const { fieldName, expectedType, min, max } = context;
      return {
        type: 'add_validation',
        location: `handlers/${context.handler}.js`,
        code: generateValidationCode(fieldName, expectedType, min, max),
        description: `Add validation for ${fieldName}`
      };
    }
  },

  // Fix missing error handling
  missing_error_handling: {
    detect: (diagnosis) => diagnosis.category === 'status_mismatch' && diagnosis.severity === 'critical',
    generate: (diagnosis, context) => ({
      type: 'add_error_handler',
      location: `handlers/${context.handler}.js`,
      code: `
// Auto-generated error handler
try {
  ${context.originalCode}
} catch (error) {
  logger.error('Operation failed', { error, correlationId: req.correlationId });
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}`,
      description: 'Add try-catch error handling'
    })
  },

  // Fix XSS vulnerability
  xss_vulnerability: {
    detect: (diagnosis) => diagnosis.category === 'security_xss',
    generate: (diagnosis, context) => ({
      type: 'add_sanitization',
      location: context.location,
      code: `
// Auto-generated XSS sanitization
const sanitizeHtml = require('sanitize-html');
const sanitizedInput = sanitizeHtml(${context.inputField}, {
  allowedTags: [],
  allowedAttributes: {}
});`,
      dependencies: ['sanitize-html'],
      description: 'Add XSS sanitization'
    })
  },

  // Fix SQL injection vulnerability
  sql_injection: {
    detect: (diagnosis) => diagnosis.category === 'security_sql_exposure',
    generate: (diagnosis, context) => ({
      type: 'parameterize_query',
      location: context.location,
      before: context.vulnerableCode,
      after: `
// Auto-generated parameterized query
const result = await db.query(
  'SELECT * FROM ${context.table} WHERE ${context.column} = $1',
  [${context.inputField}]
);`,
      description: 'Parameterize SQL query'
    })
  },

  // Fix missing correlation ID
  missing_correlation_id: {
    detect: (diagnosis) => diagnosis.category === 'observability_violation',
    generate: (diagnosis, context) => ({
      type: 'add_correlation_id',
      location: context.location,
      code: `
// Auto-generated correlation ID propagation
res.setHeader('x-correlation-id', req.correlationId || req.headers['x-correlation-id'] || crypto.randomUUID());`,
      description: 'Add correlation ID propagation'
    })
  },

  // Fix idempotency issue
  idempotency_fix: {
    detect: (diagnosis) => diagnosis.category === 'idempotency_violation',
    generate: (diagnosis, context) => ({
      type: 'add_idempotency_key',
      location: context.location,
      code: `
// Auto-generated idempotency handling
const idempotencyKey = req.headers['idempotency-key'];
if (idempotencyKey) {
  const cached = await redis.get(\`idempotency:\${idempotencyKey}\`);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
}
// ... execute operation ...
if (idempotencyKey) {
  await redis.setex(\`idempotency:\${idempotencyKey}\`, 86400, JSON.stringify(result));
}`,
      dependencies: ['redis'],
      description: 'Add idempotency key handling'
    })
  },

  // Fix missing schema validation
  schema_validation: {
    detect: (diagnosis) => diagnosis.category === 'schema_violation',
    generate: (diagnosis, context) => {
      const zodSchema = generateZodSchema(context.expectedSchema);
      return {
        type: 'add_schema_validation',
        location: context.location,
        code: `
// Auto-generated Zod schema validation
const { z } = require('zod');

const ${context.schemaName}Schema = ${zodSchema};

const validated = ${context.schemaName}Schema.safeParse(${context.inputVariable});
if (!validated.success) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION_ERROR', details: validated.error.issues }
  });
}`,
        dependencies: ['zod'],
        description: 'Add Zod schema validation'
      };
    }
  },

  // Fix retry logic
  missing_retry: {
    detect: (diagnosis) => diagnosis.category === 'transient_failure',
    generate: (diagnosis, context) => ({
      type: 'add_retry_logic',
      location: context.location,
      code: `
// Auto-generated retry logic with exponential backoff
async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random());
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage:
const result = await withRetry(() => ${context.originalCall});`,
      description: 'Add retry logic with exponential backoff'
    })
  },

  // Fix circuit breaker
  missing_circuit_breaker: {
    detect: (diagnosis) => diagnosis.category === 'cascade_failure',
    generate: (diagnosis, context) => ({
      type: 'add_circuit_breaker',
      location: context.location,
      code: `
// Auto-generated circuit breaker
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.failures = 0;
    this.state = 'CLOSED';
    this.lastFailure = null;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

const breaker = new CircuitBreaker();
const result = await breaker.execute(() => ${context.originalCall});`,
      description: 'Add circuit breaker pattern'
    })
  }
};

// ============================================================================
// SELF-FIXING ASSERTION RUNNER
// ============================================================================

class SelfFixingAssertionRunner {
  constructor(options = {}) {
    this.options = {
      autoApply: options.autoApply || false,       // Auto-apply fixes
      maxFixAttempts: options.maxFixAttempts || 3,  // Max fix attempts per test
      dryRun: options.dryRun !== false,             // Generate but don't apply
      outputDir: options.outputDir || './test-results',
      patchDir: options.patchDir || './patches',
      ...options
    };

    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      fixed: 0,
      unfixable: 0,
      fixes: [],
      failures: []
    };
  }

  /**
   * Run assertions with self-fixing capability
   */
  async runWithFixing(testCase, executor) {
    this.results.totalTests++;

    let attempts = 0;
    let lastDiagnosis = null;

    while (attempts < this.options.maxFixAttempts) {
      attempts++;

      try {
        // Execute the test
        const result = await executor(testCase);

        // Run all assertions
        const assertionResults = this.runAssertions(testCase, result);

        if (assertionResults.allPassed) {
          this.results.passed++;
          if (attempts > 1) {
            this.results.fixed++;
            console.log(`  ✅ FIXED after ${attempts - 1} attempt(s)`);
          }
          return { success: true, attempts, result };
        }

        // Diagnose failures
        lastDiagnosis = this.diagnoseFailures(assertionResults.failures, testCase);

        // Generate fixes
        const fixes = this.generateFixes(lastDiagnosis, testCase);

        if (fixes.length === 0) {
          // No applicable fixes found
          break;
        }

        // Apply or queue fixes
        if (this.options.autoApply && !this.options.dryRun) {
          await this.applyFixes(fixes);
        } else {
          this.queueFixes(fixes);
          break; // Don't retry in dry-run mode
        }

      } catch (error) {
        lastDiagnosis = {
          category: 'execution_error',
          error: error.message,
          stack: error.stack
        };
        break;
      }
    }

    // Test ultimately failed
    this.results.failed++;
    if (lastDiagnosis) {
      this.results.failures.push({
        testCase: testCase.id || testCase.name,
        diagnosis: lastDiagnosis,
        attempts
      });
    }

    return { success: false, attempts, diagnosis: lastDiagnosis };
  }

  /**
   * Run all assertions for a test case
   */
  runAssertions(testCase, result) {
    const failures = [];

    for (const assertion of testCase.assertions || []) {
      const assertionType = ASSERTION_TYPES[assertion.type];
      if (!assertionType) {
        console.warn(`Unknown assertion type: ${assertion.type}`);
        continue;
      }

      const passed = assertionType.check(result, assertion.expected);

      if (!passed) {
        failures.push({
          type: assertion.type,
          diagnosis: assertionType.diagnose(result, assertion.expected),
          assertion
        });
      }
    }

    return {
      allPassed: failures.length === 0,
      failures
    };
  }

  /**
   * Diagnose why assertions failed
   */
  diagnoseFailures(failures, testCase) {
    const diagnoses = failures.map(f => ({
      ...f.diagnosis,
      assertionType: f.type,
      context: {
        testCase: testCase.id || testCase.name,
        input: testCase.input,
        handler: testCase.handler
      }
    }));

    // Prioritize by severity
    diagnoses.sort((a, b) => {
      const severityOrder = { critical: 0, error: 1, warning: 2 };
      return (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    });

    return diagnoses;
  }

  /**
   * Generate code fixes for diagnosed issues
   */
  generateFixes(diagnoses, testCase) {
    const fixes = [];

    for (const diagnosis of diagnoses) {
      for (const [fixName, generator] of Object.entries(CODE_FIX_GENERATORS)) {
        if (generator.detect(diagnosis)) {
          const fix = generator.generate(diagnosis, {
            ...diagnosis.context,
            ...testCase
          });
          fixes.push({
            name: fixName,
            ...fix,
            diagnosis
          });
        }
      }
    }

    return fixes;
  }

  /**
   * Apply fixes to the codebase
   */
  async applyFixes(fixes) {
    for (const fix of fixes) {
      console.log(`  🔧 Applying fix: ${fix.description}`);

      try {
        if (fix.type === 'add_validation' || fix.type === 'add_error_handler') {
          await this.patchFile(fix.location, fix.code, fix.before);
        }

        this.results.fixes.push({
          ...fix,
          applied: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(`  ❌ Failed to apply fix: ${error.message}`);
        this.results.fixes.push({
          ...fix,
          applied: false,
          error: error.message
        });
      }
    }
  }

  /**
   * Queue fixes for later application
   */
  queueFixes(fixes) {
    for (const fix of fixes) {
      this.results.fixes.push({
        ...fix,
        applied: false,
        queued: true
      });
    }
  }

  /**
   * Patch a file with the fix code
   */
  async patchFile(location, newCode, searchPattern) {
    const filePath = path.resolve(location);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    let content = fs.readFileSync(filePath, 'utf-8');

    if (searchPattern) {
      content = content.replace(searchPattern, newCode);
    } else {
      // Append to end of file
      content += '\n' + newCode;
    }

    fs.writeFileSync(filePath, content);
  }

  /**
   * Export all generated patches
   */
  exportPatches() {
    const patchDir = path.resolve(this.options.patchDir);
    if (!fs.existsSync(patchDir)) {
      fs.mkdirSync(patchDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const patches = this.results.fixes.filter(f => f.code);

    // Group patches by file
    const patchesByFile = {};
    for (const patch of patches) {
      const file = patch.location || 'misc';
      if (!patchesByFile[file]) {
        patchesByFile[file] = [];
      }
      patchesByFile[file].push(patch);
    }

    // Write patch files
    for (const [file, filePatches] of Object.entries(patchesByFile)) {
      const safeName = file.replace(/[/\\:]/g, '_');
      const patchPath = path.join(patchDir, `${timestamp}_${safeName}.patch.js`);

      const content = filePatches.map(p => `
// ============================================================================
// FIX: ${p.description}
// Diagnosed: ${p.diagnosis?.category || 'unknown'}
// ============================================================================
${p.code}
`).join('\n');

      fs.writeFileSync(patchPath, content);
    }

    // Write patch manifest
    const manifestPath = path.join(patchDir, `${timestamp}_manifest.json`);
    fs.writeFileSync(manifestPath, JSON.stringify({
      timestamp,
      totalPatches: patches.length,
      byFile: Object.fromEntries(
        Object.entries(patchesByFile).map(([k, v]) => [k, v.length])
      ),
      patches: patches.map(p => ({
        name: p.name,
        location: p.location,
        description: p.description,
        dependencies: p.dependencies
      }))
    }, null, 2));

    return {
      patchDir,
      manifestPath,
      fileCount: Object.keys(patchesByFile).length,
      patchCount: patches.length
    };
  }

  /**
   * Generate summary report
   */
  generateReport() {
    const report = {
      summary: {
        total: this.results.totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        fixed: this.results.fixed,
        passRate: ((this.results.passed / this.results.totalTests) * 100).toFixed(2) + '%',
        fixRate: this.results.failed > 0
          ? ((this.results.fixed / (this.results.fixed + this.results.failed)) * 100).toFixed(2) + '%'
          : 'N/A'
      },
      failureCategories: this.categorizeFailures(),
      fixesGenerated: this.results.fixes.length,
      fixesApplied: this.results.fixes.filter(f => f.applied).length,
      topIssues: this.getTopIssues()
    };

    return report;
  }

  categorizeFailures() {
    const categories = {};
    for (const failure of this.results.failures) {
      const cat = failure.diagnosis?.category || 'unknown';
      categories[cat] = (categories[cat] || 0) + 1;
    }
    return categories;
  }

  getTopIssues() {
    const issues = {};
    for (const failure of this.results.failures) {
      const issue = failure.diagnosis?.issue || 'Unknown issue';
      issues[issue] = (issues[issue] || 0) + 1;
    }
    return Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, count }));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function validateSchema(obj, schema) {
  if (!obj || typeof obj !== 'object') return false;

  for (const [key, spec] of Object.entries(schema)) {
    if (spec.required && !(key in obj)) return false;
    if (key in obj && spec.type && typeof obj[key] !== spec.type) return false;
  }
  return true;
}

function findMissingFields(obj, schema) {
  return Object.entries(schema)
    .filter(([key, spec]) => spec.required && !(key in obj))
    .map(([key]) => key);
}

function findExtraFields(obj, schema) {
  if (!obj || typeof obj !== 'object') return [];
  return Object.keys(obj).filter(key => !(key in schema));
}

function containsXSS(response) {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror\s*=/i,
    /onload\s*=/i,
    /<iframe/i,
    /<img[^>]+onerror/i
  ];

  const str = JSON.stringify(response);
  return xssPatterns.some(p => p.test(str));
}

function containsSQLError(response) {
  const sqlPatterns = [
    /SQL syntax/i,
    /mysql_fetch/i,
    /ORA-\d{5}/,
    /PostgreSQL.*ERROR/i,
    /SQLite3::SQLException/i,
    /Unclosed quotation mark/i
  ];

  const str = JSON.stringify(response);
  return sqlPatterns.some(p => p.test(str));
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function generateDiff(a, b) {
  // Simple diff for objects
  const aKeys = Object.keys(a || {});
  const bKeys = Object.keys(b || {});

  return {
    added: bKeys.filter(k => !aKeys.includes(k)),
    removed: aKeys.filter(k => !bKeys.includes(k)),
    changed: aKeys.filter(k => bKeys.includes(k) && !deepEqual(a[k], b[k]))
  };
}

function generateValidationCode(fieldName, type, min, max) {
  let code = `
// Auto-generated validation for ${fieldName}
if (typeof req.body.${fieldName} !== '${type}') {
  return res.status(400).json({
    success: false,
    error: { code: 'INVALID_TYPE', field: '${fieldName}', expected: '${type}' }
  });
}`;

  if (min !== undefined && max !== undefined) {
    code += `

if (req.body.${fieldName} < ${min} || req.body.${fieldName} > ${max}) {
  return res.status(400).json({
    success: false,
    error: { code: 'OUT_OF_RANGE', field: '${fieldName}', min: ${min}, max: ${max} }
  });
}`;
  }

  return code;
}

function generateZodSchema(schema) {
  const fields = Object.entries(schema).map(([key, spec]) => {
    let zodType = 'z.unknown()';

    switch (spec.type) {
      case 'string': zodType = 'z.string()'; break;
      case 'number': zodType = 'z.number()'; break;
      case 'boolean': zodType = 'z.boolean()'; break;
      case 'object': zodType = 'z.object({})'; break;
      case 'array': zodType = 'z.array(z.unknown())'; break;
    }

    if (!spec.required) {
      zodType += '.optional()';
    }

    return `  ${key}: ${zodType}`;
  });

  return `z.object({\n${fields.join(',\n')}\n})`;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ASSERTION_TYPES,
  CODE_FIX_GENERATORS,
  SelfFixingAssertionRunner,
  helpers: {
    validateSchema,
    findMissingFields,
    findExtraFields,
    containsXSS,
    containsSQLError,
    deepEqual,
    generateDiff,
    generateValidationCode,
    generateZodSchema
  }
};

// ============================================================================
// STANDALONE EXECUTION
// ============================================================================

if (require.main === module) {
  console.log('Self-Fixing Assertion Runner');
  console.log('============================\n');

  // Demo run
  const runner = new SelfFixingAssertionRunner({
    dryRun: true,
    autoApply: false
  });

  // Sample test case
  const testCase = {
    id: 'demo-001',
    name: 'Validate webhook payload',
    handler: 'webhookHandler',
    input: {
      event_type: 'call.completed',
      conversation_id: 'conv_123'
    },
    assertions: [
      { type: 'RESPONSE_STATUS', expected: 200 },
      { type: 'NO_XSS' },
      { type: 'CORRELATION_ID_PROPAGATED' }
    ]
  };

  // Mock executor
  const mockExecutor = async (tc) => ({
    status: 200,
    headers: {},
    body: { success: true }
  });

  runner.runWithFixing(testCase, mockExecutor).then(result => {
    console.log('Test Result:', result);
    console.log('\nGenerated Report:');
    console.log(JSON.stringify(runner.generateReport(), null, 2));

    const patchInfo = runner.exportPatches();
    console.log('\nPatches exported to:', patchInfo.patchDir);
  });
}
