#!/usr/bin/env node
/**
 * Supersystem Engine v2.1 - Autonomous Self-Improving Voice Agent Framework
 *
 * 7-Layer Architecture:
 * - Layer 1: ElevenLabs Agent Auto-Modifier
 * - Layer 2: n8n Workflow Auto-Corrector
 * - Layer 3: Data Layer (personas, seed data)
 * - Layer 4: Gemini LLM Brain
 * - Layer 5: Claude Code Auto-Commit
 * - Layer 6: Deep Research Engine
 * - Layer 7: Workflow Evaluation Runner (NEW)
 *
 * Target: 100% pass rate through autonomous remediation
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, 'env', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

// Import layers
const layer1 = require('./layer1-agent-modifier');
const layer2 = require('./layer2-workflow-corrector');
const layer3 = require('./layer3-data-manager');
const layer4 = require('./layer4-gemini-brain');
const layer5 = require('./layer5-repo-updater');
const layer6 = require('./layer6-research-engine');

// Layer 7: Workflow Evaluation Runner
let layer7 = null;
try {
  const { WorkflowEvaluationRunner } = require('./tests/workflow-evaluation-runner');
  layer7 = { WorkflowEvaluationRunner };
} catch (e) {
  // Layer 7 optional - will skip if not available
}

// Configuration
const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  DEFAULT_AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  SUPERSYSTEM_BASE: process.env.SUPERSYSTEM_BASE || 'https://n8n.wranngle.com/webhook',
  BATCH_SIZE: 5,
  MAX_CYCLES: 10,
  MAX_CYCLES_WITHOUT_IMPROVEMENT: 3,
  DELAY_BETWEEN_SIMS_MS: 3000,
  RESEARCH_THRESHOLD: 2  // Trigger Layer 6 after 2 occurrences
};

// Webhook endpoints
const WEBHOOKS = {
  client_lookup: '/client-lookup-test',
  execution_logger: '/log-execution-test',
  slack_notifier: '/slack-notify-test',
  orchestrator: '/post-call-test'
};

// Colors for terminal output
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m', dim: '\x1b[2m'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (msg, color = '') => console.log(`${color}${msg}${C.reset}`);
const logPhase = (phase, msg) => console.log(`\n${C.cyan}${C.bright}[${phase}]${C.reset} ${msg}`);
const logLayer = (layer, msg) => console.log(`  ${C.magenta}[L${layer}]${C.reset} ${msg}`);

// State tracking
const state = {
  cycle: 0,
  totalSimulations: 0,
  outcomes: { validated: 0, gaps: 0, bugs: 0, improved: 0, autoFixed: 0 },
  coverage: { client_lookup: 0, execution_logger: 0, slack_notifier: 0, orchestrator: 0 },
  patternOccurrences: {},  // Track failure patterns for research trigger
  autoFixes: [],
  researchTriggered: []
};

/**
 * PHASE 1: CALIBRATE - Verify prerequisites
 */
async function calibrate() {
  logPhase('CALIBRATE', 'Verifying Supersystem prerequisites...');
  
  const checks = [];
  
  for (const [name, webhookPath] of Object.entries(WEBHOOKS)) {
    try {
      const start = Date.now();
      const response = await fetch(`${CONFIG.SUPERSYSTEM_BASE}${webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _health_check: true })
      });
      const latency = Date.now() - start;
      const ok = response.status === 200;
      checks.push({ name, ok, latency, status: response.status });
      log(`  ${ok ? '✓' : '✗'} ${name}: ${response.status} (${latency}ms)`, ok ? C.green : C.red);
    } catch (e) {
      checks.push({ name, ok: false, error: e.message });
      log(`  ✗ ${name}: ${e.message}`, C.red);
    }
  }
  
  // Check unresolved frictions
  const frictions = layer3.getUnresolvedFrictions();
  if (frictions.length > 0) {
    log(`\n  ⚠️  ${frictions.length} unresolved frictions from previous runs`, C.yellow);
    
    // Check for patterns that need research
    for (const f of frictions) {
      const key = f.type || f.description;
      state.patternOccurrences[key] = (state.patternOccurrences[key] || 0) + 1;
      
      if (layer6.shouldTriggerResearch(state.patternOccurrences[key])) {
        log(`    → Pattern "${key}" hit threshold, queuing for research`, C.yellow);
      }
    }
  }
  
  const allOk = checks.every(c => c.ok);
  log(allOk ? '\n✓ Calibration complete' : '\n⚠️  Some webhooks not responding', allOk ? C.green : C.yellow);
  
  return allOk;
}

/**
 * PHASE 2: EXECUTE - Run simulations
 */
async function executeSimulation(scenario) {
  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: { prompt: scenario.prompt, llm: 'gemini-2.0-flash', temperature: 0.8 }
      }
    },
    extra_evaluation_criteria: (scenario.criteria || []).map(c => ({
      id: c.id, name: c.name, conversation_goal_prompt: c.prompt, use_knowledge_base: false
    })),
    new_turns_limit: 20
  };

  return new Promise((resolve) => {
    let data = '';
    const url = `https://api.elevenlabs.io/v1/convai/agents/${CONFIG.DEFAULT_AGENT_ID}/simulate-conversation/stream`;
    
    const req = https.request(url, {
      method: 'POST',
      headers: { 'xi-api-key': CONFIG.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }
    }, res => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const turns = [];
        let analysis = null;
        
        for (const line of data.split('\n').filter(l => l.trim())) {
          try {
            let parsed = JSON.parse(line);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (parsed.simulated_conversation) turns.push(...parsed.simulated_conversation);
            if (parsed.analysis) analysis = parsed.analysis;
          } catch {}
        }
        
        // Extract tool calls
        const toolCalls = [];
        for (const t of turns) {
          if (t.tool_calls) toolCalls.push(...t.tool_calls.map(tc => tc.tool_name || tc.name));
          if (t.tool_call) toolCalls.push(t.tool_call.tool_name || t.tool_call.name);
        }
        
        resolve({ turns, analysis, toolCalls, turnCount: turns.length, status: res.statusCode });
      });
    });
    
    req.on('error', e => resolve({ error: e.message, status: 0 }));
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function executeBatch(scenarios) {
  logPhase('EXECUTE', `Running batch of ${scenarios.length} simulations...`);
  
  const results = [];
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    log(`  [${i + 1}/${scenarios.length}] ${scenario.name}...`, C.dim);
    
    const start = Date.now();
    const result = await executeSimulation(scenario);
    result.duration = Date.now() - start;
    result.scenario = scenario;
    
    const expected = scenario.expectedTools || [];
    const forbidden = scenario.forbiddenTools || [];
    const missing = expected.filter(t => !result.toolCalls.includes(t));
    const unwanted = forbidden.filter(t => result.toolCalls.includes(t));
    
    result.passed = result.error ? false : (missing.length === 0 && unwanted.length === 0);
    result.missing = missing;
    result.unwanted = unwanted;
    
    const icon = result.passed ? `${C.green}✓` : `${C.red}✗`;
    log(`    ${icon} ${result.passed ? 'PASS' : 'FAIL'} (${result.turnCount} turns, ${result.duration}ms)${C.reset}`);
    
    results.push(result);
    state.totalSimulations++;
    
    if (i < scenarios.length - 1) await sleep(CONFIG.DELAY_BETWEEN_SIMS_MS);
  }
  
  return results;
}

/**
 * PHASE 3: OBSERVE - Analyze patterns
 */
function observe(results) {
  logPhase('OBSERVE', 'Analyzing batch results for patterns...');
  
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  
  log(`  Batch: ${passed.length}/${results.length} passed`, passed.length === results.length ? C.green : C.yellow);
  
  const observations = {
    passRate: passed.length / results.length,
    failuresByCategory: {},
    missingToolCounts: {},
    patterns: [],
    failedResults: failed
  };
  
  // Cluster failures
  for (const f of failed) {
    const cat = f.scenario.category || 'uncategorized';
    observations.failuresByCategory[cat] = observations.failuresByCategory[cat] || [];
    observations.failuresByCategory[cat].push(f);
    
    for (const tool of f.missing || []) {
      observations.missingToolCounts[tool] = (observations.missingToolCounts[tool] || 0) + 1;
    }
  }
  
  // Detect actionable patterns
  // BUG FIX: Always count passed scenarios, not just when passRate === 1
  state.outcomes.validated += passed.length;
  
  if (observations.passRate === 1) {
    observations.patterns.push({ type: 'VALIDATED', message: 'All scenarios passed' });
  } else {
    for (const [tool, count] of Object.entries(observations.missingToolCounts)) {
      if (count >= 2) {
        observations.patterns.push({
          type: 'GAP_DETECTED',
          message: `Tool "${tool}" not triggered in ${count} scenarios`,
          tool,
          layer: 1  // ElevenLabs agent issue
        });
        state.outcomes.gaps++;
        
        // Track for research threshold
        const key = `tool_not_called:${tool}`;
        state.patternOccurrences[key] = (state.patternOccurrences[key] || 0) + count;
      }
    }
    
    for (const [cat, failures] of Object.entries(observations.failuresByCategory)) {
      if (failures.length >= 2) {
        observations.patterns.push({
          type: 'CATEGORY_FAILURE',
          message: `Category "${cat}" has ${failures.length} failures`,
          category: cat,
          layer: 1
        });
      }
    }
  }
  
  if (observations.patterns.length > 0) {
    log(`  Found ${observations.patterns.length} patterns:`, C.cyan);
    for (const p of observations.patterns) {
      const icon = p.type === 'VALIDATED' ? '✓' : '⚡';
      log(`    ${icon} ${p.type}: ${p.message}`, p.type === 'VALIDATED' ? C.green : C.yellow);
    }
  }
  
  return observations;
}

/**
 * PHASE 4: ANALYZE - Use Gemini LLM to diagnose
 */
async function analyze(observations, results) {
  logPhase('ANALYZE', 'Using Gemini LLM to diagnose failures...');
  
  if (observations.passRate === 1) {
    log('  No failures to analyze', C.dim);
    return { functionCalls: [] };
  }
  
  // Build context for Gemini
  const failedResults = observations.failedResults || [];
  const analyses = [];
  
  for (const result of failedResults.slice(0, 3)) {  // Analyze top 3 failures
    logLayer(4, `Analyzing: ${result.scenario.name}`);
    
    const failureContext = {
      scenario: result.scenario,
      category: result.scenario.category,
      expectedTools: result.scenario.expectedTools,
      actualTools: result.toolCalls,
      missingTools: result.missing,
      unwantedTools: result.unwanted,
      turnCount: result.turnCount,
      transcript: result.turns,
      occurrenceCount: state.patternOccurrences[`tool_not_called:${result.missing?.[0]}`] || 1
    };
    
    try {
      const analysis = await layer4.analyzeFailure(failureContext);
      analyses.push({ result, analysis });
      
      if (analysis.functionCalls?.length > 0) {
        log(`    → Gemini suggests: ${analysis.functionCalls.map(f => f.name).join(', ')}`, C.cyan);
      }
    } catch (error) {
      log(`    ✗ Analysis failed: ${error.message}`, C.red);
    }
  }
  
  return { analyses };
}

/**
 * PHASE 5: REMEDIATE - Apply autonomous fixes
 */
async function remediate(analysisResult, observations) {
  logPhase('REMEDIATE', 'Applying autonomous fixes...');
  
  const remediations = [];
  const layers = { layer1, layer2, layer3, layer5, layer6 };
  
  if (!analysisResult.analyses || analysisResult.analyses.length === 0) {
    // Fallback: use observation-based fixes
    for (const pattern of observations.patterns) {
      if (pattern.type === 'GAP_DETECTED' && pattern.tool) {
        logLayer(1, `Applying fix: TOOL_NOT_CALLED for ${pattern.tool}`);
        
        try {
          const fix = await layer1.applyFix('TOOL_NOT_CALLED', CONFIG.DEFAULT_AGENT_ID, {
            missingTool: pattern.tool
          });
          remediations.push({ layer: 1, pattern, fix, success: fix.success });
          
          if (fix.success) {
            state.outcomes.autoFixed++;
            state.autoFixes.push({ pattern: pattern.type, tool: pattern.tool, timestamp: new Date().toISOString() });
            log(`    ✓ Auto-fix applied to Layer 1`, C.green);
          }
        } catch (error) {
          remediations.push({ layer: 1, pattern, error: error.message, success: false });
          log(`    ✗ Fix failed: ${error.message}`, C.red);
        }
      }
    }
  } else {
    // Execute Gemini-suggested fixes
    for (const { result, analysis } of analysisResult.analyses) {
      for (const functionCall of analysis.functionCalls || []) {
        logLayer(4, `Executing: ${functionCall.name}`);
        
        try {
          const fixResult = await layer4.executeFunctionCall(functionCall, layers);
          remediations.push({ functionCall, result: fixResult, success: fixResult?.success });
          
          if (fixResult?.success) {
            state.outcomes.autoFixed++;
            log(`    ✓ Fix executed successfully`, C.green);
          }
        } catch (error) {
          remediations.push({ functionCall, error: error.message, success: false });
          log(`    ✗ Execution failed: ${error.message}`, C.red);
        }
      }
    }
  }
  
  // Check if research should be triggered
  for (const [pattern, count] of Object.entries(state.patternOccurrences)) {
    if (layer6.shouldTriggerResearch(count) && !state.researchTriggered.includes(pattern)) {
      logLayer(6, `Triggering deep research for: ${pattern}`);
      state.researchTriggered.push(pattern);
      
      try {
        const query = layer6.buildResearchQuery({ missingTools: [pattern.split(':')[1]] });
        const researchResult = await layer6.research(query, pattern);
        
        if (researchResult.recommendation) {
          log(`    → Research recommendation: ${researchResult.recommendation.action}`, C.cyan);
          remediations.push({ layer: 6, pattern, research: researchResult, success: true });
        }
      } catch (error) {
        log(`    ✗ Research failed: ${error.message}`, C.red);
      }
    }
  }
  
  log(`  Applied ${remediations.filter(r => r.success).length}/${remediations.length} fixes`, C.cyan);
  
  return remediations;
}

/**
 * PHASE 6: VERIFY - Re-run failed scenarios
 */
async function verify(remediations, originalResults) {
  logPhase('VERIFY', 'Re-running failed scenarios to verify fixes...');
  
  const failedScenarios = originalResults
    .filter(r => !r.passed && !r.error)
    .map(r => r.scenario)
    .slice(0, 3);
  
  if (failedScenarios.length === 0) {
    log('  No scenarios to re-verify', C.dim);
    return { improved: 0, stillFailing: 0 };
  }
  
  // Wait a moment for agent updates to propagate
  await sleep(2000);
  
  log(`  Re-running ${failedScenarios.length} scenarios...`, C.cyan);
  const rerunResults = await executeBatch(failedScenarios);
  
  const nowPassing = rerunResults.filter(r => r.passed).length;
  const stillFailing = rerunResults.filter(r => !r.passed).length;
  
  if (nowPassing > 0) {
    log(`\n  ✓ ${nowPassing} scenarios now passing!`, C.green);
    state.outcomes.improved += nowPassing;
  }
  
  if (stillFailing > 0) {
    log(`  ✗ ${stillFailing} scenarios still failing`, C.yellow);
    
    // Log persistent failures as frictions
    for (const r of rerunResults.filter(r => !r.passed)) {
      layer3.logFriction({
        type: 'PERSISTENT_FAILURE',
        scenario: r.scenario.name,
        description: `Failed verification after auto-fix`,
        missing: r.missing,
        cycle: state.cycle
      });
    }
  }
  
  return { improved: nowPassing, stillFailing };
}

/**
 * PHASE 7: AUTOMATE - Persist learnings
 */
async function automate(observations, remediations, verifyResults) {
  logPhase('AUTOMATE', 'Persisting learnings...');
  
  // Update cycle stats
  layer3.addCycleStats({
    cycle: state.cycle,
    simulations: state.totalSimulations,
    outcomes: { ...state.outcomes },
    coverage: { ...state.coverage },
    patterns: observations.patterns.length,
    remediations: remediations.length,
    autoFixed: remediations.filter(r => r.success).length,
    verifyResults
  });
  logLayer(3, 'Updated cycle-stats.json');
  
  // Generate improvement report
  if (remediations.length > 0) {
    layer5.generateImprovementReport(remediations);
    logLayer(5, 'Generated improvement-suggestions.md');
  }
  
  // Log frictions for patterns
  for (const pattern of observations.patterns) {
    if (pattern.type !== 'VALIDATED') {
      layer3.logFriction({
        type: pattern.type,
        description: pattern.message,
        layer: pattern.layer,
        cycle: state.cycle
      });
    }
  }

  // Layer 7: Run workflow evaluations periodically (every 3 cycles)
  if (layer7 && state.cycle % 3 === 0) {
    try {
      logLayer(7, 'Running workflow evaluations...');
      const runner = new layer7.WorkflowEvaluationRunner({ smoke: true });
      const evalResults = await runner.run();
      logLayer(7, `Workflow eval: ${evalResults.summary.pass_rate}% pass rate`);
      state.workflowEvalResults = evalResults;
    } catch (e) {
      logLayer(7, `Evaluation skipped: ${e.message}`);
    }
  }

  return { logged: true };
}

/**
 * MAIN LOOP
 */
async function main() {
  console.log(`
${C.cyan}${C.bright}╔═══════════════════════════════════════════════════════════════════════╗
║     SUPERSYSTEM ENGINE v2.1 - Autonomous Self-Improving Framework     ║
║     7 Layers • 100% Target Pass Rate • Workflow Evaluations           ║
╚═══════════════════════════════════════════════════════════════════════╝${C.reset}
`);

  // Load all scenarios
  const allScenarios = layer3.getAllScenarios(50);  // 50 random scenarios
  log(`Loaded ${allScenarios.length} scenarios (including random)`, C.bright);
  
  let scenarioQueue = [...allScenarios];
  let cyclesSinceImprovement = 0;
  
  while (state.cycle < CONFIG.MAX_CYCLES && scenarioQueue.length > 0) {
    state.cycle++;
    console.log(`\n${C.bright}${'═'.repeat(70)}${C.reset}`);
    console.log(`${C.bright}CYCLE ${state.cycle}/${CONFIG.MAX_CYCLES} (${scenarioQueue.length} scenarios remaining)${C.reset}`);
    console.log(`${'═'.repeat(70)}`);
    
    // PHASE 1: Calibrate
    const calibrated = await calibrate();
    if (!calibrated) {
      log('⚠️  Calibration issues - continuing anyway...', C.yellow);
    }
    
    // PHASE 2: Execute
    const batch = scenarioQueue.splice(0, CONFIG.BATCH_SIZE);
    const results = await executeBatch(batch);
    
    // PHASE 3: Observe
    const observations = observe(results);
    
    // PHASE 4: Analyze (Gemini LLM)
    const analysisResult = await analyze(observations, results);
    
    // PHASE 5: Remediate
    const remediations = await remediate(analysisResult, observations);
    
    // PHASE 6: Verify
    let verifyResults = { improved: 0, stillFailing: 0 };
    if (observations.passRate < 1 && remediations.some(r => r.success)) {
      verifyResults = await verify(remediations, results);
    }
    
    // PHASE 7: Automate
    await automate(observations, remediations, verifyResults);
    
    // Check improvement
    if (observations.passRate === 1) {
      cyclesSinceImprovement = 0;
      log(`\n✓ Batch successful - continuing`, C.green);
    } else if (verifyResults.improved > 0) {
      cyclesSinceImprovement = 0;
      log(`\n↻ Improvements detected - continuing`, C.cyan);
    } else {
      cyclesSinceImprovement++;
      if (cyclesSinceImprovement >= CONFIG.MAX_CYCLES_WITHOUT_IMPROVEMENT) {
        log(`\n⚠️  ${CONFIG.MAX_CYCLES_WITHOUT_IMPROVEMENT} cycles without improvement - stopping`, C.yellow);
        break;
      }
    }
    
    await sleep(2000);
  }
  
  // Final Summary
  console.log(`\n${C.bright}${'═'.repeat(70)}${C.reset}`);
  console.log(`${C.bright}SUPERSYSTEM SESSION COMPLETE${C.reset}`);
  console.log(`${'═'.repeat(70)}`);
  
  log(`\nTotal Cycles: ${state.cycle}`, C.cyan);
  log(`Total Simulations: ${state.totalSimulations}`, C.cyan);
  log(`\nOutcomes:`, C.bright);
  log(`  ✓ Validated: ${state.outcomes.validated}`, C.green);
  log(`  ⚡ Gaps Discovered: ${state.outcomes.gaps}`, C.yellow);
  log(`  🐛 Bugs Found: ${state.outcomes.bugs}`, C.red);
  log(`  ↑ Improved: ${state.outcomes.improved}`, C.cyan);
  log(`  🤖 Auto-Fixed: ${state.outcomes.autoFixed}`, C.magenta);
  
  log(`\nResearch Triggered: ${state.researchTriggered.length}`, C.blue);
  log(`Auto-Fixes Applied: ${state.autoFixes.length}`, C.magenta);
  
  const passRate = state.outcomes.validated / state.totalSimulations;
  log(`\nFinal Pass Rate: ${(passRate * 100).toFixed(1)}%`, passRate === 1 ? C.green : C.yellow);
  
  const exitCode = passRate === 1 ? 0 : 1;
  log(`\n${exitCode === 0 ? '✓ 100% ACHIEVED!' : '⚠️ Target not reached'}`, exitCode === 0 ? C.green : C.yellow);
  
  process.exit(exitCode);
}

// Run
main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
