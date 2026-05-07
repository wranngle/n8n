#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HOOK: if_node_warning.js
 * EVENT: PreToolUse
 * PURPOSE: Warn about IF node bugs, suggest Switch node
 * ENFORCEMENT: ADVISORY
 *
 * Known Issue: n8n IF node v2.2 has documented routing bugs.
 * See: context/known-bugs/n8n-if-node-v2.md
 */

const {logHook, readStdinJson, outputResult} = require('../hook_utils');

// Workflow-related tools that should be checked
const WORKFLOW_TOOLS = [
  'n8n_create_workflow',
  'n8n_update_full_workflow',
  'n8n_update_partial_workflow',
];

/**
 * Check if tool input contains IF node references
 */
function checkForIfNode(toolInput) {
  if (!toolInput) {
    return false;
  }

  const inputString = JSON.stringify(toolInput).toLowerCase();

  // Check for IF node type references
  if (inputString.includes('"n8n-nodes-base.if"')
    || inputString.includes('"type":"if"')
    || inputString.includes('"type": "if"')
    || inputString.includes('nodes-base.if')) {
    return true;
  }

  // Check nodes array if present
  const nodes = toolInput.nodes || [];
  for (const node of nodes) {
    if (node.type?.toLowerCase().includes('.if')) {
      return true;
    }
  }

  // Check operations for partial updates
  const operations = toolInput.operations || [];
  for (const op of operations) {
    if (op.node?.type?.toLowerCase().includes('.if')) {
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
      hasNodes: Boolean(toolInput.nodes),
      hasOperations: Boolean(toolInput.operations),
    });

    // Only check workflow tools
    const isWorkflowTool = WORKFLOW_TOOLS.some(t => toolName.includes(t));

    if (!isWorkflowTool) {
      outputResult({continue: true});
      process.exit(0);
    }

    // Check for IF node - ADVISORY WARNING (not blocking)
    if (checkForIfNode(toolInput)) {
      logHook('if-node-warning', 'IF node detected - warning', {toolName});

      // Advisory mode - warn but allow
      process.stderr.write(`⚠️ IF NODE WARNING (Advisory)

Known Issue: n8n IF node v2.2 has documented routing bugs (GitHub #12237, #11877, #21334).
The IF node may incorrectly route ALL data to TRUE branch regardless of condition.

RECOMMENDED: Use Switch node instead of IF node for routing logic.

Reference: context/known-bugs/n8n-if-node-v2.md

Proceeding anyway - monitor for routing issues in production.
`);
      outputResult({continue: true});
      process.exit(0);
    }

    // No IF node found - allow
    outputResult({continue: true});
    process.exit(0);
  } catch (error: unknown) {
    logHook('if-node-warning', 'Error', {error: (error as Error).message, stack: (error as Error).stack});
    outputResult({continue: true}); // Fail open
    process.exit(0);
  }
}

main();

export {};
