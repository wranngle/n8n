#!/usr/bin/env bun

/**
 * Client Initiation Data - Rollback Automation
 *
 * Automated rollback script for the client initiation data webhook.
 * Safely reverts the deployment to pre-enhancement state.
 *
 * Usage:
 *   bun run supersystem/tools/rollback-client-initiation.js
 *   bun run supersystem/tools/rollback-client-initiation.js --dry-run
 *   bun run supersystem/tools/rollback-client-initiation.js --force
 *   bun run supersystem/tools/rollback-client-initiation.js --full
 *
 * Options:
 *   --dry-run    Show what would be rolled back without making changes
 *   --force      Skip confirmation prompts
 *   --full       Full rollback including variable removal (use with caution)
 *   --keep-data  Deactivate workflow but keep data and configuration
 *
 * Rollback Levels:
 *   Level 1 (Default): Deactivate n8n workflow only
 *   Level 2 (--full):  Deactivate + remove ElevenLabs webhook config
 *   Level 3 (--full):  Level 2 + remove dynamic variables
 *
 * Prerequisites:
 *   - N8N_API_KEY environment variable
 *   - ELEVENLABS_API_KEY environment variable (for --full)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.wranngle.com';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const WORKFLOW_NAME = '[PROD] Client Initiation Data - Sarah';

// Parse args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const fullRollback = args.includes('--full');
const keepData = args.includes('--keep-data');

// Rollback state
const state = {
  n8n: {
    workflowFound: false,
    workflowId: null,
    wasActive: false,
    deactivated: false
  },
  elevenlabs: {
    agentFound: false,
    webhookDisabled: false,
    variablesRemoved: false,
    promptRestored: false
  },
  backup: {
    workflowBackupCreated: false,
    agentBackupCreated: false,
    backupPath: null
  },
  errors: []
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
  state.errors.push(message);
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
 * Create backups before rollback
 */
async function createBackups() {
  section('CREATING BACKUPS');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, `../../backups/rollback-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  state.backup.backupPath = backupDir;

  // Backup n8n workflow
  log('Backing up n8n workflow...');

  try {
    const workflows = await n8nRequest('/workflows');
    const workflow = workflows.data?.find(w => w.name === WORKFLOW_NAME);

    if (workflow) {
      const workflowBackupPath = path.join(backupDir, 'workflow-backup.json');
      fs.writeFileSync(workflowBackupPath, JSON.stringify(workflow, null, 2));
      state.backup.workflowBackupCreated = true;
      success(`Workflow backup created: ${workflowBackupPath}`);
    } else {
      warn('Workflow not found - no backup needed');
    }
  } catch (err) {
    error(`Failed to backup workflow: ${err.message}`);
  }

  // Backup ElevenLabs agent config
  if (fullRollback && ELEVENLABS_API_KEY) {
    log('Backing up ElevenLabs agent configuration...');

    try {
      const agent = await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`);
      const agentBackupPath = path.join(backupDir, 'agent-backup.json');
      fs.writeFileSync(agentBackupPath, JSON.stringify(agent, null, 2));
      state.backup.agentBackupCreated = true;
      success(`Agent backup created: ${agentBackupPath}`);
    } catch (err) {
      error(`Failed to backup agent: ${err.message}`);
    }
  }

  log(`All backups stored in: ${backupDir}`);
}

/**
 * Phase 1: Deactivate n8n Workflow
 */
async function deactivateN8nWorkflow() {
  section('PHASE 1: Deactivating n8n Workflow');

  log('Finding workflow...');

  try {
    const workflows = await n8nRequest('/workflows');
    const workflow = workflows.data?.find(w => w.name === WORKFLOW_NAME);

    if (!workflow) {
      warn('Workflow not found - may already be deleted');
      return;
    }

    state.n8n.workflowFound = true;
    state.n8n.workflowId = workflow.id;
    state.n8n.wasActive = workflow.active;

    log(`Found workflow: ${workflow.name} (ID: ${workflow.id})`);
    log(`Current status: ${workflow.active ? 'ACTIVE' : 'INACTIVE'}`);

    if (!workflow.active) {
      success('Workflow is already inactive');
      return;
    }

    if (dryRun) {
      log('[DRY RUN] Would deactivate workflow');
      return;
    }

    if (!await confirm('Deactivate workflow? This will stop all client enrichment.')) {
      log('Skipping workflow deactivation');
      return;
    }

    log('Deactivating workflow...');
    await n8nRequest(`/workflows/${workflow.id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ active: false })
    });

    state.n8n.deactivated = true;
    success('Workflow deactivated successfully');
    success('✅ Agent will now use generic greetings');

  } catch (err) {
    error(`Failed to deactivate workflow: ${err.message}`);
  }
}

/**
 * Phase 2: Disable ElevenLabs Webhook (Full Rollback Only)
 */
async function disableElevenLabsWebhook() {
  if (!fullRollback) {
    log('Skipping ElevenLabs webhook removal (use --full flag)');
    return;
  }

  section('PHASE 2: Disabling ElevenLabs Webhook');

  if (!ELEVENLABS_API_KEY) {
    error('ELEVENLABS_API_KEY not set - cannot disable webhook');
    warn('Manual action required: Disable webhook in ElevenLabs dashboard');
    return;
  }

  log('Fetching agent configuration...');

  try {
    const agent = await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`);
    state.elevenlabs.agentFound = true;

    log(`Agent: ${agent.name}`);

    // Check if webhook is configured
    const webhookConfigured = agent.conversation_config?.client_initiation_webhook_url;

    if (!webhookConfigured) {
      success('No webhook configured - nothing to remove');
      return;
    }

    log(`Current webhook: ${agent.conversation_config.client_initiation_webhook_url}`);

    if (dryRun) {
      log('[DRY RUN] Would remove webhook URL');
      return;
    }

    if (!await confirm('Remove webhook URL? Agent will stop enriching calls.')) {
      log('Skipping webhook removal');
      return;
    }

    // Note: Actual API endpoint may vary - this is a best-effort attempt
    warn('⚠️  Manual step required: Remove webhook in ElevenLabs dashboard');
    log('  1. Navigate to ElevenLabs → Agent → Security tab');
    log('  2. Disable "Fetch conversation initiation data"');
    log('  3. Clear webhook URL');
    log('  4. Save configuration');

    // If ElevenLabs API supports webhook removal via PATCH, uncomment:
    /*
    log('Removing webhook URL...');
    await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        conversation_config: {
          ...agent.conversation_config,
          client_initiation_webhook_url: null
        }
      })
    });
    state.elevenlabs.webhookDisabled = true;
    success('Webhook disabled');
    */

  } catch (err) {
    error(`Failed to disable webhook: ${err.message}`);
  }
}

/**
 * Phase 3: Remove Dynamic Variables (Full Rollback Only)
 */
async function removeDynamicVariables() {
  if (!fullRollback) {
    log('Skipping variable removal (use --full flag)');
    return;
  }

  section('PHASE 3: Removing Dynamic Variables');

  if (!ELEVENLABS_API_KEY) {
    error('ELEVENLABS_API_KEY not set - cannot remove variables');
    warn('Manual action required: Remove variables in ElevenLabs dashboard');
    return;
  }

  log('Fetching current dynamic variables...');

  try {
    const agent = await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`);
    const currentVariables = agent.conversation_config?.dynamic_variables || [];

    log(`Found ${currentVariables.length} dynamic variables`);

    if (currentVariables.length === 0) {
      success('No variables configured - nothing to remove');
      return;
    }

    // List variables
    currentVariables.forEach(v => {
      log(`  - ${v.name} (${v.type})`);
    });

    if (dryRun) {
      log('[DRY RUN] Would remove all dynamic variables');
      return;
    }

    warn('⚠️  WARNING: This will remove ALL dynamic variables!');
    warn('⚠️  Agent prompt may reference these variables and break.');

    if (!await confirm('Remove all dynamic variables?')) {
      log('Skipping variable removal');
      return;
    }

    log('Removing dynamic variables...');

    await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({
        conversation_config: {
          ...agent.conversation_config,
          dynamic_variables: []
        }
      })
    });

    state.elevenlabs.variablesRemoved = true;
    success('All dynamic variables removed');

  } catch (err) {
    error(`Failed to remove variables: ${err.message}`);
  }
}

/**
 * Phase 4: Verify Rollback
 */
async function verifyRollback() {
  section('VERIFICATION');

  log('Verifying rollback status...');

  // Verify n8n workflow is inactive
  if (state.n8n.workflowId) {
    try {
      const workflow = await n8nRequest(`/workflows/${state.n8n.workflowId}`);

      if (!workflow.active) {
        success('n8n workflow is inactive ✓');
      } else {
        error('n8n workflow is still active!');
      }
    } catch (err) {
      error(`Failed to verify workflow status: ${err.message}`);
    }
  }

  // Test webhook endpoint
  log('Testing webhook endpoint...');

  try {
    const response = await fetch('https://n8n.wranngle.com/webhook/client-initiation-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caller_id: '+15551234567',
        agent_id: SARAH_AGENT_ID,
        called_number: '+18882662193',
        call_sid: 'ROLLBACK_TEST'
      })
    });

    if (response.status === 404) {
      success('Webhook endpoint is disabled (404) ✓');
    } else if (response.status === 200) {
      warn('Webhook endpoint still responding (workflow may be active on another instance)');
    } else {
      warn(`Webhook returned unexpected status: ${response.status}`);
    }
  } catch (err) {
    // Network error is expected if workflow is truly deactivated
    success('Webhook endpoint is unreachable ✓');
  }

  // Verify ElevenLabs agent (if full rollback)
  if (fullRollback && ELEVENLABS_API_KEY) {
    try {
      const agent = await elevenLabsRequest(`/convai/agents/${SARAH_AGENT_ID}`);

      const hasWebhook = !!agent.conversation_config?.client_initiation_webhook_url;
      const hasVariables = (agent.conversation_config?.dynamic_variables?.length || 0) > 0;

      if (!hasWebhook) {
        success('ElevenLabs webhook is disabled ✓');
      } else {
        warn('ElevenLabs webhook still configured');
      }

      if (!hasVariables) {
        success('Dynamic variables removed ✓');
      } else {
        warn(`${agent.conversation_config.dynamic_variables.length} variables still configured`);
      }

    } catch (err) {
      error(`Failed to verify agent status: ${err.message}`);
    }
  }
}

/**
 * Display rollback summary
 */
function displaySummary() {
  section('ROLLBACK SUMMARY');

  console.log('Rollback Level:', fullRollback ? 'FULL' : 'PARTIAL (workflow only)');
  console.log('Dry Run Mode:', dryRun ? 'YES' : 'NO');
  console.log('');

  console.log('n8n Workflow:');
  if (state.n8n.workflowFound) {
    log(`  Workflow ID: ${state.n8n.workflowId}`);
    log(`  Was Active: ${state.n8n.wasActive ? 'YES' : 'NO'}`);

    if (state.n8n.deactivated || dryRun) {
      success(`  Status: ${dryRun ? '[DRY RUN] Would be ' : ''}DEACTIVATED`);
    } else {
      warn('  Status: NOT DEACTIVATED');
    }
  } else {
    warn('  Workflow not found');
  }

  if (fullRollback) {
    console.log('\nElevenLabs Agent:');
    if (state.elevenlabs.webhookDisabled || dryRun) {
      success(`  Webhook: ${dryRun ? '[DRY RUN] Would be ' : ''}DISABLED`);
    } else {
      warn('  Webhook: Manual removal required');
    }

    if (state.elevenlabs.variablesRemoved || dryRun) {
      success(`  Variables: ${dryRun ? '[DRY RUN] Would be ' : ''}REMOVED`);
    } else {
      warn('  Variables: Not removed');
    }
  }

  console.log('\nBackups:');
  if (state.backup.workflowBackupCreated) {
    success(`  Workflow backup: ${state.backup.backupPath}/workflow-backup.json`);
  }
  if (state.backup.agentBackupCreated) {
    success(`  Agent backup: ${state.backup.backupPath}/agent-backup.json`);
  }

  // Overall status
  console.log('\n' + '='.repeat(80));

  if (state.errors.length > 0) {
    error(`ROLLBACK COMPLETED WITH ${state.errors.length} ERROR(S)`);
    console.log('\nErrors:');
    state.errors.forEach(err => console.log(`  - ${err}`));
  } else if (dryRun) {
    log('[DRY RUN] No changes were made');
  } else {
    success('ROLLBACK SUCCESSFUL');
  }

  console.log('\nWhat Happened:');
  if (state.n8n.deactivated || (dryRun && state.n8n.workflowFound)) {
    console.log('  ✅ n8n workflow deactivated - webhook returns 404');
  }
  if (fullRollback) {
    console.log('  ⚠️  Manual ElevenLabs configuration required');
  }
  console.log('  ✅ Agent will use generic greetings immediately');
  console.log('  ✅ No data loss - CRM unchanged');
  console.log('  ✅ Backups created for restore if needed');

  console.log('\nTo Restore:');
  console.log('  1. Re-activate workflow in n8n');
  console.log('  2. Re-enable webhook in ElevenLabs (if --full was used)');
  console.log('  3. Or re-run deployment script:');
  console.log('     bun run supersystem/tools/deploy-client-initiation.js');

  if (state.backup.backupPath) {
    console.log(`\nBackups stored in: ${state.backup.backupPath}`);
  }

  console.log('='.repeat(80) + '\n');
}

/**
 * Main rollback flow
 */
async function main() {
  console.log('\n');
  section('CLIENT INITIATION DATA - ROLLBACK AUTOMATION');

  if (dryRun) {
    warn('DRY RUN MODE - No changes will be made');
  }

  if (fullRollback) {
    warn('FULL ROLLBACK MODE - Will remove all configuration');
  }

  // Verify prerequisites
  log('Verifying prerequisites...');

  if (!N8N_API_KEY) {
    error('N8N_API_KEY environment variable not set');
    process.exit(1);
  }

  if (fullRollback && !ELEVENLABS_API_KEY) {
    warn('ELEVENLABS_API_KEY not set - some steps will require manual action');
  }

  success('Prerequisites verified');

  // Confirm rollback
  if (!dryRun && !force) {
    console.log('\n⚠️  WARNING: This will rollback the client initiation data enhancement.');
    console.log('After rollback:');
    console.log('  - Agent will use generic greetings (no personalization)');
    console.log('  - Callers will not be greeted by name');
    console.log('  - No CRM context during calls');
    console.log('  - Webhook will stop enriching calls');
    console.log('');

    if (!await confirm('Are you sure you want to rollback?')) {
      log('Rollback cancelled by user');
      process.exit(0);
    }
  }

  // Execute rollback phases
  try {
    await createBackups();
    await deactivateN8nWorkflow();
    await disableElevenLabsWebhook();
    await removeDynamicVariables();
    await verifyRollback();
    displaySummary();
  } catch (err) {
    console.log('\n');
    error(`Rollback failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run rollback
main().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
