/**
 * Hook: if-node-warning
 * Type: PreToolUse
 * Triggers: When creating workflows with IF nodes
 * 
 * Purpose: Warn about known IF node v2 bugs and suggest Switch node instead
 */

const fs = require('fs');
const path = require('path');

function checkForIfNode(toolInput) {
  const inputStr = JSON.stringify(toolInput).toLowerCase();
  
  // Check if creating/updating workflow with IF node
  if (inputStr.includes('"n8n-nodes-base.if"') || 
      inputStr.includes('type": "if"') ||
      inputStr.includes('if node')) {
    return true;
  }
  return false;
}

function main() {
  const toolName = process.env.CLAUDE_TOOL_NAME || '';
  const toolInput = process.env.CLAUDE_TOOL_INPUT || '{}';
  
  // Only check workflow creation/update tools
  const workflowTools = [
    'mcp__n8n-mcp__n8n_create_workflow',
    'mcp__n8n-mcp__n8n_update_full_workflow',
    'mcp__n8n-mcp__n8n_update_partial_workflow',
    'Write'
  ];
  
  if (!workflowTools.some(t => toolName.includes(t))) {
    return;
  }
  
  try {
    const input = JSON.parse(toolInput);
    
    if (checkForIfNode(input)) {
      console.log(JSON.stringify({
        decision: "block",
        reason: `⚠️ IF NODE BUG WARNING

Known Issue: n8n IF node v2.2 has documented routing bugs (GitHub #12237, #11877, #21334).
The IF node may incorrectly route ALL data to TRUE branch regardless of condition.

CANONICAL SOLUTION: Use Switch node instead of IF node for routing logic.

See: context/known-bugs/n8n-if-node-v2.md

Recommendation: Replace IF node with Switch node using explicit route_decision field.`
      }));
      return;
    }
  } catch (e) {
    // Silently continue if parsing fails
  }
  
  // Allow by default - exit silently
  process.exit(0);
}

main();
