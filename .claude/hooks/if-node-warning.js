#!/usr/bin/env node
/**
 * if-node-warning.js
 * Hook: PreToolUse
 * Triggers: When creating/updating workflows with IF nodes
 *
 * Purpose: Block IF node usage and suggest Switch node instead.
 * Known Issue: n8n IF node v2.2 has documented routing bugs.
 *
 * See: context/known-bugs/n8n-if-node-v2.md
 */

const { logHook, readStdinJson, outputResult } = require('./hook-utils');

// Workflow-related tools that should be checked
const WORKFLOW_TOOLS = [
  'n8n_create_workflow',
  'n8n_update_full_workflow',
  'n8n_update_partial_workflow'
];

/**
 * Check if tool input contains IF node references
 */
function checkForIfNode(toolInput) {
  if (!toolInput) return false;

  const inputStr = JSON.stringify(toolInput).toLowerCase();

  // Check for IF node type references
  if (inputStr.includes('"n8n-nodes-base.if"') ||
      inputStr.includes('"type":"if"') ||
      inputStr.includes('"type": "if"') ||
      inputStr.includes('nodes-base.if')) {
    return true;
  }

  // Check nodes array if present
  const nodes = toolInput.nodes || [];
  for (const node of nodes) {
    if (node.type && node.type.toLowerCase().includes('.if')) {
      return true;
    }
  }

  // Check operations for partial updates
  const operations = toolInput.operations || [];
  for (const op of operations) {
    if (op.node && op.node.type && op.node.type.toLowerCase().includes('.if')) {
      return true;
    }
  }

  return false;
}

async function main() {
  try {
    const data = await readStdinJson();

    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};

    logHook('if-node-warning', 'Hook triggered', {
      toolName,
      hasNodes: !!(toolInput.nodes),
      hasOperations: !!(toolInput.operations)
    });

    // Only check workflow tools
    const isWorkflowTool = WORKFLOW_TOOLS.some(t => toolName.includes(t));

    if (!isWorkflowTool) {
      outputResult({ continue: true });
      process.exit(0);
    }

    // Check for IF node
    if (checkForIfNode(toolInput)) {
      logHook('if-node-warning', 'IF node detected - blocking', { toolName });

      outputResult({
        continue: false,
        systemMessage: `⚠️ IF NODE BUG - BLOCKED

Known Issue: n8n IF node v2.2 has documented routing bugs (GitHub #12237, #11877, #21334).
The IF node may incorrectly route ALL data to TRUE branch regardless of condition.

CANONICAL SOLUTION: Use Switch node instead of IF node for routing logic.

Reference: context/known-bugs/n8n-if-node-v2.md

Action Required: Replace the IF node with a Switch node using explicit route_decision field.
The Switch node provides reliable conditional routing without the v2 bugs.`
      });
      process.exit(2); // Non-zero exit indicates block
    }

    // No IF node found - allow
    outputResult({ continue: true });
    process.exit(0);

  } catch (e) {
    logHook('if-node-warning', 'Error', { error: e.message, stack: e.stack });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

main();
