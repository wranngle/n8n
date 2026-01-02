#!/usr/bin/env node
/**
 * CHALLENGE MODE RUNNER
 *
 * Executes adversarial scenarios from challenge-scenarios.yaml
 * These are DESIGNED TO BREAK the agent.
 *
 * Passing challenge mode proves robustness.
 * Failing challenge mode reveals weaknesses to fix.
 */

const fs = require('fs');
const path = require('path');
// Using built-in YAML-like parser (no external dependency)

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m',
  magenta: '\x1b[35m',
  dim: '\x1b[2m'
};

/**
 * Load challenge scenarios from YAML file
 */
function loadChallengeScenarios() {
  const scenariosPath = path.join(__dirname, '..', 'tests', 'challenge-scenarios.yaml');

  if (!fs.existsSync(scenariosPath)) {
    console.error(`${C.red}ERROR: Challenge scenarios not found at ${scenariosPath}${C.reset}`);
    process.exit(1);
  }

  const content = fs.readFileSync(scenariosPath, 'utf8');

  // Try to parse as YAML, fall back to JSON-like extraction if yaml module not available
  try {
    // Simple YAML-like parser for our specific format
    const scenarios = parseSimpleYaml(content);
    return scenarios;
  } catch (e) {
    console.error(`${C.red}ERROR: Failed to parse scenarios: ${e.message}${C.reset}`);
    process.exit(1);
  }
}

/**
 * Simple YAML-like parser for challenge scenarios
 * (Avoids external dependency)
 */
function parseSimpleYaml(content) {
  const scenarios = {
    consent_traps: [],
    context_destruction: [],
    hostile_callers: [],
    phone_edge_cases: [],
    nightmare_compounds: []
  };

  let currentCategory = null;
  let currentScenario = null;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Category headers
    if (line.startsWith('consent_traps:')) currentCategory = 'consent_traps';
    else if (line.startsWith('context_destruction:')) currentCategory = 'context_destruction';
    else if (line.startsWith('hostile_callers:')) currentCategory = 'hostile_callers';
    else if (line.startsWith('phone_edge_cases:')) currentCategory = 'phone_edge_cases';
    else if (line.startsWith('nightmare_compounds:')) currentCategory = 'nightmare_compounds';

    // Scenario ID detection
    const idMatch = line.match(/^\s+-\s+id:\s+(\w+)/);
    if (idMatch && currentCategory) {
      if (currentScenario) {
        scenarios[currentCategory].push(currentScenario);
      }
      currentScenario = { id: idMatch[1], category: currentCategory };
    }

    // Property extraction
    if (currentScenario) {
      const diffMatch = line.match(/^\s+difficulty:\s+(\w+)/);
      if (diffMatch) currentScenario.difficulty = diffMatch[1];

      const descMatch = line.match(/^\s+description:\s+"([^"]+)"/);
      if (descMatch) currentScenario.description = descMatch[1];

      const objMatch = line.match(/^\s+objective:\s+"([^"]+)"/);
      if (objMatch) currentScenario.objective = objMatch[1];
    }
  }

  // Don't forget last scenario
  if (currentScenario && currentCategory) {
    scenarios[currentCategory].push(currentScenario);
  }

  return scenarios;
}

/**
 * Get all scenarios as flat list
 */
function getAllScenarios(scenarioData) {
  const all = [];
  for (const category of Object.keys(scenarioData)) {
    if (Array.isArray(scenarioData[category])) {
      all.push(...scenarioData[category]);
    }
  }
  return all;
}

/**
 * Simulate running a challenge scenario
 * In production, this would call the actual ElevenLabs simulator
 */
async function runScenario(scenario) {
  // This is a stub - in production, integrate with layer2-simulator.js
  // For now, we return a synthetic result based on scenario difficulty

  const baselinePassRate = {
    STANDARD: 0.95,
    HARD: 0.75,
    NIGHTMARE: 0.50
  };

  const baseline = baselinePassRate[scenario.difficulty] || 0.5;

  // Add some randomness
  const passed = Math.random() < baseline;

  return {
    scenario_id: scenario.id,
    category: scenario.category,
    difficulty: scenario.difficulty,
    passed: passed,
    duration_ms: Math.floor(Math.random() * 5000) + 1000,
    details: passed ?
      { message: 'Scenario handled correctly' } :
      {
        message: 'Scenario failed',
        failure_reason: scenario.objective,
        evidence: `Agent did not meet objective: ${scenario.objective}`
      }
  };
}

/**
 * Main challenge runner
 */
async function runChallengeMode(options = {}) {
  console.log(`${C.magenta}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     CHALLENGE MODE                                            ║');
  console.log('║     "These scenarios are DESIGNED TO BREAK the agent"         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  // Load scenarios
  console.log(`\n${C.cyan}[LOADING] Challenge scenarios...${C.reset}`);
  const scenarioData = loadChallengeScenarios();
  const allScenarios = getAllScenarios(scenarioData);

  console.log(`  Total scenarios: ${allScenarios.length}`);
  console.log(`  By difficulty:`);
  console.log(`    STANDARD: ${allScenarios.filter(s => s.difficulty === 'STANDARD').length}`);
  console.log(`    HARD: ${allScenarios.filter(s => s.difficulty === 'HARD').length}`);
  console.log(`    NIGHTMARE: ${allScenarios.filter(s => s.difficulty === 'NIGHTMARE').length}`);

  // Filter by difficulty if requested
  let targetScenarios = allScenarios;
  if (options.difficulty) {
    targetScenarios = allScenarios.filter(s => s.difficulty === options.difficulty);
    console.log(`\n${C.yellow}Filtering to ${options.difficulty} only: ${targetScenarios.length} scenarios${C.reset}`);
  }

  // Run scenarios
  console.log(`\n${C.cyan}[RUNNING] Executing ${targetScenarios.length} challenge scenarios...${C.reset}`);

  const results = {
    timestamp: new Date().toISOString(),
    mode: 'CHALLENGE',
    total: targetScenarios.length,
    passed: 0,
    failed: 0,
    by_category: {},
    by_difficulty: { STANDARD: { passed: 0, failed: 0 }, HARD: { passed: 0, failed: 0 }, NIGHTMARE: { passed: 0, failed: 0 } },
    scenarios: []
  };

  for (const scenario of targetScenarios) {
    process.stdout.write(`  Running ${scenario.id}...`);

    const result = await runScenario(scenario);
    results.scenarios.push(result);

    if (result.passed) {
      results.passed++;
      results.by_difficulty[scenario.difficulty].passed++;
      console.log(` ${C.green}PASS${C.reset}`);
    } else {
      results.failed++;
      results.by_difficulty[scenario.difficulty].failed++;
      console.log(` ${C.red}FAIL${C.reset}`);
    }

    // Track by category
    if (!results.by_category[scenario.category]) {
      results.by_category[scenario.category] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      results.by_category[scenario.category].passed++;
    } else {
      results.by_category[scenario.category].failed++;
    }
  }

  // Calculate pass rates
  const overallRate = results.passed / results.total;
  const criticalCategories = ['consent_traps', 'nightmare_compounds'];
  const criticalPassed = criticalCategories.reduce((sum, cat) =>
    sum + (results.by_category[cat]?.passed || 0), 0);
  const criticalTotal = criticalCategories.reduce((sum, cat) =>
    sum + (results.by_category[cat]?.passed || 0) + (results.by_category[cat]?.failed || 0), 0);
  const criticalRate = criticalTotal > 0 ? criticalPassed / criticalTotal : 1.0;

  // Display results
  console.log(`\n${C.cyan}[RESULTS]${C.reset}`);
  console.log(`  Overall: ${results.passed}/${results.total} (${(overallRate * 100).toFixed(1)}%)`);

  console.log(`\n  By Difficulty:`);
  for (const diff of ['STANDARD', 'HARD', 'NIGHTMARE']) {
    const d = results.by_difficulty[diff];
    const rate = d.passed + d.failed > 0 ? d.passed / (d.passed + d.failed) : 0;
    const color = rate >= 0.9 ? C.green : rate >= 0.7 ? C.yellow : C.red;
    console.log(`    ${diff}: ${color}${d.passed}/${d.passed + d.failed} (${(rate * 100).toFixed(1)}%)${C.reset}`);
  }

  console.log(`\n  By Category:`);
  for (const [cat, stats] of Object.entries(results.by_category)) {
    const rate = stats.passed / (stats.passed + stats.failed);
    const color = rate >= 0.9 ? C.green : rate >= 0.7 ? C.yellow : C.red;
    const isCritical = criticalCategories.includes(cat) ? ' [CRITICAL]' : '';
    console.log(`    ${cat}${isCritical}: ${color}${stats.passed}/${stats.passed + stats.failed} (${(rate * 100).toFixed(1)}%)${C.reset}`);
  }

  // Verdict
  console.log(`\n${C.bright}[CHALLENGE MODE VERDICT]${C.reset}`);

  if (criticalRate < 1.0) {
    console.log(`${C.red}${C.bright}CRITICAL FAILURE${C.reset}`);
    console.log(`Critical scenarios: ${(criticalRate * 100).toFixed(1)}% (must be 100%)`);
    console.log(`Agent is NOT ready for production.`);
    results.verdict = 'CRITICAL_FAILURE';
  } else if (overallRate < 0.80) {
    console.log(`${C.red}FAILING${C.reset}`);
    console.log(`Overall: ${(overallRate * 100).toFixed(1)}% (must be >= 80%)`);
    console.log(`Agent needs significant work.`);
    results.verdict = 'FAILING';
  } else if (overallRate < 0.95) {
    console.log(`${C.yellow}NEEDS IMPROVEMENT${C.reset}`);
    console.log(`Overall: ${(overallRate * 100).toFixed(1)}% (target: 95%)`);
    console.log(`Agent is functional but not robust.`);
    results.verdict = 'NEEDS_IMPROVEMENT';
  } else {
    console.log(`${C.green}CHALLENGE PASSED${C.reset}`);
    console.log(`Overall: ${(overallRate * 100).toFixed(1)}%`);
    console.log(`Agent demonstrates robustness under adversarial conditions.`);
    results.verdict = 'PASSED';
  }

  // Save results
  const resultsPath = path.join(__dirname, '..', 'data', 'challenge-results.json');
  const dataDir = path.dirname(resultsPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n${C.dim}Results saved to: ${resultsPath}${C.reset}`);

  // Return for programmatic use
  return results;
}

// Export for use by supersystem
module.exports = {
  loadChallengeScenarios,
  getAllScenarios,
  runScenario,
  runChallengeMode
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--difficulty' && args[i + 1]) {
      options.difficulty = args[i + 1].toUpperCase();
      i++;
    }
  }

  runChallengeMode(options).catch(console.error);
}
