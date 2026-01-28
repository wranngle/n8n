#!/usr/bin/env node
/**
 * Sarah v2.0 Evaluation Runner
 * Runs simulation tests against Sarah agent and validates v2.0 requirements
 *
 * Usage: node scripts/run-sarah-v2-eval.js [--scenario <id>] [--category <name>] [--critical-only]
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const AGENT_ID = 'agent_xxxx_demo';
const API_BASE = 'https://api.elevenlabs.io/v1';

// Load API key from multiple sources
function loadApiKey() {
  // Check environment first
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;

  // Check .claude.json (Claude Code MCP config)
  const claudeJsonPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude.json');
  try {
    const claudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf-8'));
    if (claudeJson.projects) {
      for (const [key, value] of Object.entries(claudeJson.projects)) {
        if (value?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY) {
          return value.mcpServers.elevenlabs.env.ELEVENLABS_API_KEY;
        }
      }
    }
  } catch {}

  // Check ~/.claude/.env
  const claudeEnvPath = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', '.env');
  try {
    const content = fs.readFileSync(claudeEnvPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('ELEVENLABS_API_KEY=')) {
        return trimmed.split('=').slice(1).join('=').trim();
      }
    }
  } catch {}

  return null;
}

const API_KEY = loadApiKey();

// Parse command line args
const args = process.argv.slice(2);
const scenarioFilter = args.includes('--scenario') ? args[args.indexOf('--scenario') + 1] : null;
const categoryFilter = args.includes('--category') ? args[args.indexOf('--category') + 1] : null;
const criticalOnly = args.includes('--critical-only');
const dryRun = args.includes('--dry-run');

async function loadScenarios() {
  const scenariosPath = path.join(__dirname, '..', 'workflows', 'voice_ai_agents', 'test-scenarios-sarah-v2.yaml');
  const content = fs.readFileSync(scenariosPath, 'utf8');
  return yaml.parse(content);
}

async function loadEvalConfig() {
  const evalPath = path.join(__dirname, '..', 'workflows', 'dev', 'evaluations', 'sarah-v2-eval.yaml');
  const content = fs.readFileSync(evalPath, 'utf8');
  return yaml.parse(content);
}

async function simulateConversation(scenario, settings) {
  const url = `${API_BASE}/convai/agents/${AGENT_ID}/simulate_conversation`;

  // Build evaluation criteria
  const evaluationCriteria = scenario.evaluation_criteria.map(c => ({
    id: c.id,
    name: c.name,
    prompt: c.prompt,
    type: "prompt"
  }));

  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: scenario.simulated_user_prompt,
        first_message_mode: "simulate_user_input",
        max_turns: settings.max_turns || 15
      },
      extra_body: {
        dynamic_variables: scenario.dynamic_variables || {}
      },
      evaluation_criteria: evaluationCriteria
    }
  };

  if (dryRun) {
    console.log(`[DRY-RUN] Would simulate: ${scenario.name}`);
    console.log(`  Dynamic vars: ${JSON.stringify(scenario.dynamic_variables || {})}`);
    return { dry_run: true, scenario_id: scenario.id };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return await response.json();
  } catch (error) {
    return { error: error.message, scenario_id: scenario.id };
  }
}

function evaluateResults(scenario, results) {
  if (results.error) {
    return {
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      category: scenario.category,
      passed: false,
      error: results.error,
      criteria_results: []
    };
  }

  if (results.dry_run) {
    return {
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      category: scenario.category,
      passed: null,
      dry_run: true,
      criteria_results: []
    };
  }

  const criteriaResults = [];
  let totalWeight = 0;
  let passedWeight = 0;

  const evaluationResults = results.evaluation?.evaluation_criteria_results || [];

  for (const criterion of scenario.evaluation_criteria) {
    const result = evaluationResults.find(r => r.criteria_id === criterion.id);
    const passed = result?.result === 'success';
    const weight = criterion.weight || 1.0;

    criteriaResults.push({
      id: criterion.id,
      name: criterion.name,
      passed,
      weight,
      severity: criterion.severity || 'normal',
      rationale: result?.rationale || 'No rationale provided'
    });

    totalWeight += weight;
    if (passed) passedWeight += weight;
  }

  const score = totalWeight > 0 ? passedWeight / totalWeight : 0;
  const hasCriticalFailure = criteriaResults.some(c => c.severity === 'critical' && !c.passed);

  return {
    scenario_id: scenario.id,
    scenario_name: scenario.name,
    category: scenario.category,
    priority: scenario.priority,
    passed: score >= 0.8 && !hasCriticalFailure,
    score,
    critical_failure: hasCriticalFailure,
    criteria_results: criteriaResults,
    transcript: results.transcript || [],
    tool_calls: results.tool_calls || []
  };
}

function generateReport(results, evalConfig) {
  const report = {
    timestamp: new Date().toISOString(),
    agent_id: AGENT_ID,
    agent_name: evalConfig.agent_name,
    summary: {
      total_scenarios: results.length,
      passed: results.filter(r => r.passed === true).length,
      failed: results.filter(r => r.passed === false).length,
      dry_run: results.filter(r => r.dry_run).length,
      critical_failures: results.filter(r => r.critical_failure).length
    },
    by_category: {},
    by_priority: {},
    detailed_results: results
  };

  // Aggregate by category
  for (const result of results) {
    if (!report.by_category[result.category]) {
      report.by_category[result.category] = { passed: 0, failed: 0, total: 0 };
    }
    report.by_category[result.category].total++;
    if (result.passed === true) report.by_category[result.category].passed++;
    if (result.passed === false) report.by_category[result.category].failed++;
  }

  // Aggregate by priority
  for (const result of results) {
    const priority = result.priority || 'medium';
    if (!report.by_priority[priority]) {
      report.by_priority[priority] = { passed: 0, failed: 0, total: 0 };
    }
    report.by_priority[priority].total++;
    if (result.passed === true) report.by_priority[priority].passed++;
    if (result.passed === false) report.by_priority[priority].failed++;
  }

  // Calculate overall score
  const passRate = report.summary.total_scenarios > 0
    ? report.summary.passed / (report.summary.total_scenarios - report.summary.dry_run)
    : 0;

  report.summary.pass_rate = passRate;
  report.summary.overall_passed = passRate >= evalConfig.thresholds.overall_pass && report.summary.critical_failures === 0;

  return report;
}

async function main() {
  console.log('='.repeat(60));
  console.log('SARAH v2.0 EVALUATION RUNNER');
  console.log('='.repeat(60));
  console.log();

  if (!API_KEY && !dryRun) {
    console.error('ERROR: ELEVENLABS_API_KEY environment variable not set');
    process.exit(1);
  }

  const scenariosConfig = await loadScenarios();
  const evalConfig = await loadEvalConfig();

  let scenarios = scenariosConfig.scenarios;

  // Apply filters
  if (scenarioFilter) {
    scenarios = scenarios.filter(s => s.id === scenarioFilter);
    console.log(`Filtered to scenario: ${scenarioFilter}`);
  }
  if (categoryFilter) {
    scenarios = scenarios.filter(s => s.category === categoryFilter);
    console.log(`Filtered to category: ${categoryFilter}`);
  }
  if (criticalOnly) {
    scenarios = scenarios.filter(s => s.priority === 'critical');
    console.log('Filtered to critical scenarios only');
  }

  console.log(`Running ${scenarios.length} scenarios against agent ${AGENT_ID}`);
  console.log();

  const results = [];
  const batchSize = evalConfig.execution?.batch_size || 3;
  const batchDelay = evalConfig.execution?.batch_delay_ms || 2000;

  for (let i = 0; i < scenarios.length; i += batchSize) {
    const batch = scenarios.slice(i, i + batchSize);

    console.log(`--- Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(scenarios.length/batchSize)} ---`);

    for (const scenario of batch) {
      console.log(`Running: ${scenario.name}...`);

      const simResult = await simulateConversation(scenario, scenariosConfig.simulation_settings);
      const evalResult = evaluateResults(scenario, simResult);
      results.push(evalResult);

      const status = evalResult.dry_run ? '⏸️ DRY-RUN' :
                     evalResult.passed ? '✅ PASSED' :
                     evalResult.critical_failure ? '🔴 CRITICAL FAIL' : '❌ FAILED';

      console.log(`  ${status} (score: ${evalResult.score?.toFixed(2) || 'N/A'})`);

      if (!evalResult.passed && !evalResult.dry_run) {
        const failures = evalResult.criteria_results.filter(c => !c.passed);
        for (const f of failures.slice(0, 3)) {
          console.log(`    - ${f.name}: ${f.rationale?.substring(0, 80)}...`);
        }
      }
    }

    if (i + batchSize < scenarios.length) {
      console.log(`Waiting ${batchDelay}ms before next batch...`);
      await new Promise(r => setTimeout(r, batchDelay));
    }
  }

  console.log();
  console.log('='.repeat(60));
  console.log('EVALUATION REPORT');
  console.log('='.repeat(60));
  console.log();

  const report = generateReport(results, evalConfig);

  console.log(`Total Scenarios: ${report.summary.total_scenarios}`);
  console.log(`Passed: ${report.summary.passed}`);
  console.log(`Failed: ${report.summary.failed}`);
  console.log(`Critical Failures: ${report.summary.critical_failures}`);
  console.log(`Pass Rate: ${(report.summary.pass_rate * 100).toFixed(1)}%`);
  console.log();

  console.log('By Category:');
  for (const [cat, stats] of Object.entries(report.by_category)) {
    console.log(`  ${cat}: ${stats.passed}/${stats.total} passed`);
  }
  console.log();

  console.log('By Priority:');
  for (const [priority, stats] of Object.entries(report.by_priority)) {
    console.log(`  ${priority}: ${stats.passed}/${stats.total} passed`);
  }
  console.log();

  const overallStatus = report.summary.overall_passed ? '✅ OVERALL: PASSED' : '❌ OVERALL: FAILED';
  console.log(overallStatus);
  console.log();

  // Save report
  const reportPath = path.join(__dirname, '..', 'workflows', 'voice_ai_agents', 'supersystem', 'tests', `sarah-v2-eval-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${reportPath}`);

  process.exit(report.summary.overall_passed ? 0 : 1);
}

main().catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
