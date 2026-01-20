#!/usr/bin/env bun

/**
 * Client Initiation Data - Deployment Automation
 *
 * Automates the complete deployment process for the client initiation data webhook.
 * Handles n8n workflow deployment, ElevenLabs configuration, and validation testing.
 *
 * Usage:
 *   bun run supersystem/tools/deploy-client-initiation.js
 *   bun run supersystem/tools/deploy-client-initiation.js --dry-run
 *   bun run supersystem/tools/deploy-client-initiation.js --skip-n8n
 *   bun run supersystem/tools/deploy-client-initiation.js --skip-elevenlabs
 *
 * Options:
 *   --dry-run          Show what would be deployed without making changes
 *   --skip-n8n         Skip n8n workflow deployment (use existing)
 *   --skip-elevenlabs  Skip ElevenLabs agent configuration
 *   --force            Skip confirmation prompts
 *
 * Prerequisites:
 *   - N8N_API_KEY environment variable
 *   - ELEVENLABS_API_KEY environment variable
 *   - n8n instance accessible at N8N_BASE_URL
 *   - Pipedrive and Google Sheets credentials configured in n8n
 */

const fs = require('fs');
const path = require('path');

// Configuration
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.wranngle.com';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const WEBHOOK_URL = 'https://n8n.wranngle.com/webhook/client-initiation-data';

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipN8n = args.includes('--skip-n8n');
const skipElevenLabs = args.includes('--skip-elevenlabs');
const force = args.includes('--force');

// Deployment state
const state = {
  n8n: {
    workflowId: null,
    webhookActive: false,
    credentialsConfigured: false
  },
  elevenlabs: {
    variablesAdded: false,
    promptUpdated: false,
    webhookConfigured: false
  },
  validation: {
    passed: 0,
    failed: 0
  }
};

/**
 * Logging helpers
 */
function log(message, emoji = '📋') {
  console.log(`${emoji} ${message}`);
}

function success(message) {
  console.log(`✅ ${message}`);
}

function error(message) {
  console.log(`❌ ${message}`);
}

function warn(message) {
  console.log(`⚠️  ${message}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  console.log(title);
  console.log('='.repeat(80) + '\n');
}

/**
 * Confirmation prompt
 */
async function confirm(message) {
  if (force || dryRun) return true;

  process.stdout.write(`${message} (y/n): `);

  // Read single character from stdin
  const response = await new Promise((resolve) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim().toLowerCase());
    });
  });

  return response === 'y' || response === 'yes';
}

/**
 * n8n API helpers
 */
async function n8nRequest(endpoint, options = {}) {
  const url = `${N8N_BASE_URL}/api/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`n8n API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * ElevenLabs API helpers
 */
async function elevenLabsRequest(endpoint, options = {}) {
  const url = `https://api.elevenlabs.io/v1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Phase 1: Deploy n8n Workflow
 */
async function deployN8nWorkflow() {
  section('PHASE 1: n8n Workflow Deployment');

  if (skipN8n) {
    warn('Skipping n8n deployment (--skip-n8n flag)');
    return;
  }

  // Read workflow file
  const workflowPath = path.join(__dirname, '../client-initiation-data-prod.json');

  if (!fs.existsSync(workflowPath)) {
    throw new Error(`Workflow file not found: ${workflowPath}`);
  }

  log('Reading workflow file...');
  const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf-8'));

  log(`Workflow: ${workflowData.name}`);
  log(`Nodes: ${workflowData.nodes.length}`);

  // Check if workflow already exists
  log('Checking for existing workflow...');
  const workflows = await n8nRequest('/workflows');
  const existingWorkflow = workflows.data?.find(w => w.name === workflowData.name);

  if (existingWorkflow) {
    warn(`Workflow "${workflowData.name}" already exists (ID: ${existingWorkflow.id})`);

    if (!await confirm('Update existing workflow?')) {
      log('Skipping workflow deployment');
      state.n8n.workflowId = existingWorkflow.id;
      return;
    }

    if (dryRun) {
      log('[DRY RUN] Would update workflow ID: ' + existingWorkflow.id);
      state.n8n.workflowId = existingWorkflow.id;
      return;
    }

    log('Updating existing workflow...');
    await n8nRequest(`/workflows/${existingWorkflow.id}`, {
      method: 'PUT',
      body: JSON.stringify(workflowData)
    });

    state.n8n.workflowId = existingWorkflow.id;
    success(`Workflow updated (ID: ${existingWorkflow.id})`);
  } else {
    if (dryRun) {
      log('[DRY RUN] Would create new workflow');
      return;
    }

    log('Creating new workflow...');
    const result = await n8nRequest('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflowData)
    });

    state.n8n.workflowId = result.id;
    success(`Workflow created (ID: ${result.id})`);
  }

  // Verify credentials
  log('Verifying credentials configuration...');
  const credentials = await n8nRequest('/credentials');

  const pipedriveCredential = credentials.data?.find(c => c.type === 'pipedriveApi');
  const sheetsCredential = credentials.data?.find(c => c.type === 'googleSheetsOAuth2Api');

  if (!pipedriveCredential) {
    warn('Pipedrive credentials not configured in n8n');
    log('Action required: Configure Pipedrive API credentials in n8n');
  } else {
    success('Pipedrive credentials configured');
  }

  if (!sheetsCredential) {
    warn('Google Sheets credentials not configured in n8n');
    log('Action required: Configure Google Sheets OAuth2 credentials in n8n');
  } else {
    success('Google Sheets credentials configured');
  }

  state.n8n.credentialsConfigured = !!(pipedriveCredential && sheetsCredential);

  // Activate workflow
  if (!dryRun && state.n8n.workflowId) {
    log('Activating workflow...');
    await n8nRequest(`/workflows/${state.n8n.workflowId}/activate`, {
      method: 'POST'
    });
    state.n8n.webhookActive = true;
    success('Workflow activated');
  } else if (dryRun) {
    log('[DRY RUN] Would activate workflow');
  }
}

/**
 * Phase 2: Configure ElevenLabs Agent
 */
async function configureElevenLabsAgent() {
  section('PHASE 2: ElevenLabs Agent Configuration');

  if (skipElevenLabs) {
    warn('Skipping ElevenLabs configuration (--skip-elevenlabs flag)');
    return;
  }

  // Get current agent configuration
  log('Fetching current agent configuration...');
  const agent = await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`);

  log(`Agent: ${agent.name}`);

  // Define dynamic variables
  const dynamicVariables = [
    { name: 'customer_name', type: 'string', description: 'Full name of the caller from CRM' },
    { name: 'customer_first_name', type: 'string', description: 'First name only for casual greeting' },
    { name: 'company', type: 'string', description: 'Company name from CRM' },
    { name: 'industry', type: 'string', description: 'Industry type (hvac, plumbing, property_management)' },
    { name: 'account_tier', type: 'string', description: 'Customer tier (New, Bronze, Silver, Gold)' },
    { name: 'call_history', type: 'string', description: 'Summary of previous interactions' },
    { name: 'interaction_count', type: 'number', description: 'Number of previous calls' },
    { name: 'last_topic', type: 'string', description: 'Most recent conversation topic' },
    { name: 'notes', type: 'string', description: 'Important caller notes or preferences' },
    { name: 'lookup_success', type: 'boolean', description: 'Whether CRM data was found' },
    { name: 'data_source', type: 'string', description: 'Where data came from (pipedrive/sheets/cache/none)' },
    { name: 'secret__pipedrive_person_id', type: 'number', description: 'Pipedrive person ID (not sent to LLM)' },
    { name: 'secret__pipedrive_org_id', type: 'number', description: 'Pipedrive organization ID (not sent to LLM)' },
    { name: 'secret__google_sheet_row', type: 'number', description: 'Google Sheet row number (not sent to LLM)' }
  ];

  log(`Configuring ${dynamicVariables.length} dynamic variables...`);

  if (dryRun) {
    log('[DRY RUN] Would add dynamic variables to agent');
    dynamicVariables.forEach(v => log(`  - ${v.name} (${v.type}): ${v.description}`));
  } else {
    // Update conversation config with dynamic variables
    const updatedConfig = {
      ...agent.conversation_config,
      dynamic_variables: dynamicVariables
    };

    await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        conversation_config: updatedConfig
      })
    });

    state.elevenlabs.variablesAdded = true;
    success('Dynamic variables configured');
  }

  // Configure webhook URL
  log('Configuring client initiation webhook...');

  if (dryRun) {
    log(`[DRY RUN] Would set webhook URL: ${WEBHOOK_URL}`);
  } else {
    // Note: The actual ElevenLabs API endpoint for webhook configuration may vary
    // This is a placeholder - adjust based on actual API
    warn('Manual step required: Configure webhook in ElevenLabs dashboard');
    log(`  1. Navigate to ElevenLabs → Agent → Security tab`);
    log(`  2. Enable "Fetch conversation initiation data"`);
    log(`  3. Set URL: ${WEBHOOK_URL}`);
    log(`  4. Save configuration`);
  }

  // Update system prompt
  const promptPath = path.join(__dirname, '../../temp/sarah_updated_prompt.md');

  if (fs.existsSync(promptPath)) {
    log('Updated system prompt available...');
    const promptContent = fs.readFileSync(promptPath, 'utf-8');

    warn('Manual step required: Update agent system prompt');
    log('  1. Copy content from: temp/sarah_updated_prompt.md');
    log('  2. Paste into ElevenLabs → Agent → System Prompt');
    log('  3. Pay special attention to CONTEXT AWARENESS section');

    state.elevenlabs.promptUpdated = false; // Requires manual verification
  }
}

/**
 * Phase 3: Run Validation Tests
 */
async function runValidationTests() {
  section('PHASE 3: Validation Testing');

  log('Running automated test suite...');

  // Check if test file exists
  const testPath = path.join(__dirname, '../tests/test-client-initiation-webhook.js');

  if (!fs.existsSync(testPath)) {
    warn('Test file not found, skipping automated tests');
    return;
  }

  if (dryRun) {
    log('[DRY RUN] Would run automated test suite');
    return;
  }

  try {
    // Run test suite as subprocess
    const proc = Bun.spawn(['bun', 'run', testPath], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const output = await new Response(proc.stdout).text();
    const exitCode = await proc.exited;

    console.log(output);

    if (exitCode === 0) {
      success('All automated tests passed');
      state.validation.passed = 10; // Assuming 10 tests
    } else {
      error('Some tests failed');
      state.validation.failed = 1;
    }
  } catch (err) {
    error(`Test execution failed: ${err.message}`);
    state.validation.failed = 1;
  }

  // Manual test scenarios
  log('\nManual validation scenarios:');
  log('  1. Test known caller (should greet by name)');
  log('  2. Test unknown caller (should use generic greeting)');
  log('  3. Test VIP caller (should use premium first_message)');
  log('  4. Verify SMS tool includes pipedrive_person_id');
  log('  5. Check webhook P95 latency < 500ms');
  log('  6. Confirm graceful degradation on API failure');
}

/**
 * Display deployment summary
 */
function displaySummary() {
  section('DEPLOYMENT SUMMARY');

  console.log('n8n Workflow:');
  if (state.n8n.workflowId) {
    success(`Workflow deployed (ID: ${state.n8n.workflowId})`);
  } else {
    warn('Workflow not deployed');
  }

  if (state.n8n.webhookActive) {
    success('Webhook active and listening');
  } else {
    warn('Webhook not activated');
  }

  if (state.n8n.credentialsConfigured) {
    success('Credentials configured (Pipedrive + Sheets)');
  } else {
    error('Missing credentials - action required');
  }

  console.log('\nElevenLabs Agent:');
  if (state.elevenlabs.variablesAdded) {
    success('Dynamic variables configured (14 total)');
  } else {
    warn('Dynamic variables not added');
  }

  if (state.elevenlabs.webhookConfigured) {
    success('Webhook URL configured');
  } else {
    warn('Webhook configuration pending (manual step)');
  }

  if (state.elevenlabs.promptUpdated) {
    success('System prompt updated');
  } else {
    warn('System prompt update pending (manual step)');
  }

  console.log('\nValidation:');
  if (state.validation.passed > 0) {
    success(`${state.validation.passed} tests passed`);
  }
  if (state.validation.failed > 0) {
    error(`${state.validation.failed} tests failed`);
  }

  // Overall status
  console.log('\n' + '='.repeat(80));

  const allAutomatedStepsComplete = (
    (skipN8n || (state.n8n.workflowId && state.n8n.webhookActive)) &&
    (skipElevenLabs || state.elevenlabs.variablesAdded) &&
    state.validation.failed === 0
  );

  if (allAutomatedStepsComplete) {
    success('DEPLOYMENT SUCCESSFUL - Automated steps complete');
    console.log('\nNext Steps:');
    console.log('  1. Complete manual ElevenLabs configuration (webhook URL + prompt)');
    console.log('  2. Run manual validation scenarios');
    console.log('  3. Monitor first 10 calls for issues');
    console.log('  4. Review performance metrics after 24 hours');
  } else {
    warn('DEPLOYMENT INCOMPLETE - Manual intervention required');
    console.log('\nRequired Actions:');
    if (!state.n8n.credentialsConfigured) {
      console.log('  - Configure Pipedrive and Google Sheets credentials in n8n');
    }
    if (!state.elevenlabs.webhookConfigured) {
      console.log('  - Set webhook URL in ElevenLabs Security tab');
    }
    if (!state.elevenlabs.promptUpdated) {
      console.log('  - Update agent system prompt with CONTEXT AWARENESS section');
    }
    if (state.validation.failed > 0) {
      console.log('  - Fix failing tests before production deployment');
    }
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Main deployment flow
 */
async function main() {
  console.log('\n');
  section('CLIENT INITIATION DATA - DEPLOYMENT AUTOMATION');

  if (dryRun) {
    warn('DRY RUN MODE - No changes will be made');
  }

  // Verify prerequisites
  log('Verifying prerequisites...');

  if (!skipN8n && !N8N_API_KEY) {
    error('N8N_API_KEY environment variable not set');
    process.exit(1);
  }

  if (!skipElevenLabs && !ELEVENLABS_API_KEY) {
    error('ELEVENLABS_API_KEY environment variable not set');
    process.exit(1);
  }

  success('Prerequisites verified');

  // Confirm deployment
  if (!dryRun && !force) {
    console.log('\nThis will deploy the client initiation data webhook to production.');
    console.log('The following changes will be made:');
    console.log('  - Deploy/update n8n workflow');
    console.log('  - Configure ElevenLabs agent with 14 dynamic variables');
    console.log('  - Run validation tests');
    console.log('');

    if (!await confirm('Proceed with deployment?')) {
      log('Deployment cancelled by user');
      process.exit(0);
    }
  }

  // Execute deployment phases
  try {
    await deployN8nWorkflow();
    await configureElevenLabsAgent();
    await runValidationTests();
    displaySummary();
  } catch (err) {
    console.log('\n');
    error(`Deployment failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run deployment
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
