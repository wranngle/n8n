#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HOOK: workflow_governance.js
 * EVENT: PreToolUse
 * PURPOSE: DEV-only workflow modifications, deletion blocking
 * ENFORCEMENT: BLOCKING
 *
 * WORKFLOW HYGIENE & ANTIPOLLUTION SYSTEM
 * ========================================
 *
 * DEV-ONLY POLICY (v2.0):
 * - Only two phases: DEV and ARCHIVED
 * - ALPHA/BETA/GA/PROD are NOT USED
 * - All active work is DEV phase
 * - Deprecated/superseded workflows are ARCHIVED
 *
 * Core principles:
 * - Deletion BLOCKED, archiving REQUIRED for superseded workflows
 * - Only DEV workflows can be modified
 * - ARCHIVED workflows are read-only
 * - Before creating, check for similar existing workflows
 * - New workflows auto-tagged as DEV
 *
 * Hook types:
 * - PreToolUse: n8n_create_workflow, n8n_update_*, n8n_delete_workflow
 * - PostToolUse: Auto-tag new workflows as DEV
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const os = require('node:os');
const yaml = require('js-yaml');
const {logHook, readStdinJson, outputResult, getProjectRoot} = require('../hook_utils');

const PROJECT_ROOT = getProjectRoot();

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHICAL SEQUENTIAL DEVELOPMENT INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

let schemaRegistry: any = null;
let hookAuditSystem: any = null;

try {
  const claudeDir = path.join(os.homedir(), '.claude');
  schemaRegistry = require(path.join(claudeDir, 'utils', 'schema_registry'));
  hookAuditSystem = require(path.join(claudeDir, 'hooks', 'hook_audit_system'));
} catch {
  // Registry not available - proceed without verification tracking
}

// Map governance phases to verification states
const PHASE_TO_VERIFICATION_STATE = {
  DEV: 'UNTESTED', // New/dev workflows start untested
  ALPHA: 'RUNTIME', // Alpha = at least runtime validated
  BETA: 'MOCKED', // Beta = has mocked tests
  PROD: 'INTEGRATED', // Production = integrated testing
  GA: 'VERIFIED', // General Availability = fully verified
  ARCHIVED: 'VERIFIED', // Archived = was verified before archival
};

// Type definitions
type WorkflowMeta = {
  name: string;
  description?: string;
  phase?: string;
};

const REGISTRY_PATH = path.join(PROJECT_ROOT, 'workflows', 'registry.yaml');
const GOVERNANCE_PATH = path.join(PROJECT_ROOT, 'workflows', 'governance.yaml');

// PHASE SYSTEM:
// - If workflow has TAGS: Use actual n8n tags (dev, alpha, beta, prod, archived)
// - If workflow has NO TAGS: Use name prefix [DEV], [ALPHA], [BETA], [PROD], [ARCHIVED]
// - Only DEV phase can be modified by Claude
const PHASES = ['DEV', 'ALPHA', 'BETA', 'PROD', 'ARCHIVED'];
const MODIFIABLE_PHASES = ['DEV']; // Only DEV can be modified by Claude
const PROTECTED_PHASES = ['ALPHA', 'BETA', 'PROD', 'ARCHIVED']; // Require user approval

// Tag name mappings (n8n tags are lowercase)
const TAG_TO_PHASE = {
  dev: 'DEV',
  development: 'DEV',
  alpha: 'ALPHA',
  beta: 'BETA',
  prod: 'PROD',
  production: 'PROD',
  archived: 'ARCHIVED',
  deprecated: 'ARCHIVED',
};

/**
 * Parse phase from n8n tags array
 * @param {Array} tags - Array of tag objects or strings from n8n
 * @returns {string|null} Phase name or null if no phase tag found
 */
function parsePhaseFromTags(tags) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  for (const tag of tags) {
    // Tags can be objects {id, name} or strings
    const tagName = (typeof tag === 'string' ? tag : tag.name || '').toLowerCase();

    if (TAG_TO_PHASE[tagName]) {
      return TAG_TO_PHASE[tagName];
    }
  }

  return null; // No phase tag found, but workflow HAS tags
}

/**
 * Parse phase from name prefix [DEV], [ALPHA], etc.
 * @param {string} name - Workflow name
 * @returns {string|null} Phase name or null if no prefix found
 */
function parsePhaseFromName(name) {
  if (!name) {
    return null;
  }

  const match = name.match(/^\[([A-Z]+)]\s+/);
  if (match && PHASES.includes(match[1])) {
    return match[1];
  }

  return null;
}

/**
 * Check if name has proper phase prefix
 */
function hasPhasePrefix(name) {
  return parsePhaseFromName(name) !== null;
}

/**
 * Add phase prefix to name
 */
function addPhasePrefix(name, phase = 'DEV') {
  const cleanName = name.replace(/^\[[A-Z]+]\s+/, '');
  return `[${phase}] ${cleanName}`;
}

/**
 * Determine workflow phase using tags-first, prefix-fallback strategy
 * @param {object} workflow - Workflow object with tags and name
 * @returns {{ phase: string, source: 'tags'|'prefix'|'default', hasTags: boolean }}
 */
function determinePhase(workflow) {
  const tags = workflow.tags || [];
  const name = workflow.name || '';
  const hasTags = tags.length > 0;

  // PRIORITY 1: If workflow has tags, use tags
  if (hasTags) {
    const phaseFromTags = parsePhaseFromTags(tags);
    if (phaseFromTags) {
      return {phase: phaseFromTags, source: 'tags', hasTags: true};
    }

    // Has tags but none are phase tags - treat as DEV
    return {phase: 'DEV', source: 'tags', hasTags: true};
  }

  // PRIORITY 2: If no tags, check name prefix
  const phaseFromName = parsePhaseFromName(name);
  if (phaseFromName) {
    return {phase: phaseFromName, source: 'prefix', hasTags: false};
  }

  // DEFAULT: No tags, no prefix - assume DEV but flag as untagged
  return {phase: 'DEV', source: 'default', hasTags: false};
}

/**
 * Load governance configuration
 */
function loadGovernance() {
  try {
    if (fs.existsSync(GOVERNANCE_PATH)) {
      return yaml.load(fs.readFileSync(GOVERNANCE_PATH, 'utf8'));
    }
  } catch (error: unknown) {
    logHook('governance', 'Failed to load governance.yaml', {error: (error as Error).message});
  }

  return {workflows: {}, settings: {}};
}

/**
 * Save governance configuration
 */
function saveGovernance(governance) {
  try {
    fs.writeFileSync(GOVERNANCE_PATH, yaml.dump(governance, {lineWidth: 120}));
    return true;
  } catch (error: unknown) {
    logHook('governance', 'Failed to save governance.yaml', {error: (error as Error).message});
    return false;
  }
}

/**
 * Load workflow registry
 */
function loadRegistry() {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      return yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    }
  } catch (error: unknown) {
    logHook('governance', 'Failed to load registry.yaml', {error: (error as Error).message});
  }

  return {workflows: {}};
}

/**
 * Get workflow phase from governance
 * Checks both main workflows section and overflow_workflows section
 */
function getWorkflowPhase(workflowId, workflowName) {
  const governance = loadGovernance();

  // Check main workflows section by ID first
  if (governance.workflows?.[workflowId]) {
    return governance.workflows[workflowId].phase || 'DEV';
  }

  // Check overflow_workflows section by ID
  if (governance.overflow_workflows?.[workflowId]) {
    return governance.overflow_workflows[workflowId].phase || 'DEV';
  }

  // Check main workflows by name (fallback)
  if (governance.workflows) {
    for (const [id, meta] of Object.entries(governance.workflows) as [string, WorkflowMeta][]) {
      if (meta.name === workflowName) {
        return meta.phase || 'DEV';
      }
    }
  }

  // Check overflow_workflows by name (fallback)
  if (governance.overflow_workflows) {
    for (const [id, meta] of Object.entries(governance.overflow_workflows) as [string, WorkflowMeta][]) {
      if (meta.name === workflowName) {
        return meta.phase || 'DEV';
      }
    }
  }

  return undefined; // Not tracked yet
}

/**
 * Calculate similarity between two workflow names/descriptions
 * Returns score 0-100
 */
function calculateSimilarity(string1, string2) {
  if (!string1 || !string2) {
    return 0;
  }

  string1 = string1.toLowerCase().replaceAll(/[^a-z\d\s]/g, '');
  string2 = string2.toLowerCase().replaceAll(/[^a-z\d\s]/g, '');

  const words1 = new Set(string1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(string2.split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return Math.round((intersection / union) * 100);
}

/**
 * Find similar workflows in registry and governance
 */
function findSimilarWorkflows(name, description = '') {
  const registry = loadRegistry();
  const governance = loadGovernance();
  const searchText = `${name} ${description}`;
  type WorkflowMatch = {
    id: string; name: string; description?: string; similarity: number; phase: string; path?: string;
  };
  const matches: WorkflowMatch[] = [];

  // Check registry workflows
  type RegistryWorkflow = {
    n8n_id?: string; description?: string; path?: string;
  };
  if (registry.workflows) {
    for (const [key, workflow] of Object.entries(registry.workflows) as [string, RegistryWorkflow][]) {
      const workflowText = `${key} ${workflow.description || ''}`;
      const score = calculateSimilarity(searchText, workflowText);
      if (score >= 30) {
        const workflowId = workflow.n8n_id || key;
        matches.push({
          id: workflowId,
          name: key,
          description: workflow.description,
          similarity: score,
          phase: (governance.workflows && workflowId && governance.workflows[workflowId]?.phase) || 'UNTRACKED',
          path: workflow.path,
        });
      }
    }
  }

  // Check governance tracked workflows
  type GovMeta = {
    name: string; description?: string; phase?: string;
  };
  if (governance.workflows) {
    for (const [id, meta] of Object.entries(governance.workflows) as [string, GovMeta][]) {
      const workflowText = `${meta.name} ${meta.description || ''}`;
      const score = calculateSimilarity(searchText, workflowText);
      if (score >= 30 && !matches.find(m => m.id === id)) {
        matches.push({
          id,
          name: meta.name,
          description: meta.description,
          similarity: score,
          phase: meta.phase || 'DEV',
        });
      }
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Register a new workflow in governance
 */
function registerWorkflow(workflowId, name, phase = 'DEV') {
  const governance = loadGovernance();

  governance.workflows ||= {};

  governance.workflows[workflowId] = {
    name,
    phase,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    history: [{
      action: 'created',
      phase,
      timestamp: new Date().toISOString(),
    }],
  };

  saveGovernance(governance);
  logHook('governance', 'Registered workflow', {workflowId, name, phase});

  // HIERARCHICAL SEQUENTIAL DEVELOPMENT: Register in schema registry
  syncWorkflowVerificationState(workflowId, name, phase, 'workflow_created');
}

/**
 * Sync workflow phase to verification state in schema registry
 * @param {string} workflowId - n8n workflow ID
 * @param {string} name - Workflow name
 * @param {string} phase - Governance phase
 * @param {string} triggeredBy - What triggered this sync
 */
function syncWorkflowVerificationState(workflowId, name, phase, triggeredBy = 'governance') {
  if (!schemaRegistry) {
    return;
  }

  try {
    const workflowPath = `n8n://workflows/${workflowId}`;
    let workflowObject = schemaRegistry.getObjectByPath(workflowPath);
    const targetState = PHASE_TO_VERIFICATION_STATE[phase] || 'UNTESTED';

    if (!workflowObject) {
      // Register new workflow as Level 6 (Orchestration)
      workflowObject = schemaRegistry.registerObject(workflowPath, {
        identifier: name,
        level: 6,
        goal: `n8n workflow: ${name} (${phase})`,
        dependencies: [],
      });
    }

    const previousState = workflowObject.state;

    // Only advance or maintain state, don't regress unless explicit
    const stateOrder = ['UNTESTED', 'RUNTIME', 'MOCKED', 'INTEGRATED', 'VERIFIED'];
    const currentIndex = stateOrder.indexOf(previousState);
    const targetIndex = stateOrder.indexOf(targetState);

    if (targetIndex > currentIndex) {
      // Advance state
      schemaRegistry.updateState(workflowObject.id, targetState, {
        reason: `Governance phase ${phase} implies ${targetState} verification`,
        triggeredBy,
      });

      // Record in audit system
      if (hookAuditSystem) {
        hookAuditSystem.recordVerificationChange(
          workflowObject.id,
          previousState,
          targetState,
          'workflow_governance',
        );
      }

      logHook('governance', 'Verification state synced', {
        workflowId,
        phase,
        previousState,
        newState: targetState,
      });
    }
  } catch (error: unknown) {
    logHook('governance', 'Verification sync failed', {error: (error as Error).message});
  }
}

/**
 * Get verification state summary for a workflow
 * @param {string} workflowId - n8n workflow ID
 * @returns {object|null} Verification info or null
 */
function getWorkflowVerificationInfo(workflowId) {
  if (!schemaRegistry) {
    return null;
  }

  try {
    const workflowPath = `n8n://workflows/${workflowId}`;
    const workflowObject = schemaRegistry.getObjectByPath(workflowPath);
    if (workflowObject) {
      return {
        state: workflowObject.state,
        level: workflowObject.level,
        canBeFoundation: workflowObject.state === 'VERIFIED',
      };
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Handle pre-create workflow check
 */
async function handlePreCreate(toolInput) {
  const name = toolInput.name || '';
  const nodes = toolInput.nodes || [];

  logHook('governance', 'Pre-create check', {name, nodeCount: nodes.length});

  // Find similar existing workflows
  const similar = findSimilarWorkflows(name);

  if (similar.length > 0) {
    const top = similar[0];

    if (top.similarity >= 70) {
      // Very similar - strongly suggest clone
      return {
        continue: true,
        systemMessage: `⚠️ GOVERNANCE: Found very similar workflow "${top.name}" (${top.similarity}% match, phase: ${top.phase}).
Consider cloning instead of creating new. Use n8n_get_workflow(id: "${top.id}") to review.
If you proceed, this will be tagged as DEV phase.`,
      };
    }

    if (top.similarity >= 40) {
      // Somewhat similar - inform
      const topMatches = similar.slice(0, 3).map(m =>
        `  - "${m.name}" (${m.similarity}% match, ${m.phase})`).join('\n');

      return {
        continue: true,
        systemMessage: `📋 GOVERNANCE: Found similar workflows:\n${topMatches}
New workflow will be tagged as DEV phase.`,
      };
    }
  }

  // No similar workflows - proceed with DEV tag reminder
  return {
    continue: true,
    systemMessage: `📋 GOVERNANCE: No similar workflows found. New workflow "${name}" will be auto-tagged as DEV phase.
Remember: Workflows without phase tags are grounds for archival review.`,
  };
}

/**
 * Handle pre-update workflow check
 * Uses tags-first, prefix-fallback strategy
 * Only DEV phase can be modified by Claude
 */
async function handlePreUpdate(toolInput) {
  const workflowId = toolInput.id;
  const name = toolInput.name || '';
  const tags = toolInput.tags || [];

  if (!workflowId) {
    return {continue: true}; // Can't check without ID
  }

  // Determine phase from tags or name prefix
  const phaseInfo = determinePhase({name, tags});

  logHook('governance', 'Pre-update check', {
    workflowId,
    name,
    phase: phaseInfo.phase,
    source: phaseInfo.source,
    hasTags: phaseInfo.hasTags,
  });

  // Check governance.yaml for override
  const governancePhase = getWorkflowPhase(workflowId, name);

  // Use governance phase if tracked, otherwise use detected phase
  const effectivePhase = governancePhase || phaseInfo.phase;

  // RULE: Only DEV can be modified by Claude
  if (!MODIFIABLE_PHASES.includes(effectivePhase)) {
    return {
      continue: false,
      reason: `❌ GOVERNANCE BLOCKED: Workflow "${name}" is in ${effectivePhase} phase.

**RULE**: Only [DEV] workflows can be modified by Claude.
**Phase source**: ${phaseInfo.source === 'tags' ? 'n8n tags' : (phaseInfo.source === 'prefix' ? 'name prefix' : 'default (untagged)')}

To proceed:
1. Ask the user to explicitly approve modification of ${effectivePhase} workflow
2. Or clone to a new [DEV] workflow for changes
3. Or change the workflow's tag/prefix to DEV first`,
    };
  }

  // Check for untagged workflows (no tags AND no prefix)
  if (phaseInfo.source === 'default' && !governancePhase) {
    return {
      continue: true,
      systemMessage: `⚠️ GOVERNANCE WARNING: Workflow "${name}" is UNTAGGED.
No n8n tags and no [PHASE] prefix found.
**Recommendation**: Add a "dev" tag in n8n OR rename with [DEV] prefix.
Untagged workflows are grounds for archival review.`,
    };
  }

  // DEV phase - allow modification
  const sourceNote = phaseInfo.hasTags
    ? '(via n8n tag)'
    : (phaseInfo.source === 'prefix'
      ? '(via name prefix)'
      : '(default)');

  return {
    continue: true,
    systemMessage: `✅ GOVERNANCE: Workflow "${name}" is DEV ${sourceNote} - modification allowed.`,
  };
}

/**
 * Handle pre-delete workflow check - BLOCK deletion, suggest archiving
 */
async function handlePreDelete(toolInput) {
  const workflowId = toolInput.id;

  logHook('governance', 'Pre-delete BLOCKED', {workflowId});

  // BLOCK: Deletion is never allowed per governance policy
  return {
    continue: false,
    reason: `❌ GOVERNANCE BLOCKED: Workflow deletion is prohibited.

To properly retire a workflow:
1. Update the workflow name to include [ARCHIVED] prefix
2. Set the workflow to inactive
3. Update governance.yaml with phase: ARCHIVED

Use archiving instead of deletion to preserve audit trail.`,
  };
}

/**
 * Handle post-create - register new workflow as DEV
 */
async function handlePostCreate(toolInput, toolOutput) {
  try {
    const output = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;
    const workflowId = output.id || output.workflow?.id;
    const name = toolInput.name || output.name || output.workflow?.name;

    if (workflowId && name) {
      registerWorkflow(workflowId, name, 'DEV');
      return {
        continue: true,
        systemMessage: `✅ GOVERNANCE: Workflow "${name}" registered as DEV phase (ID: ${workflowId})`,
      };
    }
  } catch (error: unknown) {
    logHook('governance', 'Post-create registration failed', {error: (error as Error).message});
  }

  return {continue: true};
}

/**
 * Main hook handler
 */
async function main() {
  try {
    const data = await readStdinJson();

    // Get tool name and hook type from stdin data (not env vars)
    const toolName = data.tool_name || '';
    const hookType = data.hook_event_name || 'PreToolUse';
    const toolInput = data.tool_input || {};
    const toolOutput = data.tool_output || {};

    logHook('governance', `Hook triggered: ${hookType}`, {toolName, dataKeys: Object.keys(data)});

    let result: {continue: boolean; systemMessage?: string; reason?: string} = {continue: true};

    if (hookType === 'PreToolUse') {
      if (toolName.includes('n8n_create_workflow')) {
        result = await handlePreCreate(toolInput);
      } else if (toolName.includes('n8n_update') || toolName.includes('n8n_update_full') || toolName.includes('n8n_update_partial')) {
        result = await handlePreUpdate(toolInput);
      } else if (toolName.includes('n8n_delete_workflow')) {
        result = await handlePreDelete(toolInput);
      }
    } else if (hookType === 'PostToolUse' && toolName.includes('n8n_create_workflow')) {
      result = await handlePostCreate(toolInput, toolOutput);
    }

    outputResult(result);
    process.exit(result.continue ? 0 : 2);
  } catch (error: unknown) {
    logHook('governance', 'Error', {error: (error as Error).message, stack: (error as Error).stack});
    outputResult({continue: true}); // Fail open
    process.exit(0);
  }
}

// Export for testing
export {
  PHASES, MODIFIABLE_PHASES, PROTECTED_PHASES, TAG_TO_PHASE, PHASE_TO_VERIFICATION_STATE, parsePhaseFromTags, parsePhaseFromName, hasPhasePrefix, addPhasePrefix, determinePhase, calculateSimilarity, findSimilarWorkflows, getWorkflowPhase, registerWorkflow, // Hierarchical Sequential Development integration
  syncWorkflowVerificationState, getWorkflowVerificationInfo,
};

// Run if called directly
if (require.main === module) {
  main();
}
