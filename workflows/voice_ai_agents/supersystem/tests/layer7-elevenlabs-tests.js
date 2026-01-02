#!/usr/bin/env node
/**
 * Layer 7: ElevenLabs Native Test Integration
 *
 * Converts supersystem scenarios to ElevenLabs-native tests
 * visible in the ElevenLabs dashboard Tests tab.
 *
 * CORRECT API Endpoints (fixed 2025-12-30):
 * - CREATE: POST /v1/convai/agent-testing/create
 * - RUN:    POST /v1/convai/agents/{agent_id}/run-tests
 * - LIST:   GET  /v1/convai/agent-testing
 * - GET:    GET  /v1/convai/test-invocations/{invocation_id}
 *
 * Created: 2025-12-30
 * Fixed: 2025-12-30 - Corrected API endpoints from 404-returning paths
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  DEFAULT_AGENT_ID: process.env.ELEVENLABS_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew',
  SIMULATION_MODEL: process.env.ELEVENLABS_SIM_MODEL || 'gemini-3-flash-preview',
  API_BASE: 'https://api.elevenlabs.io/v1',
  SCENARIOS_FILE: path.join(__dirname, 'simulation-scenarios.yaml'),
  RESULTS_DIR: path.join(__dirname, 'elevenlabs-test-results'),
};

// CORRECT API Endpoints
const ENDPOINTS = {
  createTest: `${CONFIG.API_BASE}/convai/agent-testing/create`,
  runTests: (agentId) => `${CONFIG.API_BASE}/convai/agents/${agentId}/run-tests`,
  listTests: `${CONFIG.API_BASE}/convai/agent-testing`,
  getInvocation: (invocationId) => `${CONFIG.API_BASE}/convai/test-invocations/${invocationId}`,
  listInvocations: `${CONFIG.API_BASE}/convai/test-invocations`,
};

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Convert a supersystem scenario to ElevenLabs native test format
 *
 * ElevenLabs Test API requires:
 * - chat_history: array of {role: "user"|"agent", message: string, time_in_call_secs: number}
 * - success_condition: string (evaluation prompt returning True/False)
 * - success_examples: array of strings (non-empty)
 * - failure_examples: array of strings (non-empty)
 * - name: string
 * - type: "llm" | "tool" (optional)
 */
function convertToElevenLabsTest(scenario) {
  // Build chat_history from scenario
  const chatHistory = [];
  let timeCounter = 0;

  // If scenario has conversation_seed, use it
  if (scenario.conversation_seed) {
    for (const turn of scenario.conversation_seed) {
      chatHistory.push({
        role: turn.role === 'assistant' ? 'agent' : turn.role,
        message: turn.message || turn.content,
        time_in_call_secs: timeCounter,
      });
      timeCounter += 3; // ~3 seconds per turn
    }
  } else if (scenario.simulated_user_prompt) {
    // Create initial user message from prompt
    chatHistory.push({
      role: 'user',
      message: scenario.simulated_user_prompt.split('\n')[0] || 'Hello',
      time_in_call_secs: 0,
    });
  }

  // Build success condition from evaluation criteria
  let successCondition = '';
  if (scenario.evaluation_criteria && scenario.evaluation_criteria.length > 0) {
    successCondition = scenario.evaluation_criteria.map(c => c.prompt).join(' AND ');
  } else if (scenario.success_condition) {
    successCondition = scenario.success_condition;
  } else {
    successCondition = 'Agent responds appropriately and professionally';
  }

  // Determine test type based on expected/forbidden tool calls
  const hasToolExpectation = (scenario.expected_tool_calls?.length > 0) ||
                            (scenario.forbidden_tool_calls?.length > 0);
  const testType = hasToolExpectation ? 'tool' : 'llm';

  // Build success/failure examples
  const successExamples = scenario.success_examples || [
    'Agent handles the scenario correctly and professionally',
  ];
  const failureExamples = scenario.failure_examples || [
    'Agent fails to handle the scenario appropriately',
  ];

  return {
    name: scenario.name || scenario.id,
    chat_history: chatHistory,
    success_condition: successCondition,
    success_examples: successExamples,
    failure_examples: failureExamples,
    type: testType,
    // Include tool expectations if present
    ...(scenario.expected_tool_calls?.length > 0 && {
      tool_call_parameters: {
        expected_tools: scenario.expected_tool_calls,
      },
    }),
  };
}

/**
 * Create a test in ElevenLabs via API
 * CORRECT ENDPOINT: POST /v1/convai/agent-testing/create
 * 
 * AGENT ASSOCIATION: Per ElevenLabs docs, agent_metadata must be embedded
 * in EACH chat_history entry to associate the test with an agent.
 * The from_conversation_metadata approach only works with REAL conversation IDs.
 */
async function createTest(agentId, testConfig) {
  const url = ENDPOINTS.createTest;

  // Embed agent_metadata in each chat_history entry (canonical approach)
  const chatHistoryWithAgent = (testConfig.chat_history || []).map(entry => ({
    ...entry,
    agent_metadata: {
      agent_id: agentId,
      branch_id: 'branch_main',
      workflow_node_id: null,
    },
  }));

  const requestBody = {
    name: testConfig.name,
    chat_history: chatHistoryWithAgent,
    success_condition: testConfig.success_condition,
    success_examples: testConfig.success_examples,
    failure_examples: testConfig.failure_examples,
    type: testConfig.type || 'llm',
  };

  // Add tool_call_parameters if present
  if (testConfig.tool_call_parameters) {
    requestBody.tool_call_parameters = testConfig.tool_call_parameters;
  }
  
  // Add dynamic_variables if present
  if (testConfig.dynamic_variables) {
    requestBody.dynamic_variables = testConfig.dynamic_variables;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create test: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Run tests for an agent
 * CORRECT ENDPOINT: POST /v1/convai/agents/{agent_id}/run-tests
 */
async function runTests(agentId, testIds = null) {
  const url = ENDPOINTS.runTests(agentId);

  const requestBody = {};
  if (testIds && testIds.length > 0) {
    requestBody.tests = testIds.map(id => ({ test_id: id }));
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to run tests: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Alias for backwards compatibility
const runTest = runTests;

/**
 * List all tests
 * CORRECT ENDPOINT: GET /v1/convai/agent-testing
 */
async function listTests(agentId = null) {
  let url = ENDPOINTS.listTests;
  if (agentId) {
    url += `?agent_id=${agentId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list tests: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Get test invocation results
 * CORRECT ENDPOINT: GET /v1/convai/test-invocations/{invocation_id}
 */
async function getTestInvocation(invocationId) {
  const url = ENDPOINTS.getInvocation(invocationId);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get test invocation: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * List all test invocations
 * CORRECT ENDPOINT: GET /v1/convai/test-invocations
 */
async function listTestInvocations(agentId = null, pageSize = 30) {
  let url = ENDPOINTS.listInvocations + `?page_size=${pageSize}`;
  if (agentId) {
    url += `&agent_id=${agentId}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list test invocations: ${response.status} - ${error}`);
  }

  return await response.json();
}

// Backwards compatibility alias
const getTestResults = getTestInvocation;

/**
 * Load scenarios from YAML file
 */
function loadScenarios() {
  const content = fs.readFileSync(CONFIG.SCENARIOS_FILE, 'utf8');
  const data = yaml.load(content);
  return data.scenarios;
}

/**
 * Create all tests from scenarios
 */
async function createTestsFromScenarios(agentId, options = {}) {
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}       LAYER 7: ELEVENLABS NATIVE TEST CREATOR              ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);
  
  const scenarios = loadScenarios();
  console.log(`${C.blue}Loaded ${scenarios.length} scenarios from supersystem${C.reset}`);
  console.log(`${C.blue}Agent ID: ${agentId}${C.reset}`);
  console.log(`${C.blue}Simulation Model: ${CONFIG.SIMULATION_MODEL}${C.reset}\n`);
  
  // Filter by priority if specified
  let filtered = scenarios;
  if (options.priority) {
    filtered = scenarios.filter(s => s.priority === options.priority);
    console.log(`${C.yellow}Filtered to ${options.priority} priority: ${filtered.length} scenarios${C.reset}\n`);
  }
  
  // Filter by category if specified
  if (options.category) {
    filtered = filtered.filter(s => s.category === options.category);
    console.log(`${C.yellow}Filtered to ${options.category} category: ${filtered.length} scenarios${C.reset}\n`);
  }
  
  const results = {
    created: [],
    failed: [],
    skipped: [],
  };
  
  // Check existing tests to avoid duplicates
  let existingTests = [];
  try {
    const existingResponse = await listTests(agentId);
    existingTests = existingResponse.tests || [];
    console.log(`${C.blue}Found ${existingTests.length} existing tests${C.reset}\n`);
  } catch (e) {
    console.log(`${C.yellow}Could not fetch existing tests: ${e.message}${C.reset}\n`);
  }
  
  const existingNames = new Set(existingTests.map(t => t.name));
  
  for (const scenario of filtered) {
    const testConfig = convertToElevenLabsTest(scenario);
    
    // Skip if already exists
    if (existingNames.has(testConfig.name)) {
      console.log(`${C.yellow}⊘ SKIP${C.reset} ${scenario.id} (already exists)`);
      results.skipped.push({ id: scenario.id, reason: 'exists' });
      continue;
    }
    
    try {
      const created = await createTest(agentId, testConfig);
      console.log(`${C.green}✓ CREATED${C.reset} ${scenario.id} → test_${created.test_id || created.id}`);
      results.created.push({
        scenario_id: scenario.id,
        test_id: created.test_id || created.id,
        name: testConfig.name,
      });
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 500));
      
    } catch (e) {
      console.log(`${C.red}✗ FAILED${C.reset} ${scenario.id}: ${e.message}`);
      results.failed.push({
        id: scenario.id,
        error: e.message,
      });
    }
  }
  
  // Summary
  console.log(`\n${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}Created: ${results.created.length}${C.reset}`);
  console.log(`${C.yellow}Skipped: ${results.skipped.length}${C.reset}`);
  console.log(`${C.red}Failed: ${results.failed.length}${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);
  
  // Save results
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }
  
  const resultFile = path.join(CONFIG.RESULTS_DIR, `create-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${resultFile}`);
  
  return results;
}

/**
 * Run all tests for an agent and poll for results
 */
async function runAllTests(agentId) {
  console.log(`\n${C.magenta}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.magenta}${C.bright}       LAYER 7: RUNNING ALL ELEVENLABS TESTS               ${C.reset}`);
  console.log(`${C.magenta}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);

  // Trigger all tests
  console.log(`${C.cyan}▶ Triggering test run for agent ${agentId}...${C.reset}`);
  const runResponse = await runTests(agentId);
  const invocationId = runResponse.invocation_id || runResponse.id;

  console.log(`${C.blue}Test invocation started: ${invocationId}${C.reset}`);
  console.log(`${C.yellow}Polling for results...${C.reset}\n`);

  // Poll for completion
  let attempts = 0;
  let invocation;
  while (attempts < 60) { // 2 minutes max
    await new Promise(r => setTimeout(r, 2000));
    try {
      invocation = await getTestInvocation(invocationId);

      const status = invocation.status || 'unknown';
      console.log(`  Attempt ${attempts + 1}: Status = ${status}`);

      if (status === 'completed' || status === 'done' || status === 'finished') {
        break;
      }
      if (status === 'failed' || status === 'error') {
        console.log(`${C.red}Test run failed${C.reset}`);
        break;
      }
    } catch (e) {
      console.log(`  Polling error: ${e.message}`);
    }
    attempts++;
  }

  // Parse results
  const results = {
    invocation_id: invocationId,
    status: invocation?.status || 'unknown',
    passed: [],
    failed: [],
    errors: [],
    raw: invocation,
  };

  if (invocation?.test_results) {
    for (const testResult of invocation.test_results) {
      if (testResult.passed || testResult.status === 'passed') {
        results.passed.push({
          test_id: testResult.test_id,
          name: testResult.name || testResult.test_id,
        });
      } else {
        results.failed.push({
          test_id: testResult.test_id,
          name: testResult.name || testResult.test_id,
          reason: testResult.failure_reason || testResult.error,
        });
      }
    }
  }

  // Summary
  console.log(`\n${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}Passed: ${results.passed.length}${C.reset}`);
  console.log(`${C.red}Failed: ${results.failed.length}${C.reset}`);
  console.log(`${C.yellow}Errors: ${results.errors.length}${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);

  // Save results
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }
  const resultFile = path.join(CONFIG.RESULTS_DIR, `run-${Date.now()}.json`);
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${resultFile}`);

  return results;
}

/**
 * Generate report comparing supersystem vs ElevenLabs native results
 */
async function generateReport(agentId) {
  const testsResponse = await listTests(agentId);
  const tests = testsResponse.tests || [];
  
  // Load supersystem cycle stats
  const cycleStatsPath = path.join(__dirname, 'cycle-stats.json');
  let cycleStats = { cycles: [] };
  if (fs.existsSync(cycleStatsPath)) {
    cycleStats = JSON.parse(fs.readFileSync(cycleStatsPath, 'utf8'));
  }
  
  const report = {
    generated: new Date().toISOString(),
    agent_id: agentId,
    simulation_model: CONFIG.SIMULATION_MODEL,
    supersystem: {
      total_cycles: cycleStats.cycles.length,
      total_simulations: cycleStats.cycles.reduce((sum, c) => sum + c.simulations, 0),
      validation_rate: 0,
    },
    elevenlabs_native: {
      total_tests: tests.length,
      tests: tests.map(t => ({
        id: t.id || t.test_id,
        name: t.name,
        status: t.status,
        last_run: t.last_run_at,
      })),
    },
  };
  
  // Calculate validation rate
  if (cycleStats.cycles.length > 0) {
    const lastCycle = cycleStats.cycles[cycleStats.cycles.length - 1];
    if (lastCycle.outcomes) {
      const total = lastCycle.outcomes.validated + lastCycle.outcomes.gaps + lastCycle.outcomes.bugs;
      report.supersystem.validation_rate = total > 0 
        ? ((lastCycle.outcomes.validated / total) * 100).toFixed(1) + '%'
        : 'N/A';
    }
  }
  
  // Save report
  const reportFile = path.join(CONFIG.RESULTS_DIR, 'comparison-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}       LAYER 7: COMPARISON REPORT                          ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`\n${C.bright}Supersystem Engine:${C.reset}`);
  console.log(`  Cycles completed: ${report.supersystem.total_cycles}`);
  console.log(`  Total simulations: ${report.supersystem.total_simulations}`);
  console.log(`  Validation rate: ${report.supersystem.validation_rate}`);
  console.log(`\n${C.bright}ElevenLabs Native:${C.reset}`);
  console.log(`  Total tests: ${report.elevenlabs_native.total_tests}`);
  console.log(`  Simulation model: ${CONFIG.SIMULATION_MODEL}`);
  console.log(`\nReport saved to: ${reportFile}\n`);
  
  return report;
}

/**
 * CLI helper - generate commands for manual testing
 */
function generateCLICommands(agentId) {
  console.log(`\n${C.yellow}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.yellow}${C.bright}       ELEVENLABS CLI COMMANDS                              ${C.reset}`);
  console.log(`${C.yellow}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);
  
  console.log(`${C.cyan}# List all tests${C.reset}`);
  console.log(`elevenlabs agents tests list ${agentId}\n`);
  
  console.log(`${C.cyan}# Run all tests${C.reset}`);
  console.log(`elevenlabs agents test ${agentId}\n`);
  
  console.log(`${C.cyan}# Run specific test${C.reset}`);
  console.log(`elevenlabs agents tests run ${agentId} <test_id>\n`);
  
  console.log(`${C.cyan}# View test results${C.reset}`);
  console.log(`elevenlabs agents tests results ${agentId} <test_id>\n`);
  
  console.log(`${C.cyan}# Delete a test${C.reset}`);
  console.log(`elevenlabs agents tests delete ${agentId} <test_id>\n`);
}

// Export for use by supersystem engine
module.exports = {
  // Core functions
  convertToElevenLabsTest,
  createTest,
  runTests,
  runTest, // alias
  listTests,
  getTestInvocation,
  listTestInvocations,
  getTestResults, // alias
  // Higher-level operations
  createTestsFromScenarios,
  runAllTests,
  generateReport,
  generateCLICommands,
  // Config and endpoints
  CONFIG,
  ENDPOINTS,
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const agentId = args[1] || CONFIG.DEFAULT_AGENT_ID;
  
  if (!CONFIG.ELEVENLABS_API_KEY) {
    console.error(`${C.red}Error: ELEVENLABS_API_KEY environment variable required${C.reset}`);
    process.exit(1);
  }
  
  const commands = {
    'create': () => createTestsFromScenarios(agentId, {
      priority: args.includes('--critical') ? 'critical' : undefined,
      category: args.find(a => a.startsWith('--category='))?.split('=')[1],
    }),
    'run': () => runAllTests(agentId),
    'list': async () => {
      const tests = await listTests(agentId);
      console.log(JSON.stringify(tests, null, 2));
    },
    'report': () => generateReport(agentId),
    'cli': () => generateCLICommands(agentId),
    'help': async () => {
      console.log(`
Layer 7: ElevenLabs Native Test Integration

Usage:
  node layer7-elevenlabs-tests.js <command> [agent_id] [options]

Commands:
  create [agent_id]    Create ElevenLabs tests from supersystem scenarios
  run [agent_id]       Run all tests for an agent
  list [agent_id]      List all tests
  report [agent_id]    Generate comparison report
  cli [agent_id]       Show ElevenLabs CLI commands
  help                 Show this help

Options:
  --critical           Only create/run critical priority tests
  --category=<name>    Filter by category

Environment:
  ELEVENLABS_API_KEY   Required - Your ElevenLabs API key
  ELEVENLABS_AGENT_ID  Optional - Default agent ID
  ELEVENLABS_SIM_MODEL Optional - Simulation model (default: gemini-3-flash-preview)

Examples:
  node layer7-elevenlabs-tests.js create
  node layer7-elevenlabs-tests.js create agent_xxx --critical
  node layer7-elevenlabs-tests.js run agent_xxx
  node layer7-elevenlabs-tests.js report
`);
    },
  };
  
  const handler = commands[command] || commands['help'];
  handler().catch(e => {
    console.error(`${C.red}Error: ${e.message}${C.reset}`);
    process.exit(1);
  });
}
