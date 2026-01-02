#!/usr/bin/env node
/**
 * Supersystem Integration Tester v1.0
 * 
 * Uses ElevenLabs simulate-conversation API to run real voice agent simulations
 * against the Supersystem webhook infrastructure.
 * 
 * Features:
 * - Runs defined scenarios from YAML
 * - Generates random novel scenarios from templates
 * - Validates tool calls (send_sms, etc.)
 * - Evaluates conversation quality
 * - Reports detailed pass/fail with reasoning
 * 
 * Usage:
 *   node run-simulations.js                    # Run all scenarios
 *   node run-simulations.js --random 100       # Run 100 random scenarios
 *   node run-simulations.js --category pre_call_integration
 *   node run-simulations.js --priority critical
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration (env vars for CI/CD, fallback for local dev)
const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY || 'sk_733d2a2707d99f6bcdb9cc330570deea72390b20b6b2915e',
  DEFAULT_AGENT_ID: process.env.SARAH_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew',
  MAX_RETRIES: 2,
  INITIAL_DELAY_MS: 5000,
  DELAY_BETWEEN_SCENARIOS_MS: 5000,
};

// ANSI colors
const C = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Load scenarios from YAML
 */
function loadScenarios(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return yaml.load(content);
}

/**
 * Generate random scenarios from templates
 */
function generateRandomScenarios(templates, count, seed = null) {
  const scenarios = [];
  const random = seed !== null 
    ? () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    : Math.random;
  
  const pick = (arr) => arr[Math.floor(random() * arr.length)];
  
  for (let i = 0; i < count; i++) {
    const template = pick(templates);
    let prompt = template.base_prompt;
    
    // Replace variables
    for (const [varName, options] of Object.entries(template.variables || {})) {
      const value = pick(options);
      prompt = prompt.replace(new RegExp(`{${varName}}`, 'g'), value);
    }
    
    scenarios.push({
      id: `random-${template.template_id}-${i + 1}`,
      name: `Random: ${template.description} #${i + 1}`,
      category: 'random_generated',
      priority: 'medium',
      simulated_user_prompt: prompt.trim(),
      expected_tool_calls: [],
      evaluation_criteria: [
        { id: 'natural_flow', name: 'Natural conversation', prompt: 'The conversation felt natural and appropriate.' },
        { id: 'professional', name: 'Professional handling', prompt: 'The agent remained professional throughout.' },
      ]
    });
  }
  
  return scenarios;
}


/**
 * Make streaming request to ElevenLabs simulate-conversation API
 */
function makeStreamingRequest(agentId, payload) {
  return new Promise((resolve, reject) => {
    const url = `https://api.elevenlabs.io/v1/convai/agents/${agentId}/simulate-conversation/stream`;
    let fullData = '';
    
    const options = {
      method: 'POST',
      headers: {
        'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      res.on('data', chunk => { fullData += chunk.toString(); });
      
      res.on('end', () => {
        // Parse streaming response - each line is a JSON object
        const allTurns = [];
        let lastAnalysis = null;
        
        const lines = fullData.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            let parsed = JSON.parse(line);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            
            if (parsed.simulated_conversation) {
              allTurns.push(...parsed.simulated_conversation);
            }
            if (parsed.analysis) {
              lastAnalysis = parsed.analysis;
            }
          } catch (e) { /* skip unparseable */ }
        }
        
        if (allTurns.length > 0) {
          resolve({
            status: res.statusCode,
            body: { transcript: allTurns, evaluation: lastAnalysis || {}, raw: null }
          });
        } else {
          resolve({ status: res.statusCode, body: { raw: fullData, transcript: [], evaluation: {} } });
        }
      });
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Run a single simulation scenario
 */
async function runSimulation(scenario, agentId, settings, retryCount = 0) {
  const startTime = Date.now();
  
  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: {
          prompt: scenario.simulated_user_prompt,
          llm: settings.llm || 'gemini-2.0-flash',
          temperature: settings.temperature || 0.8
        }
      }
    },
    extra_evaluation_criteria: (scenario.evaluation_criteria || []).map(c => ({
      id: c.id,
      name: c.name,
      conversation_goal_prompt: c.prompt,
      use_knowledge_base: false
    })),
    new_turns_limit: settings.max_turns || 25
  };
  
  try {
    const response = await makeStreamingRequest(agentId, payload);
    const duration = Date.now() - startTime;
    
    // Retry on 500 errors
    if (response.status === 500 && retryCount < CONFIG.MAX_RETRIES) {
      const delay = CONFIG.INITIAL_DELAY_MS * Math.pow(2, retryCount);
      console.log(`    ⏳ Retrying in ${delay/1000}s (attempt ${retryCount + 1})...`);
      await sleep(delay);
      return runSimulation(scenario, agentId, settings, retryCount + 1);
    }
    
    if (response.status !== 200) {
      return {
        scenario_id: scenario.id, scenario_name: scenario.name,
        category: scenario.category, priority: scenario.priority,
        status: 'error', error: `HTTP ${response.status}`,
        overall_passed: false, duration_ms: duration, retries: retryCount
      };
    }
    
    const result = response.body;
    
    // Extract tool calls from transcript
    const toolCalls = [];
    for (const turn of (result.transcript || [])) {
      if (turn.tool_calls) {
        for (const call of turn.tool_calls) {
          toolCalls.push(call.tool_name || call.name || call.tool);
        }
      }
      if (turn.tool_call) {
        toolCalls.push(turn.tool_call.tool_name || turn.tool_call.name);
      }
      if (turn.role === 'tool' && turn.tool_name) {
        toolCalls.push(turn.tool_name);
      }
    }
    
    // Validate tool calls
    const expected = scenario.expected_tool_calls || [];
    const forbidden = scenario.forbidden_tool_calls || [];
    const missing = expected.filter(t => !toolCalls.includes(t));
    const unwanted = forbidden.filter(t => toolCalls.includes(t));
    const toolValidationPassed = missing.length === 0 && unwanted.length === 0;
    
    // Parse evaluation criteria results
    const evaluations = {};
    let allCriteriaPassed = true;
    
    if (result.evaluation?.criteria_results) {
      for (const [id, data] of Object.entries(result.evaluation.criteria_results)) {
        const passed = data.passed || data.result === 'passed' || data.result === true;
        evaluations[id] = {
          name: data.name || id,
          passed,
          reasoning: (data.reasoning || data.explanation || '').substring(0, 200)
        };
        if (!passed) allCriteriaPassed = false;
      }
    }
    
    return {
      scenario_id: scenario.id,
      scenario_name: scenario.name,
      category: scenario.category,
      priority: scenario.priority,
      status: 'completed',
      overall_passed: toolValidationPassed && allCriteriaPassed,
      tool_validation: {
        passed: toolValidationPassed,
        expected, forbidden, actual: toolCalls, missing, unwanted
      },
      evaluations,
      turn_count: result.transcript?.length || 0,
      duration_ms: duration,
      retries: retryCount,
      transcript: result.transcript?.map(t => ({
        role: t.role,
        message: t.message?.substring(0, 300),
        tool_calls: t.tool_calls?.map(tc => tc.tool_name) || []
      })).filter(t => t.message || t.tool_calls.length)
    };
    
  } catch (error) {
    if (retryCount < CONFIG.MAX_RETRIES) {
      await sleep(CONFIG.INITIAL_DELAY_MS * Math.pow(2, retryCount));
      return runSimulation(scenario, agentId, settings, retryCount + 1);
    }
    return {
      scenario_id: scenario.id, scenario_name: scenario.name,
      category: scenario.category, priority: scenario.priority,
      status: 'error', error: error.message,
      overall_passed: false, duration_ms: Date.now() - startTime, retries: retryCount
    };
  }
}


/**
 * Print result with formatting
 */
function printResult(result, verbose = false) {
  const icon = result.overall_passed ? `${C.green}✅` : `${C.red}❌`;
  const status = result.overall_passed ? 'PASS' : 'FAIL';
  const prioColor = { critical: C.red, high: C.yellow, medium: C.blue, low: C.cyan }[result.priority] || '';
  
  console.log(`\n${icon} ${status}${C.reset} [${prioColor}${result.priority}${C.reset}] ${result.scenario_name}`);
  console.log(`   Duration: ${result.duration_ms}ms | Turns: ${result.turn_count || 0}${result.retries ? ` | Retries: ${result.retries}` : ''}`);
  
  if (result.status === 'error') {
    console.log(`   ${C.red}Error: ${result.error}${C.reset}`);
    return;
  }
  
  // Tool validation
  if (result.tool_validation) {
    const tv = result.tool_validation;
    if (!tv.passed) {
      if (tv.missing.length) console.log(`   ${C.red}Missing tools: ${tv.missing.join(', ')}${C.reset}`);
      if (tv.unwanted.length) console.log(`   ${C.red}Forbidden tools called: ${tv.unwanted.join(', ')}${C.reset}`);
    }
    if (tv.actual.length) {
      console.log(`   Tools called: ${tv.actual.join(', ')}`);
    }
  }
  
  // Evaluation criteria
  if (verbose && result.evaluations && Object.keys(result.evaluations).length) {
    console.log('   Evaluations:');
    for (const [id, ev] of Object.entries(result.evaluations)) {
      const evIcon = ev.passed ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
      console.log(`     ${evIcon} ${ev.name}`);
      if (!ev.passed && ev.reasoning) {
        console.log(`       ${C.dim}${ev.reasoning}${C.reset}`);
      }
    }
  }
}

/**
 * Print summary
 */
function printSummary(results, startTime) {
  const passed = results.filter(r => r.overall_passed).length;
  const failed = results.filter(r => !r.overall_passed && r.status !== 'error').length;
  const errors = results.filter(r => r.status === 'error').length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  
  const byCategory = {};
  for (const r of results) {
    const cat = r.category || 'unknown';
    if (!byCategory[cat]) byCategory[cat] = { passed: 0, failed: 0 };
    if (r.overall_passed) byCategory[cat].passed++;
    else byCategory[cat].failed++;
  }
  
  console.log('\n' + '═'.repeat(70));
  console.log(`${C.bright}${C.cyan}                    SUPERSYSTEM SIMULATION RESULTS${C.reset}`);
  console.log('═'.repeat(70));
  console.log(`Total: ${total}  |  ${C.green}Passed: ${passed}${C.reset}  |  ${C.red}Failed: ${failed}${C.reset}  |  ${C.yellow}Errors: ${errors}${C.reset}  |  Rate: ${successRate}%`);
  console.log(`Elapsed: ${elapsed}s`);
  console.log('─'.repeat(70));
  console.log('By Category:');
  for (const [cat, stats] of Object.entries(byCategory)) {
    const catRate = Math.round((stats.passed / (stats.passed + stats.failed)) * 100);
    console.log(`  ${cat}: ${stats.passed}/${stats.passed + stats.failed} (${catRate}%)`);
  }
  console.log('═'.repeat(70));
  
  if (successRate >= 90) {
    console.log(`\n${C.green}${C.bright}✅ EXCELLENT - ${successRate}% success rate${C.reset}\n`);
  } else if (successRate >= 80) {
    console.log(`\n${C.green}✅ HEALTHY - ${successRate}% success rate${C.reset}\n`);
  } else if (successRate >= 50) {
    console.log(`\n${C.yellow}⚠️  WARNING - ${successRate}% success rate${C.reset}\n`);
  } else {
    console.log(`\n${C.red}❌ CRITICAL - ${successRate}% success rate${C.reset}\n`);
  }
  
  // List failures
  const failures = results.filter(r => !r.overall_passed);
  if (failures.length > 0 && failures.length <= 10) {
    console.log('Failed scenarios:');
    for (const f of failures) {
      const reason = f.status === 'error' ? f.error 
        : f.tool_validation?.missing?.length ? `Missing: ${f.tool_validation.missing.join(', ')}`
        : 'Evaluation criteria failed';
      console.log(`  - ${f.scenario_id}: ${reason}`);
    }
  }
  
  return passed === total ? 0 : 1;
}

/**
 * Parse CLI arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { category: null, priority: null, random: 0, verbose: false, id: null };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--category': case '-c': opts.category = args[++i]; break;
      case '--priority': case '-p': opts.priority = args[++i]; break;
      case '--random': case '-r': opts.random = parseInt(args[++i]) || 50; break;
      case '--verbose': case '-v': opts.verbose = true; break;
      case '--id': opts.id = args[++i]; break;
      case '--help': case '-h':
        console.log(`
Supersystem Simulation Tester v1.0

Usage:
  node run-simulations.js [options]

Options:
  --category, -c <name>   Filter by category
  --priority, -p <level>  Filter by priority (critical, high, medium, low)
  --random, -r <count>    Generate and run N random scenarios
  --id <scenario-id>      Run a specific scenario by ID
  --verbose, -v           Show detailed evaluation results
  --help, -h              Show this help
`);
        process.exit(0);
    }
  }
  return opts;
}

/**
 * Main entry point
 */
async function main() {
  const startTime = Date.now();
  const opts = parseArgs();
  
  console.log(`\n${C.cyan}${C.bright}╔════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.cyan}${C.bright}║     SUPERSYSTEM INTEGRATION TESTER v1.0                            ║${C.reset}`);
  console.log(`${C.cyan}${C.bright}║     ElevenLabs simulate-conversation API                           ║${C.reset}`);
  console.log(`${C.cyan}${C.bright}╚════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
  
  // Load scenarios
  const scenariosPath = path.join(__dirname, 'simulation-scenarios.yaml');
  if (!fs.existsSync(scenariosPath)) {
    console.error(`${C.red}Error: simulation-scenarios.yaml not found${C.reset}`);
    process.exit(1);
  }
  
  const data = loadScenarios(scenariosPath);
  let scenarios = data.scenarios || [];
  const settings = data.simulation_settings || {};
  const agentId = data.default_agent_id || CONFIG.DEFAULT_AGENT_ID;
  
  console.log(`Agent: ${agentId}`);
  console.log(`Loaded ${scenarios.length} defined scenarios`);
  
  // Generate random scenarios if requested
  if (opts.random > 0 && data.random_scenario_templates) {
    const randomScenarios = generateRandomScenarios(data.random_scenario_templates, opts.random);
    scenarios = [...scenarios, ...randomScenarios];
    console.log(`Generated ${opts.random} random scenarios`);
  }
  
  // Apply filters
  if (opts.id) {
    scenarios = scenarios.filter(s => s.id === opts.id);
  }
  if (opts.category) {
    scenarios = scenarios.filter(s => s.category === opts.category);
  }
  if (opts.priority) {
    scenarios = scenarios.filter(s => s.priority === opts.priority);
  }
  
  if (scenarios.length === 0) {
    console.log(`${C.yellow}No scenarios match the filters${C.reset}`);
    process.exit(0);
  }
  
  console.log(`\nRunning ${scenarios.length} simulations...\n`);
  console.log('─'.repeat(70));
  
  // Execute scenarios
  const results = [];
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    console.log(`\n[${i + 1}/${scenarios.length}] ${scenario.name}...`);
    
    const result = await runSimulation(scenario, agentId, settings);
    results.push(result);
    printResult(result, opts.verbose);
    
    if (i < scenarios.length - 1) {
      await sleep(CONFIG.DELAY_BETWEEN_SCENARIOS_MS);
    }
  }
  
  // Summary and results file
  const exitCode = printSummary(results, startTime);
  
  const resultsPath = path.join(__dirname, 'simulation-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    agent_id: agentId,
    summary: {
      total: results.length,
      passed: results.filter(r => r.overall_passed).length,
      failed: results.filter(r => !r.overall_passed).length,
      success_rate: Math.round((results.filter(r => r.overall_passed).length / results.length) * 100)
    },
    results
  }, null, 2));
  
  console.log(`\n📄 Results saved to: ${resultsPath}`);
  process.exit(exitCode);
}

main().catch(err => {
  console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
  console.error(err.stack);
  process.exit(1);
});
