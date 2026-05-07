#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HOOK: pre_deploy_check.js
 * EVENT: PreToolUse
 * PURPOSE: Pre-deployment validation for n8n workflows
 * ENFORCEMENT: ADVISORY
 *
 * Checks: validation, nodes, n8n status.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const {logHook, readStdinJson, outputResult, getProjectRoot} = require('../hook_utils');

const projectDir = getProjectRoot();
const stateFile = path.join(projectDir, '.claude', 'logs', 'session-state.json');

function getSessionState() {
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {n8nUp: true};
  } // Assume up if no state
}

async function main() {
  logHook('pre-deploy-check', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolInput = data.tool_input || {};
    const toolName = data.tool_name || '';
    const transcriptPath = data.transcript_path;

    const issues: string[] = [];
    const isPartialUpdate = toolName.includes('partial');
    const isFullCreate = toolName.includes('create');
    const nodes = toolInput.nodes || [];

    // Check 1: Name required (only for create operations, not partial updates)
    if (isFullCreate && (!toolInput.name?.trim())) {
      logHook('pre-deploy-check', 'BLOCKED: No name for create');
      outputResult({continue: false, reason: 'Workflow needs a name for creation'});
      process.exit(2);
    }

    // Check 2: Nodes array exists and not empty (only for full creates/updates, not partial)
    if (!isPartialUpdate && nodes.length === 0) {
      issues.push('empty workflow (0 nodes)');
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
      issues,
    });

    // Always output JSON - warn if issues, allow if none
    if (issues.length > 0) {
      outputResult({
        continue: true,
        systemMessage: `⚠️ Deploy warning: ${issues.join(', ')}`,
      });
    } else {
      outputResult({continue: true});
    }

    process.exit(0);
  } catch (error: unknown) {
    logHook('pre-deploy-check', 'Error', {error: (error as Error).message});
    outputResult({continue: true}); // Fail open with JSON output
    process.exit(0);
  }
}

main();
