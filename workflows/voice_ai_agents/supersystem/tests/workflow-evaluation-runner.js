#!/usr/bin/env node
/**
 * Workflow Evaluation Runner
 * Executes test cases against all n8n workflows and integrates with Supersystem
 *
 * Usage:
 *   node workflow-evaluation-runner.js [--smoke|--full] [--workflow=<id>]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Load environment
const envPath = path.join(__dirname, '..', 'env', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const CONFIG_PATH = path.join(__dirname, 'workflow-evaluations.yaml');
const RESULTS_PATH = path.join(__dirname, 'evaluation-results');

// Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

class WorkflowEvaluationRunner {
  constructor(options = {}) {
    this.options = options;
    this.config = null;
    this.results = {
      timestamp: new Date().toISOString(),
      workflows: [],
      summary: {
        total_tests: 0,
        passed: 0,
        failed: 0,
        errors: 0,
        pass_rate: 0
      }
    };
  }

  async loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Config not found: ${CONFIG_PATH}`);
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf8');
    this.config = yaml.load(content);
    console.log(`${C.cyan}Loaded ${this.config.workflows.length} workflow definitions${C.reset}`);
  }

  async executeTestCase(workflow, testCase) {
    const url = `${this.config.base_url}${workflow.webhook_path}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), testCase.timeout_ms || 30000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.input),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const duration = Date.now() - startTime;
      const data = await response.json().catch(() => ({}));

      // Evaluate expectations
      let passed = true;
      const checks = [];

      if (testCase.expected) {
        for (const [key, expectedValue] of Object.entries(testCase.expected)) {
          const actualValue = data[key];
          const check = {
            field: key,
            expected: expectedValue,
            actual: actualValue,
            passed: this.compareValues(actualValue, expectedValue)
          };
          checks.push(check);
          if (!check.passed) passed = false;
        }
      }

      // Check response time
      if (testCase.timeout_ms && duration > testCase.timeout_ms) {
        checks.push({
          field: 'response_time',
          expected: `< ${testCase.timeout_ms}ms`,
          actual: `${duration}ms`,
          passed: false
        });
        passed = false;
      }

      return {
        test_id: testCase.id,
        test_name: testCase.name,
        passed,
        duration_ms: duration,
        status_code: response.status,
        checks,
        response_sample: JSON.stringify(data).substring(0, 200)
      };

    } catch (error) {
      return {
        test_id: testCase.id,
        test_name: testCase.name,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message,
        checks: []
      };
    }
  }

  compareValues(actual, expected) {
    if (Array.isArray(expected)) {
      if (!Array.isArray(actual)) return false;
      return expected.every(e => actual.includes(e));
    }
    if (typeof expected === 'object') {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return actual === expected;
  }

  async evaluateWorkflow(workflow) {
    console.log(`\n${C.bright}${C.cyan}━━━ ${workflow.name} ━━━${C.reset}`);
    console.log(`${C.dim}${workflow.description}${C.reset}`);

    const workflowResult = {
      id: workflow.id,
      name: workflow.name,
      webhook_path: workflow.webhook_path,
      test_cases: [],
      summary: { total: 0, passed: 0, failed: 0 }
    };

    for (const testCase of workflow.test_cases) {
      process.stdout.write(`  ${C.dim}${testCase.name}...${C.reset} `);

      const result = await this.executeTestCase(workflow, testCase);
      workflowResult.test_cases.push(result);
      workflowResult.summary.total++;
      this.results.summary.total_tests++;

      if (result.passed) {
        console.log(`${C.green}✓ PASS${C.reset} ${C.dim}(${result.duration_ms}ms)${C.reset}`);
        workflowResult.summary.passed++;
        this.results.summary.passed++;
      } else {
        console.log(`${C.red}✗ FAIL${C.reset} ${C.dim}(${result.duration_ms}ms)${C.reset}`);
        if (result.error) {
          console.log(`    ${C.red}Error: ${result.error}${C.reset}`);
        }
        result.checks.filter(c => !c.passed).forEach(c => {
          console.log(`    ${C.yellow}${c.field}: expected ${c.expected}, got ${c.actual}${C.reset}`);
        });
        workflowResult.summary.failed++;
        this.results.summary.failed++;
      }

      // Small delay between tests
      await new Promise(r => setTimeout(r, 500));
    }

    // Calculate workflow pass rate
    workflowResult.pass_rate = workflowResult.summary.total > 0
      ? ((workflowResult.summary.passed / workflowResult.summary.total) * 100).toFixed(1)
      : 0;

    console.log(`  ${C.cyan}Pass Rate: ${workflowResult.pass_rate}%${C.reset}`);

    this.results.workflows.push(workflowResult);
    return workflowResult;
  }

  async run() {
    console.log(`${C.bright}${C.cyan}`);
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║          WORKFLOW EVALUATION RUNNER v1.0                      ║');
    console.log('║          Testing All n8n Workflows                            ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log(`${C.reset}`);

    await this.loadConfig();

    // Filter workflows if specified
    let workflows = this.config.workflows;
    if (this.options.workflow) {
      workflows = workflows.filter(w => w.id === this.options.workflow);
      if (workflows.length === 0) {
        console.error(`Workflow not found: ${this.options.workflow}`);
        process.exit(1);
      }
    }

    // Run evaluations
    for (const workflow of workflows) {
      await this.evaluateWorkflow(workflow);
    }

    // Calculate overall pass rate
    this.results.summary.pass_rate = this.results.summary.total_tests > 0
      ? ((this.results.summary.passed / this.results.summary.total_tests) * 100).toFixed(1)
      : 0;

    // Print summary
    console.log(`\n${C.bright}${C.cyan}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    EVALUATION SUMMARY                          ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`${C.reset}`);
    console.log(`  Total Tests: ${this.results.summary.total_tests}`);
    console.log(`  ${C.green}Passed: ${this.results.summary.passed}${C.reset}`);
    console.log(`  ${C.red}Failed: ${this.results.summary.failed}${C.reset}`);
    console.log(`  ${C.bright}Pass Rate: ${this.results.summary.pass_rate}%${C.reset}`);

    // Save results
    await this.saveResults();

    // Feed back to supersystem if enabled
    if (this.config.integration?.supersystem_integration?.enabled) {
      await this.feedbackToSupersystem();
    }

    return this.results;
  }

  async saveResults() {
    if (!fs.existsSync(RESULTS_PATH)) {
      fs.mkdirSync(RESULTS_PATH, { recursive: true });
    }

    const filename = `evaluation-${Date.now()}.json`;
    const filepath = path.join(RESULTS_PATH, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\n${C.dim}Results saved: ${filepath}${C.reset}`);

    // Also update latest.json
    const latestPath = path.join(RESULTS_PATH, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(this.results, null, 2));
  }

  async feedbackToSupersystem() {
    console.log(`\n${C.cyan}Feeding results to Supersystem improvement loop...${C.reset}`);

    // Create friction entries for failed tests
    const frictions = this.results.workflows
      .flatMap(w => w.test_cases)
      .filter(tc => !tc.passed)
      .map(tc => ({
        type: 'WORKFLOW_TEST_FAILURE',
        workflow_id: tc.test_id.split('-')[0],
        test_id: tc.test_id,
        test_name: tc.test_name,
        error: tc.error || 'Expectation mismatch',
        timestamp: new Date().toISOString()
      }));

    if (frictions.length > 0) {
      // Write to frictions log for Layer 6 research
      const frictionsPath = path.join(__dirname, '..', 'data', 'workflow-frictions.json');
      const dataDir = path.dirname(frictionsPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let existingFrictions = [];
      if (fs.existsSync(frictionsPath)) {
        existingFrictions = JSON.parse(fs.readFileSync(frictionsPath, 'utf8'));
      }

      existingFrictions.push(...frictions);
      fs.writeFileSync(frictionsPath, JSON.stringify(existingFrictions, null, 2));

      console.log(`${C.yellow}  Added ${frictions.length} frictions for research${C.reset}`);
    } else {
      console.log(`${C.green}  No frictions to report - all tests passed!${C.reset}`);
    }
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {
    smoke: args.includes('--smoke'),
    full: args.includes('--full'),
    workflow: args.find(a => a.startsWith('--workflow='))?.split('=')[1]
  };

  const runner = new WorkflowEvaluationRunner(options);

  try {
    const results = await runner.run();
    process.exit(results.summary.pass_rate >= 95 ? 0 : 1);
  } catch (error) {
    console.error(`${C.red}Error: ${error.message}${C.reset}`);
    process.exit(1);
  }
}

module.exports = { WorkflowEvaluationRunner };

if (require.main === module) {
  main();
}
