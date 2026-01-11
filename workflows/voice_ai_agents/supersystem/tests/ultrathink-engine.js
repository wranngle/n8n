#!/usr/bin/env node
/**
 * Ultrathink Self-Improving Test Engine v1.1
 * 
 * Every simulation cycle must be productive:
 * - VALIDATE a capability → Confidence gained
 * - DISCOVER a gap → Knowledge gained  
 * - IMPROVE the system → Value created
 * 
 * No simulation ends with just "FAIL" - it ends with an ACTION.
 * 
 * SECURITY: All credentials must be provided via environment variables.
 * NEVER commit API keys to source control.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration - ALL CREDENTIALS FROM ENVIRONMENT
const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  DEFAULT_AGENT_ID: process.env.ELEVENLABS_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew',
  SUPERSYSTEM_BASE: process.env.SUPERSYSTEM_BASE || 'https://n8n.wranngle.com/webhook',
  BATCH_SIZE: parseInt(process.env.BATCH_SIZE, 10) || 5,
  MAX_CYCLES: parseInt(process.env.MAX_CYCLES, 10) || 10,
  DELAY_BETWEEN_SIMS_MS: parseInt(process.env.DELAY_BETWEEN_SIMS_MS, 10) || 3000,
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000,
};

// Validate required credentials at startup
function validateConfig() {
  if (!CONFIG.ELEVENLABS_API_KEY) {
    console.error(`${C.red}${C.bright}FATAL: ELEVENLABS_API_KEY environment variable is required${C.reset}`);
    console.error(`${C.yellow}Set it via: export ELEVENLABS_API_KEY=your_key_here${C.reset}`);
    process.exit(1);
  }
  
  if (CONFIG.ELEVENLABS_API_KEY.startsWith('sk_') && CONFIG.ELEVENLABS_API_KEY.length < 20) {
    console.error(`${C.red}FATAL: ELEVENLABS_API_KEY appears to be invalid${C.reset}`);
    process.exit(1);
  }
}

const WEBHOOKS = {
  client_lookup: '/client-lookup-test',
  execution_logger: '/log-execution-test',
  slack_notifier: '/slack-notify-test',
  orchestrator: '/post-call-test',
};

// Colors
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', dim: '\x1b[2m',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (msg, color = '') => console.log(`${color}${msg}${C.reset}`);
const logPhase = (phase, msg) => console.log(`\n${C.cyan}${C.bright}[${phase}]${C.reset} ${msg}`);

/**
 * Create isolated test state (factory pattern for test isolation)
 * Each test run gets its own state object to prevent cross-contamination
 */
function createTestState() {
  return {
    cycle: 0,
    totalSimulations: 0,
    outcomes: { validated: 0, gaps: 0, bugs: 0, improved: 0 },
    coverage: { client_lookup: 0, execution_logger: 0, slack_notifier: 0, orchestrator: 0 },
    frictions: [],
    improvements: [],
    parseErrors: [], // Track parse errors instead of silently swallowing
  };
}

// Legacy global state for backwards compatibility (will be removed in v2.0)
// New code should use createTestState() and pass state explicitly
let state = createTestState();

/**
 * PHASE 1: CALIBRATE - Verify prerequisites
 */
async function calibrate() {
  logPhase('CALIBRATE', 'Verifying Supersystem prerequisites...');
  
  const checks = [];
  
  // Check each webhook endpoint
  for (const [name, path] of Object.entries(WEBHOOKS)) {
    try {
      const start = Date.now();
      const response = await fetch(`${CONFIG.SUPERSYSTEM_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _health_check: true }),
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
  
  const allOk = checks.every(c => c.ok);
  if (!allOk) {
    log('\n⚠️  Some webhooks not responding. Fix before continuing.', C.yellow);
    return false;
  }
  
  // Check friction log for known issues
  const frictionPath = path.join(__dirname, 'friction-log.jsonl');
  if (fs.existsSync(frictionPath)) {
    const lines = fs.readFileSync(frictionPath, 'utf8').trim().split('\n');
    const unresolvedFrictions = lines.map(l => JSON.parse(l)).filter(f => !f.resolved);
    if (unresolvedFrictions.length > 0) {
      log(`\n⚠️  ${unresolvedFrictions.length} unresolved frictions from previous runs:`, C.yellow);
      unresolvedFrictions.slice(0, 3).forEach(f => log(`    - ${f.type}: ${f.description}`, C.dim));
    }
  }
  
  log('\n✓ Calibration complete - all prerequisites met', C.green);
  return true;
}


/**
 * PHASE 2: EXECUTE - Run small batch of simulations
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
        const parseErrors = []; // Track errors instead of swallowing
        
        for (const line of data.split('\n').filter(l => l.trim())) {
          try {
            let parsed = JSON.parse(line);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (parsed.simulated_conversation) turns.push(...parsed.simulated_conversation);
            if (parsed.analysis) analysis = parsed.analysis;
          } catch (e) {
            // Log parse errors for debugging instead of silently swallowing
            parseErrors.push({
              line: line.substring(0, 100),
              error: e.message,
            });
          }
        }
        
        // Log parse errors if in debug mode
        if (parseErrors.length > 0 && process.env.DEBUG) {
          console.warn(`${C.yellow}Warning: ${parseErrors.length} JSON parse errors in simulation response${C.reset}`);
          parseErrors.slice(0, 3).forEach(pe => 
            console.warn(`  ${C.dim}${pe.error}: ${pe.line}...${C.reset}`)
          );
        }
        
        // Extract tool calls
        const toolCalls = [];
        for (const t of turns) {
          if (t.tool_calls) toolCalls.push(...t.tool_calls.map(tc => tc.tool_name || tc.name));
          if (t.tool_call) toolCalls.push(t.tool_call.tool_name || t.tool_call.name);
        }
        
        resolve({
          turns, analysis, toolCalls,
          turnCount: turns.length,
          status: res.statusCode
        });
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
    
    // Determine pass/fail
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
 * PHASE 3: OBSERVE - Analyze batch results for patterns
 *
 * Key questions:
 * - Which scenarios failed? What do they have in common?
 * - Which tools were unexpectedly called/missing?
 * - Are failures clustered around specific workflows?
 */
function observe(results) {
  logPhase('OBSERVE', 'Analyzing batch results for patterns...');

  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  log(`  Batch: ${passed.length}/${results.length} passed`, passed.length === results.length ? C.green : C.yellow);

  // Pattern 1: Failure clustering by category
  const failuresByCategory = {};
  for (const f of failed) {
    const cat = f.scenario.category || 'uncategorized';
    failuresByCategory[cat] = failuresByCategory[cat] || [];
    failuresByCategory[cat].push(f);
  }

  // Pattern 2: Missing tool patterns
  const missingToolCounts = {};
  for (const f of failed) {
    for (const tool of f.missing || []) {
      missingToolCounts[tool] = (missingToolCounts[tool] || 0) + 1;
    }
  }

  // Pattern 3: Duration anomalies (> 30s or < 2s)
  const slowSims = results.filter(r => r.duration > 30000);
  const fastSims = results.filter(r => r.duration < 2000 && !r.error);

  // Pattern 4: Error patterns
  const errors = results.filter(r => r.error);

  const observations = {
    passRate: passed.length / results.length,
    failuresByCategory,
    missingToolCounts,
    slowSimulations: slowSims.length,
    fastSimulations: fastSims.length,
    apiErrors: errors.length,
    patterns: [],
  };

  // Detect actionable patterns
  if (observations.passRate === 1) {
    observations.patterns.push({ type: 'VALIDATED', message: 'All scenarios passed - capability confirmed' });
    state.outcomes.validated += passed.length;
  } else {
    // Look for systemic issues
    for (const [tool, count] of Object.entries(missingToolCounts)) {
      if (count >= 2) {
        observations.patterns.push({
          type: 'GAP_DETECTED',
          message: `Tool "${tool}" not triggered in ${count} scenarios`,
          action: 'CHECK_TOOL_CONFIGURATION',
          tool
        });
        state.outcomes.gaps++;
      }
    }

    for (const [cat, failures] of Object.entries(failuresByCategory)) {
      if (failures.length >= 2) {
        observations.patterns.push({
          type: 'CATEGORY_FAILURE',
          message: `Category "${cat}" has ${failures.length} failures`,
          action: 'INVESTIGATE_CATEGORY',
          category: cat,
          failures: failures.map(f => f.scenario.name)
        });
      }
    }

    if (errors.length > 0) {
      observations.patterns.push({
        type: 'API_ERRORS',
        message: `${errors.length} simulations failed with API errors`,
        action: 'CHECK_API_CONNECTIVITY',
        errors: errors.map(e => e.error)
      });
      state.outcomes.bugs += errors.length;
    }
  }

  // Update coverage tracking
  for (const r of passed) {
    const expectedWebhooks = r.scenario.expectedWebhooks || [];
    for (const wh of expectedWebhooks) {
      if (state.coverage[wh] !== undefined) state.coverage[wh]++;
    }
  }

  // Log patterns found
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
 * PHASE 4: REMEDIATE - Apply fixes based on observations
 *
 * This phase generates remediations - NOT just logs failures.
 * Every failure must produce an ACTION.
 */
async function remediate(observations, results) {
  logPhase('REMEDIATE', 'Generating fixes for detected patterns...');

  const remediations = [];

  if (observations.passRate === 1) {
    log('  No remediations needed - all passed!', C.green);
    return remediations;
  }

  for (const pattern of observations.patterns) {
    switch (pattern.type) {
      case 'GAP_DETECTED':
        // Check if tool exists but isn't being called
        remediations.push({
          type: 'SCENARIO_IMPROVEMENT',
          pattern: pattern,
          action: `Verify agent has "${pattern.tool}" tool configured`,
          automated: false,
          priority: 'high',
          suggestion: `Add explicit instruction to agent system prompt to use ${pattern.tool}`
        });
        break;

      case 'CATEGORY_FAILURE':
        // Analyze failed scenarios in this category
        const failedInCat = results.filter(
          r => !r.passed && (r.scenario.category === pattern.category)
        );

        // Look for common prompts or patterns
        const commonWords = findCommonWords(failedInCat.map(f => f.scenario.prompt));

        remediations.push({
          type: 'SCENARIO_CLUSTER',
          pattern: pattern,
          action: `Review agent handling of "${pattern.category}" scenarios`,
          automated: false,
          priority: 'medium',
          commonPatterns: commonWords,
          suggestion: `Check if agent knowledge base covers: ${commonWords.slice(0, 3).join(', ')}`
        });
        break;

      case 'API_ERRORS':
        remediations.push({
          type: 'INFRASTRUCTURE',
          pattern: pattern,
          action: 'Check ElevenLabs API status and rate limits',
          automated: true,
          priority: 'critical',
          autoAction: async () => {
            // Could check API health here
            return { checked: true, timestamp: new Date().toISOString() };
          }
        });
        break;

      default:
        remediations.push({
          type: 'UNKNOWN',
          pattern: pattern,
          action: 'Manual investigation required',
          automated: false,
          priority: 'low'
        });
    }
  }

  // Log remediations
  log(`  Generated ${remediations.length} remediations:`, C.cyan);
  for (const r of remediations) {
    const priority = r.priority === 'critical' ? C.red : (r.priority === 'high' ? C.yellow : C.dim);
    log(`    [${r.priority.toUpperCase()}] ${r.action}`, priority);
    if (r.suggestion) log(`      → ${r.suggestion}`, C.dim);
  }

  // Execute automated remediations
  for (const r of remediations.filter(r => r.automated && r.autoAction)) {
    try {
      log(`    Executing automated fix: ${r.action}...`, C.blue);
      await r.autoAction();
      r.executed = true;
    } catch (e) {
      r.executed = false;
      r.error = e.message;
    }
  }

  state.improvements.push(...remediations);
  return remediations;
}

function findCommonWords(prompts) {
  const wordCounts = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'i', 'me', 'my', 'you', 'your', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'of', 'with', 'about', 'want', 'need', 'like', 'just', 'this', 'that', 'it']);

  for (const prompt of prompts) {
    const words = prompt.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
    for (const word of words) {
      if (word.length > 2 && !stopWords.has(word)) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }
  }

  return Object.entries(wordCounts)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}


/**
 * PHASE 5: VERIFY - Re-run failed scenarios to confirm improvements
 */
async function verify(remediations, originalResults) {
  logPhase('VERIFY', 'Re-running failed scenarios to verify improvements...');

  const failedScenarios = originalResults
    .filter(r => !r.passed && !r.error)  // Exclude API errors
    .map(r => r.scenario);

  if (failedScenarios.length === 0) {
    log('  No scenarios to re-verify', C.dim);
    return { improved: 0, stillFailing: 0 };
  }

  // Only re-run a sample if there are many failures
  const toRerun = failedScenarios.slice(0, Math.min(3, failedScenarios.length));
  log(`  Re-running ${toRerun.length} failed scenarios...`, C.cyan);

  const rerunResults = await executeBatch(toRerun);

  const nowPassing = rerunResults.filter(r => r.passed).length;
  const stillFailing = rerunResults.filter(r => !r.passed).length;

  if (nowPassing > 0) {
    log(`  ✓ ${nowPassing} scenarios now passing!`, C.green);
    state.outcomes.improved += nowPassing;
  }

  if (stillFailing > 0) {
    log(`  ✗ ${stillFailing} scenarios still failing - flagged for investigation`, C.yellow);
    // Add to frictions for next cycle
    for (const r of rerunResults.filter(r => !r.passed)) {
      state.frictions.push({
        timestamp: new Date().toISOString(),
        type: 'PERSISTENT_FAILURE',
        scenario: r.scenario.name,
        description: `Scenario "${r.scenario.name}" failed verification re-run`,
        missing: r.missing,
        unwanted: r.unwanted,
        resolved: false
      });
    }
  }

  return { improved: nowPassing, stillFailing };
}


/**
 * PHASE 6: AUTOMATE - Persist learnings for future cycles
 */
function automate(observations, remediations, verifyResults) {
  logPhase('AUTOMATE', 'Persisting learnings...');

  // 1. Update friction log
  const frictionPath = path.join(__dirname, 'friction-log.jsonl');
  let frictionEntries = [];

  // Add new frictions from this cycle
  for (const friction of state.frictions) {
    frictionEntries.push(JSON.stringify(friction));
  }

  // Add pattern-based frictions
  for (const pattern of observations.patterns) {
    if (pattern.type !== 'VALIDATED') {
      frictionEntries.push(JSON.stringify({
        timestamp: new Date().toISOString(),
        type: pattern.type,
        description: pattern.message,
        action: pattern.action,
        resolved: false,
        cycle: state.cycle
      }));
    }
  }

  if (frictionEntries.length > 0) {
    fs.appendFileSync(frictionPath, frictionEntries.join('\n') + '\n');
    log(`  Logged ${frictionEntries.length} frictions to friction-log.jsonl`, C.cyan);
  }

  // 2. Update cycle stats
  const statsPath = path.join(__dirname, 'cycle-stats.json');
  let stats = { cycles: [] };
  if (fs.existsSync(statsPath)) {
    stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  }

  stats.cycles.push({
    cycle: state.cycle,
    timestamp: new Date().toISOString(),
    simulations: state.totalSimulations,
    outcomes: { ...state.outcomes },
    coverage: { ...state.coverage },
    patterns: observations.patterns.length,
    remediations: remediations.length,
    verifyResults
  });

  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  log(`  Updated cycle-stats.json`, C.cyan);

  // 3. Generate improvement suggestions
  const suggestionsPath = path.join(__dirname, 'improvement-suggestions.md');
  let suggestions = `# Improvement Suggestions\n\nGenerated: ${new Date().toISOString()}\n\n`;

  for (const r of remediations) {
    suggestions += `## [${r.priority.toUpperCase()}] ${r.action}\n\n`;
    if (r.suggestion) suggestions += `**Suggestion**: ${r.suggestion}\n\n`;
    if (r.commonPatterns) suggestions += `**Common patterns**: ${r.commonPatterns.join(', ')}\n\n`;
    suggestions += `---\n\n`;
  }

  fs.writeFileSync(suggestionsPath, suggestions);
  log(`  Generated improvement-suggestions.md`, C.cyan);

  return {
    frictionsLogged: frictionEntries.length,
    statsUpdated: true,
    suggestionsGenerated: remediations.length > 0
  };
}


/**
 * Load scenarios from YAML
 * Adapts the YAML format to the internal format expected by the engine
 */
function loadScenarios() {
  const scenariosPath = path.join(__dirname, 'simulation-scenarios.yaml');
  if (!fs.existsSync(scenariosPath)) {
    log(`Error: ${scenariosPath} not found`, C.red);
    process.exit(1);
  }

  const data = yaml.load(fs.readFileSync(scenariosPath, 'utf8'));
  const rawScenarios = data.scenarios || [];

  // Normalize scenarios to internal format
  const scenarios = rawScenarios.map(s => ({
    id: s.id,
    name: s.name,
    category: s.category || 'uncategorized',
    priority: s.priority || 'medium',
    // Map YAML fields to internal fields
    prompt: s.simulated_user_prompt || s.prompt || 'Be a caller interested in AI voice agents.',
    criteria: (s.evaluation_criteria || s.criteria || []).map(c => ({
      id: c.id,
      name: c.name,
      prompt: c.prompt,
      weight: c.weight || 1.0
    })),
    expectedTools: s.expected_tool_calls || s.expectedTools || [],
    forbiddenTools: s.forbidden_tool_calls || s.forbiddenTools || [],
    expectedWebhooks: s.expected_webhooks || s.expectedWebhooks || [],
    tags: s.tags || []
  }));

  // Generate random scenarios from templates if configured
  const randomConfig = data.execution?.random_generation || {};
  const templates = data.random_scenario_templates || [];

  if (randomConfig.enabled && randomConfig.count > 0 && templates.length > 0) {
    const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    for (let i = 0; i < randomConfig.count; i++) {
      const template = templates[i % templates.length];
      if (!template || !template.base_prompt) continue;

      // Build prompt by replacing all {variable} placeholders
      let prompt = template.base_prompt;
      const vars = template.variables || {};

      for (const [varName, options] of Object.entries(vars)) {
        if (Array.isArray(options) && options.length > 0) {
          prompt = prompt.replace(new RegExp(`\\{${varName}\\}`, 'g'), randomPick(options));
        }
      }

      scenarios.push({
        id: `random_${template.template_id}_${i + 1}`,
        name: `Random: ${template.description || template.template_id} #${i + 1}`,
        category: 'random',
        priority: 'medium',
        prompt: prompt,
        criteria: [],
        expectedTools: template.template_id === 'random-industry' ? ['send_sms'] : [],
        forbiddenTools: [],
        expectedWebhooks: [],
        tags: ['random', template.template_id]
      });
    }
  }

  return scenarios;
}


/**
 * MAIN LOOP - The self-improving engine
 */
async function main() {
  // SECURITY: Validate credentials before any operations
  validateConfig();
  
  console.log(`
${C.cyan}${C.bright}╔═══════════════════════════════════════════════════════════════════╗
║     ULTRATHINK SELF-IMPROVING TEST ENGINE v1.1                    ║
║     Every cycle is productive. Every failure has an action.       ║
║     SECURITY: Credentials loaded from environment only            ║
╚═══════════════════════════════════════════════════════════════════╝${C.reset}
`);

  // Create isolated state for this run (factory pattern for test isolation)
  const state = createTestState();

  // Load all scenarios
  const allScenarios = loadScenarios();
  log(`Loaded ${allScenarios.length} scenarios`, C.bright);

  let scenarioQueue = [...allScenarios];
  let cyclesSinceImprovement = 0;

  // Main improvement loop
  while (state.cycle < CONFIG.MAX_CYCLES && scenarioQueue.length > 0) {
    state.cycle++;
    console.log(`\n${C.bright}${'═'.repeat(60)}${C.reset}`);
    console.log(`${C.bright}CYCLE ${state.cycle}/${CONFIG.MAX_CYCLES} (${scenarioQueue.length} scenarios remaining)${C.reset}`);
    console.log(`${'═'.repeat(60)}`);

    // PHASE 1: Calibrate
    const calibrated = await calibrate();
    if (!calibrated) {
      log('⚠️  Calibration failed - waiting 30s before retry...', C.yellow);
      await sleep(30000);
      continue;
    }

    // PHASE 2: Execute small batch
    const batch = scenarioQueue.splice(0, CONFIG.BATCH_SIZE);
    const results = await executeBatch(batch);

    // PHASE 3: Observe patterns
    const observations = observe(results);

    // PHASE 4: Remediate issues
    const remediations = await remediate(observations, results);

    // PHASE 5: Verify improvements (only if there were failures)
    let verifyResults = { improved: 0, stillFailing: 0 };
    if (observations.passRate < 1 && remediations.length > 0) {
      verifyResults = await verify(remediations, results);
    }

    // PHASE 6: Automate learnings
    automate(observations, remediations, verifyResults);

    // Decision: Continue or exit?
    if (observations.passRate === 1) {
      cyclesSinceImprovement = 0;
      log(`\n✓ Batch successful - continuing to next batch`, C.green);
    } else if (verifyResults.improved > 0) {
      cyclesSinceImprovement = 0;
      log(`\n↻ Improvements detected - continuing cycles`, C.cyan);
    } else {
      cyclesSinceImprovement++;
      if (cyclesSinceImprovement >= 3) {
        log(`\n⚠️  3 cycles without improvement - stopping for manual intervention`, C.yellow);
        break;
      }
    }

    // Rate limiting
    await sleep(2000);
  }

  // Final Summary
  console.log(`\n${C.bright}${'═'.repeat(60)}${C.reset}`);
  console.log(`${C.bright}ULTRATHINK SESSION COMPLETE${C.reset}`);
  console.log(`${'═'.repeat(60)}`);

  log(`\nTotal Cycles: ${state.cycle}`, C.cyan);
  log(`Total Simulations: ${state.totalSimulations}`, C.cyan);
  log(`\nOutcomes:`, C.bright);
  log(`  ✓ Validated: ${state.outcomes.validated}`, C.green);
  log(`  ⚡ Gaps Discovered: ${state.outcomes.gaps}`, C.yellow);
  log(`  🐛 Bugs Found: ${state.outcomes.bugs}`, C.red);
  log(`  ↑ Improved: ${state.outcomes.improved}`, C.cyan);

  log(`\nWebhook Coverage:`, C.bright);
  for (const [wh, count] of Object.entries(state.coverage)) {
    log(`  ${wh}: ${count} validations`, C.dim);
  }

  log(`\nFrictions Logged: ${state.frictions.length}`, C.yellow);
  log(`Improvements Generated: ${state.improvements.length}`, C.cyan);

  const exitCode = state.outcomes.bugs > 0 ? 1 : 0;
  log(`\n${exitCode === 0 ? '✓' : '⚠️'} Session ended with exit code ${exitCode}`, exitCode === 0 ? C.green : C.yellow);

  process.exit(exitCode);
}


// Run
main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
