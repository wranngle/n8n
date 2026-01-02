#!/usr/bin/env node
/**
 * Layer 8: n8n Workflow Evaluation Integration
 * 
 * Integrates with n8n's Evaluation nodes (evaluationTrigger + evaluation)
 * for dataset-driven testing of voice agent workflows.
 * 
 * Pattern based on n8n template #5523:
 * evaluationTrigger → Workflow Under Test → evaluation
 * 
 * Created: 2025-12-30
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const CONFIG = {
  N8N_API_URL: process.env.N8N_API_URL || 'https://n8n.wranngle.com/api/v1',
  N8N_API_KEY: process.env.N8N_API_KEY,
  SCENARIOS_FILE: path.join(__dirname, 'simulation-scenarios.yaml'),
  RESULTS_DIR: path.join(__dirname, 'n8n-evaluation-results'),
  EVALUATION_WORKFLOW_NAME: '[DEV] Supersystem Evaluation Runner',
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
 * Convert supersystem scenario to n8n evaluation dataset row
 */
function scenarioToDatasetRow(scenario) {
  return {
    test_id: scenario.id,
    test_name: scenario.name,
    category: scenario.category,
    priority: scenario.priority,
    // Input for the workflow under test
    input: {
      simulated_user_prompt: scenario.simulated_user_prompt,
      expected_tool_calls: scenario.expected_tool_calls || [],
      forbidden_tool_calls: scenario.forbidden_tool_calls || [],
    },
    // Expected outputs for evaluation
    expected: {
      criteria: scenario.evaluation_criteria.map(c => ({
        id: c.id,
        name: c.name,
        prompt: c.prompt,
        weight: c.weight || 1.0,
      })),
      tool_calls: scenario.expected_tool_calls || [],
    },
    // Metadata
    tags: scenario.tags || [],
  };
}

/**
 * Generate evaluation dataset from all scenarios
 */
function generateDataset() {
  const content = fs.readFileSync(CONFIG.SCENARIOS_FILE, 'utf8');
  const data = yaml.load(content);
  const scenarios = data.scenarios;
  
  const dataset = {
    name: 'Supersystem Voice Agent Tests',
    description: 'Auto-generated from supersystem simulation-scenarios.yaml',
    generated: new Date().toISOString(),
    version: data.version || '1.0',
    rows: scenarios.map(scenarioToDatasetRow),
  };
  
  return dataset;
}

/**
 * Create the evaluation workflow JSON for n8n
 */
function createEvaluationWorkflow(datasetId) {
  return {
    name: CONFIG.EVALUATION_WORKFLOW_NAME,
    nodes: [
      // 1. Evaluation Trigger - loads dataset
      {
        id: 'eval-trigger',
        name: 'Evaluation Trigger',
        type: 'n8n-nodes-base.evaluationTrigger',
        typeVersion: 1,
        position: [240, 300],
        parameters: {
          mode: 'manual',
        },
      },
      // 2. HTTP Request - calls supersystem simulate endpoint
      {
        id: 'run-simulation',
        name: 'Run Simulation',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 4.2,
        position: [460, 300],
        parameters: {
          method: 'POST',
          url: '={{ $env.SUPERSYSTEM_BASE }}/simulate',
          sendBody: true,
          specifyBody: 'json',
          jsonBody: '={{ JSON.stringify($json.input) }}',
          options: {
            timeout: 120000,
          },
        },
      },
      // 3. Code node - evaluate results
      {
        id: 'evaluate-results',
        name: 'Evaluate Results',
        type: 'n8n-nodes-base.code',
        typeVersion: 2,
        position: [680, 300],
        parameters: {
          mode: 'runOnceForEachItem',
          jsCode: `
// Get simulation result and expected criteria
const simulationResult = $input.first().json;
const expected = $('Evaluation Trigger').first().json.expected;

// Evaluate each criterion
const evaluations = expected.criteria.map(criterion => {
  // Simple keyword matching for now
  // In production, use LLM-based evaluation
  const transcript = simulationResult.transcript || '';
  const passed = transcript.toLowerCase().includes(criterion.id.replace(/_/g, ' '));
  
  return {
    criterion_id: criterion.id,
    criterion_name: criterion.name,
    passed,
    weight: criterion.weight,
    score: passed ? criterion.weight : 0,
  };
});

// Calculate overall score
const totalWeight = evaluations.reduce((sum, e) => sum + e.weight, 0);
const earnedScore = evaluations.reduce((sum, e) => sum + e.score, 0);
const overallScore = totalWeight > 0 ? (earnedScore / totalWeight) * 100 : 0;

// Check tool calls
const actualToolCalls = simulationResult.tool_calls || [];
const expectedToolCalls = expected.tool_calls || [];
const toolCallMatch = expectedToolCalls.every(tc => 
  actualToolCalls.some(atc => atc.name === tc || atc.tool === tc)
);

return {
  test_id: $('Evaluation Trigger').first().json.test_id,
  test_name: $('Evaluation Trigger').first().json.test_name,
  passed: overallScore >= 70 && toolCallMatch,
  overall_score: overallScore.toFixed(1),
  criteria_results: evaluations,
  tool_call_match: toolCallMatch,
  actual_tool_calls: actualToolCalls.map(tc => tc.name || tc.tool),
  expected_tool_calls: expectedToolCalls,
  simulation_duration_ms: simulationResult.duration_ms,
};
`,
        },
      },
      // 4. Evaluation node - records results
      {
        id: 'evaluation',
        name: 'Evaluation',
        type: 'n8n-nodes-base.evaluation',
        typeVersion: 1,
        position: [900, 300],
        parameters: {
          evaluationMode: 'custom',
          evaluationField: '={{ $json.passed }}',
          scoreField: '={{ $json.overall_score }}',
        },
      },
    ],
    connections: {
      'eval-trigger': {
        main: [[{ node: 'run-simulation', type: 'main', index: 0 }]],
      },
      'run-simulation': {
        main: [[{ node: 'evaluate-results', type: 'main', index: 0 }]],
      },
      'evaluate-results': {
        main: [[{ node: 'evaluation', type: 'main', index: 0 }]],
      },
    },
    settings: {
      executionOrder: 'v1',
    },
    tags: [
      { name: 'supersystem' },
      { name: 'evaluation' },
      { name: 'voice-agent' },
    ],
  };
}

/**
 * Upload dataset to n8n (if dataset API exists)
 * Note: n8n evaluation datasets may require manual upload via UI
 */
async function uploadDataset(dataset) {
  // n8n doesn't have a public API for datasets yet
  // Save to file for manual import
  const datasetFile = path.join(CONFIG.RESULTS_DIR, 'evaluation-dataset.json');
  fs.writeFileSync(datasetFile, JSON.stringify(dataset, null, 2));
  
  console.log(`${C.yellow}Note: n8n evaluation datasets require manual import via UI${C.reset}`);
  console.log(`${C.blue}Dataset saved to: ${datasetFile}${C.reset}`);
  console.log(`${C.blue}Import via: n8n UI → Workflows → Evaluations → Import Dataset${C.reset}\n`);
  
  return { file: datasetFile, rows: dataset.rows.length };
}

/**
 * Deploy evaluation workflow to n8n
 */
async function deployEvaluationWorkflow() {
  const workflow = createEvaluationWorkflow();
  
  // Check if workflow already exists
  const listUrl = `${CONFIG.N8N_API_URL}/workflows?name=${encodeURIComponent(CONFIG.EVALUATION_WORKFLOW_NAME)}`;
  const listResponse = await fetch(listUrl, {
    headers: { 'X-N8N-API-KEY': CONFIG.N8N_API_KEY },
  });
  
  if (!listResponse.ok) {
    throw new Error(`Failed to list workflows: ${listResponse.status}`);
  }
  
  const existing = await listResponse.json();
  
  if (existing.data && existing.data.length > 0) {
    // Update existing
    const id = existing.data[0].id;
    const updateUrl = `${CONFIG.N8N_API_URL}/workflows/${id}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update workflow: ${updateResponse.status}`);
    }
    
    console.log(`${C.green}✓ Updated existing evaluation workflow${C.reset}`);
    return { id, action: 'updated' };
  } else {
    // Create new
    const createUrl = `${CONFIG.N8N_API_URL}/workflows`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create workflow: ${createResponse.status}`);
    }
    
    const created = await createResponse.json();
    console.log(`${C.green}✓ Created new evaluation workflow${C.reset}`);
    return { id: created.id, action: 'created' };
  }
}

/**
 * Run evaluation workflow
 */
async function runEvaluation(workflowId) {
  const url = `${CONFIG.N8N_API_URL}/workflows/${workflowId}/execute`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to execute workflow: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Get evaluation results from n8n
 */
async function getEvaluationResults(workflowId) {
  const url = `${CONFIG.N8N_API_URL}/executions?workflowId=${workflowId}&limit=10`;
  
  const response = await fetch(url, {
    headers: { 'X-N8N-API-KEY': CONFIG.N8N_API_KEY },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get executions: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * Main setup function
 */
async function setup() {
  console.log(`\n${C.magenta}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.magenta}${C.bright}       LAYER 8: N8N EVALUATION INTEGRATION SETUP           ${C.reset}`);
  console.log(`${C.magenta}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);
  
  // Ensure results directory exists
  if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
    fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
  }
  
  // Generate dataset
  console.log(`${C.blue}Generating evaluation dataset...${C.reset}`);
  const dataset = generateDataset();
  console.log(`${C.green}✓ Generated ${dataset.rows.length} test rows${C.reset}\n`);
  
  // Upload dataset (save to file)
  const uploadResult = await uploadDataset(dataset);
  
  // Generate workflow JSON
  console.log(`${C.blue}Generating evaluation workflow...${C.reset}`);
  const workflow = createEvaluationWorkflow();
  const workflowFile = path.join(CONFIG.RESULTS_DIR, 'evaluation-workflow.json');
  fs.writeFileSync(workflowFile, JSON.stringify(workflow, null, 2));
  console.log(`${C.green}✓ Workflow saved to: ${workflowFile}${C.reset}\n`);
  
  // Deploy if API key available
  if (CONFIG.N8N_API_KEY) {
    console.log(`${C.blue}Deploying evaluation workflow to n8n...${C.reset}`);
    try {
      const deployResult = await deployEvaluationWorkflow();
      console.log(`${C.green}✓ Workflow ${deployResult.action}: ID ${deployResult.id}${C.reset}\n`);
    } catch (e) {
      console.log(`${C.yellow}⚠ Could not deploy: ${e.message}${C.reset}`);
      console.log(`${C.yellow}  Import manually from: ${workflowFile}${C.reset}\n`);
    }
  } else {
    console.log(`${C.yellow}N8N_API_KEY not set - manual import required${C.reset}`);
    console.log(`${C.yellow}Import workflow from: ${workflowFile}${C.reset}\n`);
  }
  
  // Summary
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.green}Setup Complete${C.reset}`);
  console.log(`${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`\n${C.cyan}Next Steps:${C.reset}`);
  console.log(`1. Import evaluation-dataset.json into n8n Evaluations`);
  console.log(`2. Open the evaluation workflow in n8n`);
  console.log(`3. Run evaluation from the n8n UI`);
  console.log(`4. View results in n8n Evaluations dashboard\n`);
  
  return {
    dataset: uploadResult,
    workflow: workflowFile,
  };
}

/**
 * Generate comparison report
 */
async function generateReport() {
  console.log(`\n${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.cyan}${C.bright}       LAYER 8: N8N EVALUATION REPORT                       ${C.reset}`);
  console.log(`${C.cyan}${C.bright}═══════════════════════════════════════════════════════════${C.reset}\n`);
  
  // Load supersystem stats
  const cycleStatsPath = path.join(__dirname, 'cycle-stats.json');
  let cycleStats = { cycles: [] };
  if (fs.existsSync(cycleStatsPath)) {
    cycleStats = JSON.parse(fs.readFileSync(cycleStatsPath, 'utf8'));
  }
  
  // Load dataset for counts
  const dataset = generateDataset();
  
  const report = {
    generated: new Date().toISOString(),
    layer: 8,
    name: 'n8n Evaluation Integration',
    dataset: {
      total_rows: dataset.rows.length,
      by_priority: {},
      by_category: {},
    },
    supersystem_comparison: {
      total_cycles: cycleStats.cycles.length,
      total_simulations: cycleStats.cycles.reduce((sum, c) => sum + c.simulations, 0),
    },
    n8n_features_used: [
      'evaluationTrigger node',
      'evaluation node',
      'Dataset-driven testing',
      'Custom scoring',
    ],
  };
  
  // Count by priority
  dataset.rows.forEach(row => {
    report.dataset.by_priority[row.priority] = (report.dataset.by_priority[row.priority] || 0) + 1;
    report.dataset.by_category[row.category] = (report.dataset.by_category[row.category] || 0) + 1;
  });
  
  // Save report
  const reportFile = path.join(CONFIG.RESULTS_DIR, 'n8n-evaluation-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  console.log(`${C.bright}Dataset Summary:${C.reset}`);
  console.log(`  Total test rows: ${report.dataset.total_rows}`);
  console.log(`\n${C.bright}By Priority:${C.reset}`);
  Object.entries(report.dataset.by_priority).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log(`\n${C.bright}By Category:${C.reset}`);
  Object.entries(report.dataset.by_category).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });
  console.log(`\n${C.bright}Supersystem Comparison:${C.reset}`);
  console.log(`  Cycles: ${report.supersystem_comparison.total_cycles}`);
  console.log(`  Simulations: ${report.supersystem_comparison.total_simulations}`);
  console.log(`\nReport saved to: ${reportFile}\n`);
  
  return report;
}

// Export for use by supersystem engine
module.exports = {
  scenarioToDatasetRow,
  generateDataset,
  createEvaluationWorkflow,
  uploadDataset,
  deployEvaluationWorkflow,
  runEvaluation,
  getEvaluationResults,
  setup,
  generateReport,
  CONFIG,
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  const commands = {
    'setup': setup,
    'dataset': async () => {
      const dataset = generateDataset();
      if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
        fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
      }
      const file = path.join(CONFIG.RESULTS_DIR, 'evaluation-dataset.json');
      fs.writeFileSync(file, JSON.stringify(dataset, null, 2));
      console.log(`Dataset saved to: ${file}`);
      console.log(`Total rows: ${dataset.rows.length}`);
    },
    'workflow': async () => {
      const workflow = createEvaluationWorkflow();
      if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
        fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
      }
      const file = path.join(CONFIG.RESULTS_DIR, 'evaluation-workflow.json');
      fs.writeFileSync(file, JSON.stringify(workflow, null, 2));
      console.log(`Workflow saved to: ${file}`);
    },
    'deploy': async () => {
      if (!CONFIG.N8N_API_KEY) {
        console.error(`${C.red}Error: N8N_API_KEY required${C.reset}`);
        process.exit(1);
      }
      await deployEvaluationWorkflow();
    },
    'report': generateReport,
    'help': async () => {
      console.log(`
Layer 8: n8n Workflow Evaluation Integration

Usage:
  node layer8-n8n-evaluations.js <command>

Commands:
  setup      Full setup - generate dataset, workflow, deploy
  dataset    Generate evaluation dataset JSON
  workflow   Generate evaluation workflow JSON
  deploy     Deploy workflow to n8n (requires N8N_API_KEY)
  report     Generate evaluation report
  help       Show this help

Environment:
  N8N_API_URL    n8n API URL (default: https://n8n.wranngle.com/api/v1)
  N8N_API_KEY    Required for deployment
  SUPERSYSTEM_BASE  Supersystem webhook base URL

Output Files (in ./n8n-evaluation-results/):
  evaluation-dataset.json   Dataset for n8n import
  evaluation-workflow.json  Workflow JSON for import
  n8n-evaluation-report.json  Comparison report
`);
    },
  };
  
  const handler = commands[command];
  if (handler) {
    handler().catch(e => {
      console.error(`${C.red}Error: ${e.message}${C.reset}`);
      process.exit(1);
    });
  } else {
    console.error(`${C.red}Unknown command: ${command}${C.reset}`);
    commands['help']();
  }
}
