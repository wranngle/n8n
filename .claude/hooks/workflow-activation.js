#!/usr/bin/env node
/**
 * workflow-activation.js
 *
 * WORKFLOW ACTIVATION AUTOMATION
 * ==============================
 *
 * Hook: PostToolUse (n8n_create_workflow)
 *
 * After workflow creation, provides activation instructions.
 * Methods in priority order:
 * 1. n8n API PATCH /api/v1/workflows/{id} with {active: true}
 * 2. n8n-instance MCP if available
 * 3. Scrapling browser automation fallback
 *
 * Note: n8n-mcp does NOT have activation capability.
 * Must use direct n8n API or browser automation.
 */

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const PROJECT_ROOT = getProjectRoot();
const N8N_BASE_URL = process.env.N8N_URL || 'https://n8n.wranngle.com';

/**
 * Generate activation instructions
 * @param {string} workflowId - Workflow ID
 * @param {string} workflowName - Workflow name
 * @returns {string} - Activation instructions
 */
function generateActivationInstructions(workflowId, workflowName) {
  return `
🔌 WORKFLOW ACTIVATION REQUIRED: "${workflowName}" (${workflowId})

OPTION 1: Direct n8n API (PREFERRED)
────────────────────────────────────
Use n8n_update_partial_workflow to activate:

mcp__n8n-mcp__n8n_update_partial_workflow({
  id: "${workflowId}",
  operations: [
    { type: "updateSettings", settings: { active: true } }
  ]
})

Or via HTTP Request node/Bash:

curl -X PATCH "${N8N_BASE_URL}/api/v1/workflows/${workflowId}" \\
  -H "X-N8N-API-KEY: $N8N_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"active": true}'

OPTION 2: Scrapling Browser Automation (FALLBACK)
─────────────────────────────────────────────────
If API fails, use Scrapling MCP:

1. Navigate to workflow:
   mcp__scrapling-mcp__scrapling_navigate({
     url: "${N8N_BASE_URL}/workflow/${workflowId}",
     headless: false
   })

2. Find and click activation toggle:
   mcp__scrapling-mcp__scrapling_css({
     selector: "[data-test-id='workflow-activate-button'], .el-switch, button[class*='activate']"
   })

3. Click the toggle:
   mcp__scrapling-mcp__scrapling_click({
     selector: "[data-test-id='workflow-activate-button']"
   })

VERIFICATION:
────────────
Check workflow is active:

mcp__n8n-mcp__n8n_get_workflow({ id: "${workflowId}" })
// Look for: "active": true
`;
}

/**
 * Generate activation script for batch operations
 * @param {Array<{id: string, name: string}>} workflows - Workflows to activate
 * @returns {string} - PowerShell script content
 */
function generateActivationScript(workflows) {
  const script = `
# Workflow Activation Script
# Generated: ${new Date().toISOString()}
# Usage: .\\activate-workflows.ps1

$n8nUrl = $env:N8N_URL ?? "https://n8n.wranngle.com"
$apiKey = $env:N8N_API_KEY

if (-not $apiKey) {
    Write-Error "N8N_API_KEY environment variable not set"
    exit 1
}

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

${workflows.map(w => `
# Activate: ${w.name}
try {
    $response = Invoke-RestMethod -Uri "$n8nUrl/api/v1/workflows/${w.id}" \`
        -Method PATCH \`
        -Headers $headers \`
        -Body '{"active": true}'
    Write-Host "[OK] Activated: ${w.name} (${w.id})"
} catch {
    Write-Error "[FAIL] ${w.name}: $($_.Exception.Message)"
}
`).join('')}

Write-Host "Activation complete."
`;

  return script;
}

/**
 * Main hook handler
 */
async function main() {
  logHook('workflow-activation', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolName = data.tool_name || '';
    const toolOutput = data.tool_output || {};
    const hookType = data.hook_event_name || 'PostToolUse';

    // Only process on PostToolUse for workflow creation
    if (hookType !== 'PostToolUse' || !toolName.includes('n8n_create_workflow')) {
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    // Extract workflow ID and name from output
    let workflowId, workflowName;

    try {
      const output = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;
      workflowId = output.id || output.workflow?.id;
      workflowName = output.name || output.workflow?.name;
    } catch (e) {
      logHook('workflow-activation', 'Failed to parse output', { error: e.message });
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    if (!workflowId) {
      logHook('workflow-activation', 'No workflow ID found in output');
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    // Generate and output activation instructions
    const instructions = generateActivationInstructions(workflowId, workflowName || 'Unnamed');

    logHook('workflow-activation', 'Generated activation instructions', {
      workflowId,
      workflowName
    });

    outputResult({
      continue: true,
      systemMessage: instructions
    });

    process.exit(0);

  } catch (e) {
    logHook('workflow-activation', 'Error', { error: e.message });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  generateActivationInstructions,
  generateActivationScript,
  N8N_BASE_URL
};

// Run if called directly
if (require.main === module) {
  main();
}
