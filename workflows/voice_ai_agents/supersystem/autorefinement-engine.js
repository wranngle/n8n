#!/usr/bin/env node
/**
 * Autorefinement Engine
 *
 * Progressive outcome-based autorefinement loop for ElevenLabs voice agents.
 * Runs tests, analyzes failures, applies fixes, and iterates until 100% pass.
 *
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────┐
 * │                    AUTOREFINEMENT LOOP                       │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1. RUN TESTS      → POST /run-tests (all or failed only)   │
 * │  2. POLL RESULTS   → GET /test-invocations/{id}             │
 * │  3. ANALYZE        → Pattern detection on failures          │
 * │  4. REMEDIATE      → Layer 1 prompt modification            │
 * │  5. RE-RUN FAILED  → Only failed tests                      │
 * │  6. VERIFY         → Confirm improvement                    │
 * │  7. LOG            → Update friction-log.jsonl              │
 * │  8. ITERATE        → Until 100% or max cycles               │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Created: 2025-12-30
 */

const fs = require('fs');
const path = require('path');

// Import Layer 7 test functions
const { runTests, listTests, getTestInvocation, listTestInvocations, ENDPOINTS, CONFIG: L7_CONFIG } = require('./tests/layer7-elevenlabs-tests');

// Import Layer 1 for fixes
const layer1 = require('./layer1-agent-modifier');

// ANSI colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// Configuration
const CONFIG = {
  AGENT_ID: process.env.ELEVENLABS_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew',
  MAX_CYCLES: 5,
  POLL_INTERVAL_MS: 5000,
  MAX_POLL_ATTEMPTS: 60, // 5 minutes max wait
  FRICTION_LOG: path.join(__dirname, 'data', 'friction-log.jsonl'),
  RESULTS_DIR: path.join(__dirname, 'data', 'autorefinement-results'),
};

/**
 * Failure Pattern Mapping
 * Maps test failure patterns to Layer 1 fix patterns
 */
const FAILURE_PATTERNS = {
  // SMS sent after decline
  SMS_AFTER_DECLINE: {
    detect: (result) => {
      const transcript = result.transcript || '';
      const toolCalls = result.tool_calls || [];
      const hasSmsTool = toolCalls.some(t => t.name === 'send_sms');
      const hasDecline = /no|don't|stop|never mind|cancel/i.test(transcript);
      return hasSmsTool && hasDecline;
    },
    fix: 'SMS_CONSENT_DISCIPLINE',
    promptAddition: `

[AUTOREFINEMENT] CRITICAL SMS CONSENT RULE:
- NEVER call send_sms after user says: no, don't, stop, never mind, cancel
- If ANY doubt about consent, ask for clarification
- Consent withdrawal is IMMEDIATE - stop all SMS operations`
  },

  // Tool not called when expected
  TOOL_NOT_CALLED: {
    detect: (result) => {
      const expected = result.expected_tool_calls || [];
      const actual = result.tool_calls || [];
      const actualNames = actual.map(t => t.name);
      return expected.some(e => !actualNames.includes(e));
    },
    fix: 'TOOL_NOT_CALLED',
    promptAddition: null // Uses Layer 1 default
  },

  // Context lost
  CONTEXT_LOST: {
    detect: (result) => {
      const transcript = result.transcript || '';
      return /what('s| is) your name again|who are you with|what company/i.test(transcript);
    },
    fix: 'CONTEXT_LOST',
    promptAddition: `

[AUTOREFINEMENT] CONTEXT RETENTION RULE:
- Remember ALL information provided by caller throughout the call
- Never re-ask for information already given
- Reference previous context naturally in responses`
  },

  // Hostile response
  HOSTILE_RESPONSE: {
    detect: (result) => {
      const agentMessages = (result.messages || []).filter(m => m.role === 'agent');
      return agentMessages.some(m => /rude|annoyed|frustrated/i.test(m.analysis || ''));
    },
    fix: 'TONE_ADJUSTMENT',
    promptAddition: `

[AUTOREFINEMENT] PROFESSIONAL TONE RULE:
- Always remain calm and professional, even with hostile callers
- Never match caller's negative energy
- Use de-escalation techniques: acknowledge, empathize, redirect`
  }
};

/**
 * Log friction event
 */
function logFriction(event) {
  const dir = path.dirname(CONFIG.FRICTION_LOG);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const entry = {
    timestamp: new Date().toISOString(),
    ...event
  };
  fs.appendFileSync(CONFIG.FRICTION_LOG, JSON.stringify(entry) + '\n');
}

/**
 * Poll for test invocation completion
 */
async function pollInvocation(invocationId, maxAttempts = CONFIG.MAX_POLL_ATTEMPTS) {
  console.log(`${C.cyan}Polling invocation ${invocationId}...${C.reset}`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await getTestInvocation(invocationId);
      const status = result.status || result.state;
      
      if (status === 'completed' || status === 'done') {
        console.log(`${C.green}✓ Invocation completed${C.reset}`);
        return result;
      }
      
      if (status === 'failed' || status === 'error') {
        console.log(`${C.red}✗ Invocation failed: ${result.error || 'Unknown error'}${C.reset}`);
        return result;
      }
      
      // Still running
      process.stdout.write(`${C.dim}  [${i + 1}/${maxAttempts}] Status: ${status}...${C.reset}\r`);
      await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
      
    } catch (e) {
      console.log(`${C.yellow}Poll error: ${e.message}${C.reset}`);
      await new Promise(r => setTimeout(r, CONFIG.POLL_INTERVAL_MS));
    }
  }
  
  throw new Error(`Timeout waiting for invocation ${invocationId}`);
}

/**
 * Analyze test results and detect failure patterns
 */
function analyzeFailures(results) {
  const failures = [];
  const testResults = results.test_results || results.results || [];
  
  for (const test of testResults) {
    if (test.passed || test.status === 'passed') continue;
    
    // Detect which pattern caused the failure
    let detectedPattern = null;
    for (const [patternName, pattern] of Object.entries(FAILURE_PATTERNS)) {
      if (pattern.detect(test)) {
        detectedPattern = patternName;
        break;
      }
    }
    
    failures.push({
      test_id: test.test_id || test.id,
      test_name: test.name,
      pattern: detectedPattern || 'UNKNOWN',
      reason: test.failure_reason || test.reason || 'Test did not pass success condition',
      transcript_snippet: (test.transcript || '').slice(0, 200),
    });
  }
  
  return failures;
}

/**
 * Apply remediations based on detected patterns
 */
async function applyRemediations(failures, agentId) {
  const applied = [];
  const patternCounts = {};
  
  // Count patterns
  for (const failure of failures) {
    patternCounts[failure.pattern] = (patternCounts[failure.pattern] || 0) + 1;
  }
  
  console.log(`\n${C.cyan}Detected failure patterns:${C.reset}`);
  for (const [pattern, count] of Object.entries(patternCounts)) {
    console.log(`  ${pattern}: ${count}`);
  }
  
  // Apply fixes for each unique pattern
  for (const pattern of Object.keys(patternCounts)) {
    if (pattern === 'UNKNOWN') continue;
    
    const patternDef = FAILURE_PATTERNS[pattern];
    if (!patternDef) continue;
    
    console.log(`\n${C.yellow}Applying fix for ${pattern}...${C.reset}`);
    
    try {
      if (patternDef.promptAddition) {
        // Custom prompt addition
        const agent = await layer1.getAgent(agentId);
        const currentPrompt = agent.conversation_config?.agent?.prompt?.prompt || '';
        
        // Check if fix already applied
        if (currentPrompt.includes('[AUTOREFINEMENT]') && currentPrompt.includes(pattern.split('_')[0])) {
          console.log(`${C.dim}  Fix already applied, skipping${C.reset}`);
          continue;
        }
        
        const newPrompt = currentPrompt + patternDef.promptAddition;
        await layer1.updateAgent(agentId, {
          conversation_config: {
            agent: {
              prompt: { prompt: newPrompt }
            }
          }
        });
        
        applied.push({ pattern, method: 'prompt_addition', chars_added: patternDef.promptAddition.length });
        console.log(`${C.green}  ✓ Applied prompt addition (+${patternDef.promptAddition.length} chars)${C.reset}`);
        
      } else {
        // Use Layer 1 default fix
        const result = await layer1.applyFix(patternDef.fix, agentId, {});
        applied.push({ pattern, method: 'layer1', result });
        console.log(`${C.green}  ✓ Applied Layer 1 fix: ${patternDef.fix}${C.reset}`);
      }
      
      logFriction({
        type: 'REMEDIATION_APPLIED',
        pattern,
        agent_id: agentId,
        success: true
      });
      
    } catch (e) {
      console.log(`${C.red}  ✗ Failed to apply fix: ${e.message}${C.reset}`);
      logFriction({
        type: 'REMEDIATION_FAILED',
        pattern,
        agent_id: agentId,
        error: e.message
      });
    }
  }
  
  return applied;
}

/**
 * Main autorefinement loop
 */
async function runAutorefinement(options = {}) {
  const agentId = options.agentId || CONFIG.AGENT_ID;
  const maxCycles = options.maxCycles || CONFIG.MAX_CYCLES;
  const verbose = options.verbose || false;
  
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}       AUTOREFINEMENT ENGINE v1.0                           ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.blue}Agent: ${agentId}${C.reset}`);
  console.log(`${C.blue}Max Cycles: ${maxCycles}${C.reset}\n`);
  
  const runLog = {
    startTime: new Date().toISOString(),
    agentId,
    cycles: [],
    finalResult: null
  };
  
  let failedTestIds = null; // null = run all, array = run specific
  
  for (let cycle = 1; cycle <= maxCycles; cycle++) {
    console.log(`\n${C.magenta}${C.bright}─── CYCLE ${cycle}/${maxCycles} ───${C.reset}\n`);
    
    const cycleLog = {
      cycle,
      startTime: new Date().toISOString(),
      testsRun: 0,
      passed: 0,
      failed: 0,
      patterns: {},
      remediations: []
    };
    
    // Step 1: Run tests
    console.log(`${C.cyan}[1/4] Running tests...${C.reset}`);
    let invocation;
    try {
      invocation = await runTests(agentId, failedTestIds);
      console.log(`${C.green}  ✓ Test run initiated: ${invocation.invocation_id || invocation.id}${C.reset}`);
    } catch (e) {
      console.log(`${C.red}  ✗ Failed to run tests: ${e.message}${C.reset}`);
      cycleLog.error = e.message;
      runLog.cycles.push(cycleLog);
      continue;
    }
    
    // Step 2: Poll for results
    console.log(`\n${C.cyan}[2/4] Waiting for results...${C.reset}`);
    let results;
    try {
      results = await pollInvocation(invocation.invocation_id || invocation.id);
    } catch (e) {
      console.log(`${C.red}  ✗ Failed to get results: ${e.message}${C.reset}`);
      cycleLog.error = e.message;
      runLog.cycles.push(cycleLog);
      continue;
    }
    
    // Step 3: Analyze failures
    console.log(`\n${C.cyan}[3/4] Analyzing results...${C.reset}`);
    const testResults = results.test_results || results.results || [];
    const passed = testResults.filter(t => t.passed || t.status === 'passed').length;
    const failed = testResults.length - passed;
    
    cycleLog.testsRun = testResults.length;
    cycleLog.passed = passed;
    cycleLog.failed = failed;
    
    console.log(`${C.green}  Passed: ${passed}${C.reset}`);
    console.log(`${C.red}  Failed: ${failed}${C.reset}`);
    console.log(`${C.blue}  Pass Rate: ${((passed / testResults.length) * 100).toFixed(1)}%${C.reset}`);
    
    // Check for 100% pass
    if (failed === 0) {
      console.log(`\n${C.green}${C.bright}🎉 100% PASS RATE ACHIEVED!${C.reset}`);
      runLog.finalResult = {
        success: true,
        cycles: cycle,
        passRate: 100
      };
      runLog.cycles.push(cycleLog);
      break;
    }
    
    // Analyze failures
    const failures = analyzeFailures(results);
    for (const f of failures) {
      cycleLog.patterns[f.pattern] = (cycleLog.patterns[f.pattern] || 0) + 1;
    }
    
    if (verbose) {
      console.log(`\n${C.dim}Failures:${C.reset}`);
      for (const f of failures.slice(0, 5)) {
        console.log(`${C.dim}  - ${f.test_name}: ${f.pattern}${C.reset}`);
      }
      if (failures.length > 5) {
        console.log(`${C.dim}  ... and ${failures.length - 5} more${C.reset}`);
      }
    }
    
    // Step 4: Apply remediations
    console.log(`\n${C.cyan}[4/4] Applying remediations...${C.reset}`);
    const remediations = await applyRemediations(failures, agentId);
    cycleLog.remediations = remediations;
    
    // Prepare for next cycle - only re-run failed tests
    failedTestIds = failures.map(f => f.test_id);
    
    runLog.cycles.push(cycleLog);
    cycleLog.endTime = new Date().toISOString();
    
    // Brief pause before next cycle
    if (cycle < maxCycles && failed > 0) {
      console.log(`\n${C.dim}Waiting 10s before next cycle...${C.reset}`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  
  // Final summary
  runLog.endTime = new Date().toISOString();
  if (!runLog.finalResult) {
    const lastCycle = runLog.cycles[runLog.cycles.length - 1];
    runLog.finalResult = {
      success: false,
      cycles: maxCycles,
      passRate: lastCycle ? ((lastCycle.passed / lastCycle.testsRun) * 100).toFixed(1) : 0
    };
  }
  
  // Save results
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }
  const resultsFile = path.join(CONFIG.RESULTS_DIR, `run-${Date.now()}.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(runLog, null, 2));
  
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}                    AUTOREFINEMENT COMPLETE                 ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.blue}Cycles: ${runLog.cycles.length}${C.reset}`);
  console.log(`${C.blue}Final Pass Rate: ${runLog.finalResult.passRate}%${C.reset}`);
  console.log(`${C.blue}Results: ${resultsFile}${C.reset}\n`);
  
  return runLog;
}

/**
 * Run a single test cycle (for n8n webhook integration)
 */
async function runSingleCycle(agentId, testIds = null) {
  console.log(`${C.cyan}Running single test cycle...${C.reset}`);
  
  // Run tests
  const invocation = await runTests(agentId, testIds);
  const results = await pollInvocation(invocation.invocation_id || invocation.id);
  
  // Analyze
  const testResults = results.test_results || results.results || [];
  const passed = testResults.filter(t => t.passed || t.status === 'passed').length;
  const failures = analyzeFailures(results);
  
  return {
    invocationId: invocation.invocation_id || invocation.id,
    total: testResults.length,
    passed,
    failed: testResults.length - passed,
    passRate: ((passed / testResults.length) * 100).toFixed(1),
    failures,
    needsRemediation: failures.length > 0
  };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const agentId = args.find(a => a.startsWith('--agent='))?.split('=')[1] || CONFIG.AGENT_ID;
  const maxCycles = parseInt(args.find(a => a.startsWith('--cycles='))?.split('=')[1] || '5');
  const verbose = args.includes('--verbose') || args.includes('-v');
  const singleCycle = args.includes('--single');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Autorefinement Engine - Progressive Voice Agent Optimization

Usage:
  node autorefinement-engine.js [options]

Options:
  --agent=<id>     Target agent ID (default: ${CONFIG.AGENT_ID})
  --cycles=<n>     Max refinement cycles (default: 5)
  --single         Run single cycle only (for integration)
  --verbose, -v    Show detailed failure info
  --help, -h       Show this help

Environment:
  ELEVENLABS_API_KEY   Required - Your ElevenLabs API key

Examples:
  node autorefinement-engine.js --cycles=3 --verbose
  node autorefinement-engine.js --single
`);
    process.exit(0);
  }
  
  if (singleCycle) {
    runSingleCycle(agentId)
      .then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.failed > 0 ? 1 : 0);
      })
      .catch(e => {
        console.error(`${C.red}FATAL: ${e.message}${C.reset}`);
        process.exit(1);
      });
  } else {
    runAutorefinement({ agentId, maxCycles, verbose })
      .then(result => {
        process.exit(result.finalResult.success ? 0 : 1);
      })
      .catch(e => {
        console.error(`${C.red}FATAL: ${e.message}${C.reset}`);
        process.exit(1);
      });
  }
}

module.exports = {
  runAutorefinement,
  runSingleCycle,
  analyzeFailures,
  applyRemediations,
  FAILURE_PATTERNS: Object.keys(FAILURE_PATTERNS),
  CONFIG
};
