#!/usr/bin/env node
/**
 * pre-deploy-check.js
 * Hook: PreToolUse (n8n_create_workflow)
 * FIXES: Always warn if no validation, check nodes, check n8n status, proper output
 */

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const projectDir = getProjectRoot();
const stateFile = path.join(projectDir, '.claude', 'logs', 'session-state.json');

function getSessionState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch { return { n8nUp: true }; } // Assume up if no state
}

async function main() {
  logHook('pre-deploy-check', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolInput = data.tool_input || {};
    const toolName = data.tool_name || '';
    const transcriptPath = data.transcript_path;

    const issues = [];
    const isPartialUpdate = toolName.includes('partial');
    const isFullCreate = toolName.includes('create');

    // Check 1: Name required (only for create operations, not partial updates)
    if (isFullCreate && (!toolInput.name || !toolInput.name.trim())) {
      logHook('pre-deploy-check', 'BLOCKED: No name for create');
      outputResult({ decision: 'block', reason: 'Workflow needs a name for creation' });
      process.exit(2);
    }

    // Check 2: Nodes array exists and not empty (only for full creates/updates, not partial)
    if (!isPartialUpdate) {
      const nodes = toolInput.nodes || [];
      if (nodes.length === 0) {
        issues.push('empty workflow (0 nodes)');
      }
    }

    // Check 3: n8n instance status
    const state = getSessionState();
    if (!state.n8nUp) {
      issues.push('n8n instance unreachable');
    }

    // Check 4: Validation performed (best effort - transcript may not exist)
    let validationFound = false;
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      const content = fs.readFileSync(transcriptPath, 'utf8');
      validationFound = content.includes('validate_workflow') || content.includes('validate_node');
    }
    if (!validationFound) {
      issues.push('no validation detected');
    }

    logHook('pre-deploy-check', 'Analysis', {
      name: toolInput.name,
      nodeCount: nodes.length,
      n8nUp: state.n8nUp,
      validationFound,
      issues
    });

    // Output warnings if any issues
    if (issues.length > 0) {
      outputResult({
        continue: true, // Warn but allow
        systemMessage: `⚠️ Deploy warning: ${issues.join(', ')}`
      });
    }

    process.exit(0);
  } catch (e) {
    logHook('pre-deploy-check', 'Error', { error: e.message });
    process.exit(0);
  }
}

main();
