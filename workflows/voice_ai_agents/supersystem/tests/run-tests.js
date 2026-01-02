#!/usr/bin/env node
/**
 * Supersystem Webhook Test Runner
 * 
 * Automated testing for ElevenLabs Supersystem workflows.
 * Loads scenarios from YAML and executes against live webhooks.
 * 
 * Usage:
 *   node run-tests.js                    # Run all tests
 *   node run-tests.js --workflow client-data-lookup
 *   node run-tests.js --category happy_path
 *   node run-tests.js --priority critical
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const CONFIG = {
  BASE_URL: process.env.N8N_WEBHOOK_BASE || 'https://n8n.wranngle.com/webhook',
  DEFAULT_TIMEOUT: 10000,
  RETRY_COUNT: 1,
  RETRY_DELAY: 1000,
};

// ANSI color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Load test scenarios from YAML file
 */
function loadScenarios(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

/**
 * Get nested field value from object using dot notation
 * Supports array indexing like "blocks[0].text"
 */
function getNestedValue(obj, path) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

/**
 * Evaluate a single assertion against response data
 */
function evaluateAssertion(assertion, response) {
  const { field, operator, value } = assertion;
  const actualValue = getNestedValue(response, field);
  
  const result = {
    field,
    operator,
    expected: value,
    actual: actualValue,
    passed: false,
    message: '',
  };
  
  switch (operator) {
    case 'equals':
      result.passed = JSON.stringify(actualValue) === JSON.stringify(value);
      result.message = result.passed 
        ? `${field} equals ${JSON.stringify(value)}`
        : `${field}: expected ${JSON.stringify(value)}, got ${JSON.stringify(actualValue)}`;
      break;
      
    case 'exists':
      result.passed = actualValue !== undefined && actualValue !== null;
      result.message = result.passed
        ? `${field} exists`
        : `${field} does not exist`;
      break;
      
    case 'not_exists':
      result.passed = actualValue === undefined || actualValue === null;
      result.message = result.passed
        ? `${field} does not exist (as expected)`
        : `${field} exists but should not`;
      break;
      
    case 'contains':
      result.passed = String(actualValue).includes(value);
      result.message = result.passed
        ? `${field} contains "${value}"`
        : `${field} does not contain "${value}" (got: ${JSON.stringify(actualValue)})`;
      break;
      
    case 'less_than':
      result.passed = typeof actualValue === 'number' && actualValue < value;
      result.message = result.passed
        ? `${field} (${actualValue}) < ${value}`
        : `${field} (${actualValue}) is not < ${value}`;
      break;
      
    case 'greater_than':
      result.passed = typeof actualValue === 'number' && actualValue > value;
      result.message = result.passed
        ? `${field} (${actualValue}) > ${value}`
        : `${field} (${actualValue}) is not > ${value}`;
      break;
      
    case 'is_array':
      result.passed = Array.isArray(actualValue);
      result.message = result.passed
        ? `${field} is an array`
        : `${field} is not an array (type: ${typeof actualValue})`;
      break;
      
    default:
      result.message = `Unknown operator: ${operator}`;
  }
  
  return result;
}


/**
 * Execute a single test scenario
 */
async function executeScenario(scenario, workflows, config) {
  const workflow = workflows.find(w => w.id === scenario.workflow);
  if (!workflow) {
    return {
      id: scenario.id,
      workflow: scenario.workflow,
      status: 'error',
      message: `Workflow not found: ${scenario.workflow}`,
      duration_ms: 0,
    };
  }
  
  const url = `${config.BASE_URL}${workflow.webhook_path}`;
  const timeout = scenario.expected?.timeout_ms || config.DEFAULT_TIMEOUT;
  
  const startTime = Date.now();
  let response;
  let responseData;
  let lastError;
  
  // Retry logic
  for (let attempt = 0; attempt <= config.RETRY_COUNT; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario.payload || {}),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      responseData = await response.json();
      lastError = null;
      break;
      
    } catch (error) {
      lastError = error;
      if (attempt < config.RETRY_COUNT) {
        await new Promise(r => setTimeout(r, config.RETRY_DELAY));
      }
    }
  }
  
  const duration_ms = Date.now() - startTime;
  
  if (lastError) {
    return {
      id: scenario.id,
      workflow: scenario.workflow,
      category: scenario.category,
      priority: scenario.priority,
      status: 'error',
      message: lastError.name === 'AbortError' 
        ? `Timeout after ${timeout}ms`
        : lastError.message,
      duration_ms,
    };
  }
  
  // Validate status code
  const expectedStatus = scenario.expected?.status_code || 200;
  if (response.status !== expectedStatus) {
    return {
      id: scenario.id,
      workflow: scenario.workflow,
      category: scenario.category,
      priority: scenario.priority,
      status: 'fail',
      message: `Expected status ${expectedStatus}, got ${response.status}`,
      duration_ms,
      response: responseData,
    };
  }
  
  // Evaluate assertions
  const assertions = scenario.expected?.assertions || [];
  const assertionResults = assertions.map(a => evaluateAssertion(a, responseData));
  const failedAssertions = assertionResults.filter(a => !a.passed);
  
  if (failedAssertions.length > 0) {
    return {
      id: scenario.id,
      workflow: scenario.workflow,
      category: scenario.category,
      priority: scenario.priority,
      status: 'fail',
      message: failedAssertions.map(a => a.message).join('; '),
      assertions: assertionResults,
      duration_ms,
      response: responseData,
    };
  }
  
  return {
    id: scenario.id,
    workflow: scenario.workflow,
    category: scenario.category,
    priority: scenario.priority,
    status: 'pass',
    message: `All ${assertions.length} assertions passed`,
    assertions: assertionResults,
    duration_ms,
    response: responseData,
  };
}


/**
 * Print test result with formatting
 */
function printResult(result, verbose = false) {
  const statusIcon = {
    pass: `${COLORS.green}✅ PASS${COLORS.reset}`,
    fail: `${COLORS.red}❌ FAIL${COLORS.reset}`,
    error: `${COLORS.yellow}⚠️  ERROR${COLORS.reset}`,
  }[result.status];
  
  const priorityColor = {
    critical: COLORS.red,
    high: COLORS.yellow,
    medium: COLORS.blue,
    low: COLORS.cyan,
  }[result.priority] || COLORS.reset;
  
  console.log(`\n${statusIcon} [${priorityColor}${result.priority}${COLORS.reset}] ${result.id}`);
  console.log(`   Workflow: ${result.workflow}`);
  console.log(`   Category: ${result.category}`);
  console.log(`   Duration: ${result.duration_ms}ms`);
  
  if (result.status !== 'pass') {
    console.log(`   ${COLORS.red}Message: ${result.message}${COLORS.reset}`);
  }
  
  if (verbose && result.assertions) {
    console.log('   Assertions:');
    for (const a of result.assertions) {
      const icon = a.passed ? '✓' : '✗';
      const color = a.passed ? COLORS.green : COLORS.red;
      console.log(`     ${color}${icon}${COLORS.reset} ${a.message}`);
    }
  }
  
  if (verbose && result.response && result.status !== 'pass') {
    console.log('   Response:', JSON.stringify(result.response, null, 2).substring(0, 500));
  }
}

/**
 * Print summary report
 */
function printSummary(results) {
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  
  const avgDuration = results.reduce((sum, r) => sum + r.duration_ms, 0) / total;
  
  console.log('\n' + '='.repeat(60));
  console.log(`${COLORS.bright}TEST SUMMARY${COLORS.reset}`);
  console.log('='.repeat(60));
  console.log(`Total:   ${total}`);
  console.log(`${COLORS.green}Passed:  ${passed}${COLORS.reset}`);
  console.log(`${COLORS.red}Failed:  ${failed}${COLORS.reset}`);
  console.log(`${COLORS.yellow}Errors:  ${errors}${COLORS.reset}`);
  console.log(`Average: ${avgDuration.toFixed(0)}ms`);
  console.log('='.repeat(60));
  
  if (failed + errors === 0) {
    console.log(`\n${COLORS.green}${COLORS.bright}✅ ALL TESTS PASSED!${COLORS.reset}\n`);
  } else {
    console.log(`\n${COLORS.red}${COLORS.bright}❌ SOME TESTS FAILED${COLORS.reset}\n`);
    
    // List failed tests
    const failedTests = results.filter(r => r.status !== 'pass');
    console.log('Failed tests:');
    for (const r of failedTests) {
      console.log(`  - ${r.id}: ${r.message}`);
    }
  }
  
  return failed + errors === 0 ? 0 : 1;
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    workflow: null,
    category: null,
    priority: null,
    verbose: false,
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--workflow':
      case '-w':
        options.workflow = args[++i];
        break;
      case '--category':
      case '-c':
        options.category = args[++i];
        break;
      case '--priority':
      case '-p':
        options.priority = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Supersystem Webhook Test Runner

Usage:
  node run-tests.js [options]

Options:
  --workflow, -w <id>     Filter by workflow ID
  --category, -c <name>   Filter by category (happy_path, edge_case, error_handling)
  --priority, -p <level>  Filter by priority (critical, high, medium, low)
  --verbose, -v           Show detailed assertion results
  --help, -h              Show this help message
`);
        process.exit(0);
    }
  }
  
  return options;
}


/**
 * Main entry point
 */
async function main() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}═══════════════════════════════════════════════════════════${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}       SUPERSYSTEM WEBHOOK TEST RUNNER v1.0                  ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}═══════════════════════════════════════════════════════════${COLORS.reset}\n`);
  
  const options = parseArgs();
  
  // Load test scenarios
  const scenariosPath = path.join(__dirname, 'test-scenarios.yaml');
  if (!fs.existsSync(scenariosPath)) {
    console.error(`${COLORS.red}Error: test-scenarios.yaml not found${COLORS.reset}`);
    process.exit(1);
  }
  
  const testData = loadScenarios(scenariosPath);
  let scenarios = testData.scenarios;
  const workflows = testData.workflows;
  
  console.log(`Loaded ${scenarios.length} scenarios for ${workflows.length} workflows`);
  console.log(`Base URL: ${CONFIG.BASE_URL}\n`);
  
  // Apply filters
  if (options.workflow) {
    scenarios = scenarios.filter(s => s.workflow === options.workflow);
    console.log(`Filtered to workflow: ${options.workflow}`);
  }
  if (options.category) {
    scenarios = scenarios.filter(s => s.category === options.category);
    console.log(`Filtered to category: ${options.category}`);
  }
  if (options.priority) {
    scenarios = scenarios.filter(s => s.priority === options.priority);
    console.log(`Filtered to priority: ${options.priority}`);
  }
  
  if (scenarios.length === 0) {
    console.log(`${COLORS.yellow}No scenarios match the filters${COLORS.reset}`);
    process.exit(0);
  }
  
  console.log(`\nRunning ${scenarios.length} test scenarios...\n`);
  console.log('-'.repeat(60));
  
  // Execute scenarios
  const results = [];
  for (const scenario of scenarios) {
    const result = await executeScenario(scenario, workflows, CONFIG);
    results.push(result);
    printResult(result, options.verbose);
  }
  
  // Print summary and exit
  const exitCode = printSummary(results);
  
  // Write results to JSON file
  const resultsPath = path.join(__dirname, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    base_url: CONFIG.BASE_URL,
    total: results.length,
    passed: results.filter(r => r.status === 'pass').length,
    failed: results.filter(r => r.status === 'fail').length,
    errors: results.filter(r => r.status === 'error').length,
    results,
  }, null, 2));
  console.log(`Results written to: ${resultsPath}`);
  
  process.exit(exitCode);
}

// Run if executed directly
main().catch(err => {
  console.error(`${COLORS.red}Fatal error: ${err.message}${COLORS.reset}`);
  process.exit(1);
});
