#!/usr/bin/env node
/**
 * Deploy n8n Evaluation Workflow via API
 */

const fs = require('fs');
const path = require('path');

const N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmMjUxMmRkMS0wOTk0LTRjN2YtYWNmMS0wZWY4NDFhZjNhNjYiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2NDYwOTgzLCJleHAiOjE3NzQxNTIwMDB9.SyA7JvtVkYwzGQM3GJJVumG_PVQK4w3SbEFuoTsg16g';
const N8N_BASE = 'https://n8n.wranngle.com/api/v1';

async function checkExistingWorkflow(name) {
  const response = await fetch(`${N8N_BASE}/workflows`, {
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  if (!response.ok) {
    throw new Error(`Failed to list workflows: ${response.status}`);
  }
  const data = await response.json();
  return data.data?.find(w => w.name === name);
}

async function createWorkflow(workflow) {
  const response = await fetch(`${N8N_BASE}/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflow)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create workflow: ${response.status} - ${text}`);
  }
  return response.json();
}

async function activateWorkflow(id) {
  const response = await fetch(`${N8N_BASE}/workflows/${id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': N8N_API_KEY }
  });
  if (!response.ok) {
    console.log(`Warning: Could not activate workflow: ${response.status}`);
    return null;
  }
  return response.json();
}

async function main() {
  console.log('='.repeat(60));
  console.log('n8n Evaluation Workflow Deployer');
  console.log('='.repeat(60));

  // Load workflow JSON
  const workflowPath = path.join(__dirname, '..', 'tests', 'n8n-evaluation-results', 'evaluation-workflow.json');
  if (!fs.existsSync(workflowPath)) {
    console.error(`Workflow file not found: ${workflowPath}`);
    process.exit(1);
  }

  const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

  // Remove read-only fields that can't be set via API
  delete workflow.tags;
  delete workflow.id;

  console.log(`\nLoaded workflow: ${workflow.name}`);
  console.log(`Nodes: ${workflow.nodes.length}`);

  // Check if already exists
  console.log('\nChecking for existing workflow...');
  const existing = await checkExistingWorkflow(workflow.name);

  if (existing) {
    console.log(`✓ Workflow already exists: ID ${existing.id}`);
    console.log(`  URL: https://n8n.wranngle.com/workflow/${existing.id}`);
    return { success: true, action: 'exists', id: existing.id };
  }

  // Create new workflow
  console.log('\nCreating workflow...');
  try {
    const result = await createWorkflow(workflow);
    console.log(`✓ Workflow created: ID ${result.id}`);
    console.log(`  URL: https://n8n.wranngle.com/workflow/${result.id}`);

    // Try to activate (may fail for evaluation workflows)
    await activateWorkflow(result.id);

    return { success: true, action: 'created', id: result.id };
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

main()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('='.repeat(60));
  })
  .catch(console.error);
