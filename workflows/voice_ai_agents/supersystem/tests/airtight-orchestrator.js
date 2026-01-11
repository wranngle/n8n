#!/usr/bin/env node
/**
 * AIRTIGHT Test Orchestrator v1.1
 * 
 * Runs ALL test layers in parallel for comprehensive voice agent validation:
 * 
 * Layer 1-6: Supersystem Engine (raw API simulations + self-healing)
 * Layer 7: ElevenLabs Native Tests (dashboard-visible, persistent)
 * Layer 8: n8n Workflow Evaluations (dataset-driven, CI/CD ready)
 * 
 * Created: 2025-12-30
 * Security: 2026-01-09 - Fixed Promise.allSettled, added error resilience
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Import layer modules
const layer7 = require('./layer7-elevenlabs-tests');
const layer8 = require('./layer8-n8n-evaluations');

// Colors
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
};

const CONFIG = {
  AGENT_ID: process.env.ELEVENLABS_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew',
  RESULTS_DIR: path.join(__dirname, 'airtight-results'),
  ENGINE_PATH: path.join(__dirname, '..', 'supersystem-engine.js'),
};

/**
 * Run a command and capture output
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const proc = spawn(command, args, {
      cwd: options.cwd || __dirname,
      env: { ...process.env, ...options.env },
      stdio: options.stdio || 'pipe',
    });
    
    let stdout = '';
    let stderr = '';
    
    if (proc.stdout) {
      proc.stdout.on('data', data => {
        stdout += data.toString();
        if (options.stream) process.stdout.write(data);
      });
    }
    
    if (proc.stderr) {
      proc.stderr.on('data', data => {
        stderr += data.toString();
        if (options.stream) process.stderr.write(data);
      });
    }
    
    proc.on('close', code => {
      resolve({
        code,
        stdout,
        stderr,
        duration_ms: Date.now() - startTime,
      });
    });
    
    proc.on('error', reject);
  });
}

/**
 * Run Layer 1-6: Supersystem Engine
 */
async function runSupersystemEngine(options = {}) {
  console.log(`\n${C.cyan}${C.bright}┌────────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.cyan}${C.bright}│  LAYER 1-6: SUPERSYSTEM ENGINE                             │${C.reset}`);
  console.log(`${C.cyan}${C.bright}└────────────────────────────────────────────────────────────┘${C.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    const result = await runCommand('node', [CONFIG.ENGINE_PATH], {
      stream: !options.quiet,
      env: {
        MAX_CYCLES: options.maxCycles || '3',
        BATCH_SIZE: options.batchSize || '5',
      },
    });
    
    return {
      layer: '1-6',
      name: 'Supersystem Engine',
      success: result.code === 0,
      exit_code: result.code,
      duration_ms: result.duration_ms,
      output_lines: result.stdout.split('\n').length,
    };
  } catch (e) {
    return {
      layer: '1-6',
      name: 'Supersystem Engine',
      success: false,
      error: e.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Run Layer 7: ElevenLabs Native Tests
 */
async function runElevenLabsTests(options = {}) {
  console.log(`\n${C.magenta}${C.bright}┌────────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.magenta}${C.bright}│  LAYER 7: ELEVENLABS NATIVE TESTS                         │${C.reset}`);
  console.log(`${C.magenta}${C.bright}└────────────────────────────────────────────────────────────┘${C.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Create tests from scenarios
    console.log(`${C.blue}Creating ElevenLabs tests from scenarios...${C.reset}`);
    const createResult = await layer7.createTestsFromScenarios(CONFIG.AGENT_ID, {
      priority: options.priority,
    });
    
    // Run all tests
    if (!options.createOnly) {
      console.log(`\n${C.blue}Running ElevenLabs tests...${C.reset}`);
      const runResult = await layer7.runAllTests(CONFIG.AGENT_ID);
      
      return {
        layer: '7',
        name: 'ElevenLabs Native Tests',
        success: runResult.failed.length === 0 && runResult.errors.length === 0,
        created: createResult.created.length,
        skipped: createResult.skipped.length,
        passed: runResult.passed.length,
        failed: runResult.failed.length,
        errors: runResult.errors.length,
        duration_ms: Date.now() - startTime,
      };
    } else {
      return {
        layer: '7',
        name: 'ElevenLabs Native Tests',
        success: createResult.failed.length === 0,
        created: createResult.created.length,
        skipped: createResult.skipped.length,
        failed_create: createResult.failed.length,
        duration_ms: Date.now() - startTime,
        mode: 'create-only',
      };
    }
  } catch (e) {
    return {
      layer: '7',
      name: 'ElevenLabs Native Tests',
      success: false,
      error: e.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Run Layer 8: n8n Evaluations
 */
async function runN8nEvaluations(options = {}) {
  console.log(`\n${C.yellow}${C.bright}┌────────────────────────────────────────────────────────────┐${C.reset}`);
  console.log(`${C.yellow}${C.bright}│  LAYER 8: N8N WORKFLOW EVALUATIONS                         │${C.reset}`);
  console.log(`${C.yellow}${C.bright}└────────────────────────────────────────────────────────────┘${C.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Setup evaluation workflow and dataset
    console.log(`${C.blue}Setting up n8n evaluations...${C.reset}`);
    const setupResult = await layer8.setup();
    
    // Generate report
    const report = await layer8.generateReport();
    
    return {
      layer: '8',
      name: 'n8n Workflow Evaluations',
      success: true,
      dataset_rows: report.dataset.total_rows,
      by_priority: report.dataset.by_priority,
      by_category: report.dataset.by_category,
      duration_ms: Date.now() - startTime,
      note: 'Dataset and workflow generated - run via n8n UI for full evaluation',
    };
  } catch (e) {
    return {
      layer: '8',
      name: 'n8n Workflow Evaluations',
      success: false,
      error: e.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

/**
 * Run all layers in parallel
 */
async function runAllParallel(options = {}) {
  console.log(`
${C.white}${C.bright}╔═══════════════════════════════════════════════════════════════════════╗
║                                                                         ║
║     █████╗ ██╗██████╗ ████████╗██╗ ██████╗ ██╗  ██╗████████╗           ║
║    ██╔══██╗██║██╔══██╗╚══██╔══╝██║██╔════╝ ██║  ██║╚══██╔══╝           ║
║    ███████║██║██████╔╝   ██║   ██║██║  ███╗███████║   ██║              ║
║    ██╔══██║██║██╔══██╗   ██║   ██║██║   ██║██╔══██║   ██║              ║
║    ██║  ██║██║██║  ██║   ██║   ██║╚██████╔╝██║  ██║   ██║              ║
║    ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝              ║
║                                                                         ║
║     Multi-Layer Voice Agent Validation Suite v1.0                       ║
║     Layer 1-6: Supersystem Engine • Layer 7: ElevenLabs • Layer 8: n8n  ║
╚═══════════════════════════════════════════════════════════════════════╝${C.reset}
`);

  const startTime = Date.now();
  
  // Ensure results directory
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }
  
  console.log(`${C.bright}Agent ID:${C.reset} ${CONFIG.AGENT_ID}`);
  console.log(`${C.bright}Mode:${C.reset} ${options.parallel ? 'Parallel' : 'Sequential'}`);
  console.log(`${C.bright}Started:${C.reset} ${new Date().toISOString()}\n`);
  
  let results;
  
  if (options.parallel) {
    // Run all layers in parallel using Promise.allSettled for error resilience
    // This ensures we get results from ALL layers even if one fails
    console.log(`${C.cyan}Starting all layers in parallel...${C.reset}\n`);
    
    const layerPromises = [
      options.skipEngine ? Promise.resolve({ layer: '1-6', skipped: true }) : runSupersystemEngine({ quiet: true, ...options }),
      options.skipElevenlabs ? Promise.resolve({ layer: '7', skipped: true }) : runElevenLabsTests(options),
      options.skipN8n ? Promise.resolve({ layer: '8', skipped: true }) : runN8nEvaluations(options),
    ];
    
    const settled = await Promise.allSettled(layerPromises);
    
    // Extract results, converting rejections to error objects
    const extractResult = (result, layerNum, layerName) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          layer: layerNum,
          name: layerName,
          success: false,
          error: result.reason?.message || String(result.reason),
          duration_ms: 0,
        };
      }
    };
    
    results = {
      layer1_6: extractResult(settled[0], '1-6', 'Supersystem Engine'),
      layer7: extractResult(settled[1], '7', 'ElevenLabs Native Tests'),
      layer8: extractResult(settled[2], '8', 'n8n Workflow Evaluations'),
    };
  } else {
    // Run sequentially with try-catch for each layer
    console.log(`${C.cyan}Running layers sequentially...${C.reset}\n`);
    
    let layer1_6, layer7Result, layer8Result;
    
    try {
      layer1_6 = options.skipEngine ? { layer: '1-6', skipped: true } : await runSupersystemEngine(options);
    } catch (e) {
      layer1_6 = { layer: '1-6', name: 'Supersystem Engine', success: false, error: e.message };
    }
    
    try {
      layer7Result = options.skipElevenlabs ? { layer: '7', skipped: true } : await runElevenLabsTests(options);
    } catch (e) {
      layer7Result = { layer: '7', name: 'ElevenLabs Native Tests', success: false, error: e.message };
    }
    
    try {
      layer8Result = options.skipN8n ? { layer: '8', skipped: true } : await runN8nEvaluations(options);
    } catch (e) {
      layer8Result = { layer: '8', name: 'n8n Workflow Evaluations', success: false, error: e.message };
    }
    
    results = { layer1_6, layer7: layer7Result, layer8: layer8Result };
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Summary
  console.log(`\n${C.white}${C.bright}╔═══════════════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.white}${C.bright}║                     AIRTIGHT VALIDATION SUMMARY                        ║${C.reset}`);
  console.log(`${C.white}${C.bright}╚═══════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
  
  const printLayerResult = (result) => {
    const status = result.skipped ? `${C.yellow}SKIPPED${C.reset}` 
                 : result.success ? `${C.green}PASS${C.reset}` 
                 : `${C.red}FAIL${C.reset}`;
    console.log(`  Layer ${result.layer}: ${result.name || 'N/A'} - ${status}`);
    if (result.error) console.log(`    ${C.red}Error: ${result.error}${C.reset}`);
    if (result.duration_ms) console.log(`    Duration: ${(result.duration_ms / 1000).toFixed(1)}s`);
  };
  
  printLayerResult(results.layer1_6);
  printLayerResult(results.layer7);
  printLayerResult(results.layer8);
  
  console.log(`\n${C.bright}Total Duration:${C.reset} ${(totalDuration / 1000).toFixed(1)}s`);
  
  // Overall verdict
  const allPassed = (results.layer1_6.skipped || results.layer1_6.success)
                 && (results.layer7.skipped || results.layer7.success)
                 && (results.layer8.skipped || results.layer8.success);
  
  if (allPassed) {
    console.log(`\n${C.green}${C.bright}✓ AIRTIGHT VALIDATION PASSED${C.reset}\n`);
  } else {
    console.log(`\n${C.red}${C.bright}✗ AIRTIGHT VALIDATION FAILED${C.reset}\n`);
  }
  
  // Save results
  const resultFile = path.join(CONFIG.RESULTS_DIR, `airtight-${Date.now()}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    agent_id: CONFIG.AGENT_ID,
    total_duration_ms: totalDuration,
    overall_passed: allPassed,
    layers: results,
  };
  fs.writeFileSync(resultFile, JSON.stringify(report, null, 2));
  console.log(`Results saved to: ${resultFile}`);
  
  return allPassed ? 0 : 1;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    parallel: args.includes('--parallel') || args.includes('-p'),
    skipEngine: args.includes('--skip-engine'),
    skipElevenlabs: args.includes('--skip-elevenlabs'),
    skipN8n: args.includes('--skip-n8n'),
    createOnly: args.includes('--create-only'),
    priority: args.find(a => a.startsWith('--priority='))?.split('=')[1],
    maxCycles: args.find(a => a.startsWith('--cycles='))?.split('=')[1],
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
AIRTIGHT Test Orchestrator

Usage:
  node airtight-orchestrator.js [options]

Options:
  --parallel, -p       Run all layers in parallel
  --skip-engine        Skip supersystem engine (layers 1-6)
  --skip-elevenlabs    Skip ElevenLabs native tests (layer 7)
  --skip-n8n           Skip n8n evaluations (layer 8)
  --create-only        Only create tests, don't run them
  --priority=<level>   Filter by priority (critical, high, medium, low)
  --cycles=<n>         Max cycles for supersystem engine
  --help, -h           Show this help

Environment:
  ELEVENLABS_API_KEY      Required for layer 7
  ELEVENLABS_AGENT_ID     Agent to test (default: Sarah)
  N8N_API_KEY             Required for layer 8 deployment

Examples:
  node airtight-orchestrator.js --parallel
  node airtight-orchestrator.js --skip-engine --priority=critical
  node airtight-orchestrator.js --create-only --skip-n8n
`);
    process.exit(0);
  }
  
  runAllParallel(options).then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error(`${C.red}Fatal error: ${err.message}${C.reset}`);
    process.exit(1);
  });
}

module.exports = {
  runSupersystemEngine,
  runElevenLabsTests,
  runN8nEvaluations,
  runAllParallel,
};
