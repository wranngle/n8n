#!/usr/bin/env node
/**
 * workflow-governance.js
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

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const PROJECT_ROOT = getProjectRoot();
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'workflows', 'registry.yaml');
const GOVERNANCE_PATH = path.join(PROJECT_ROOT, 'workflows', 'governance.yaml');

// DEV-ONLY POLICY: Only DEV and ARCHIVED phases allowed
const PHASES = ['DEV', 'ARCHIVED'];
const MODIFIABLE_PHASES = ['DEV'];
const CLONABLE_PHASES = []; // No longer used - everything is DEV or ARCHIVED
const PROTECTED_PHASES = ['ARCHIVED']; // Only ARCHIVED is protected

/**
 * Load governance configuration
 */
function loadGovernance() {
  try {
    if (fs.existsSync(GOVERNANCE_PATH)) {
      return yaml.load(fs.readFileSync(GOVERNANCE_PATH, 'utf8'));
    }
  } catch (e) {
    logHook('governance', 'Failed to load governance.yaml', { error: e.message });
  }
  return { workflows: {}, settings: {} };
}

/**
 * Save governance configuration
 */
function saveGovernance(governance) {
  try {
    fs.writeFileSync(GOVERNANCE_PATH, yaml.dump(governance, { lineWidth: 120 }));
    return true;
  } catch (e) {
    logHook('governance', 'Failed to save governance.yaml', { error: e.message });
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
  } catch (e) {
    logHook('governance', 'Failed to load registry.yaml', { error: e.message });
  }
  return { workflows: {} };
}

/**
 * Get workflow phase from governance
 */
function getWorkflowPhase(workflowId, workflowName) {
  const governance = loadGovernance();
  
  // Check by ID first
  if (governance.workflows && governance.workflows[workflowId]) {
    return governance.workflows[workflowId].phase || 'DEV';
  }
  
  // Check by name (fallback)
  if (governance.workflows) {
    for (const [id, meta] of Object.entries(governance.workflows)) {
      if (meta.name === workflowName) {
        return meta.phase || 'DEV';
      }
    }
  }
  
  return null; // Not tracked yet
}

/**
 * Calculate similarity between two workflow names/descriptions
 * Returns score 0-100
 */
function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  str1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  str2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
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
  const matches = [];
  
  // Check registry workflows
  if (registry.workflows) {
    for (const [key, workflow] of Object.entries(registry.workflows)) {
      const workflowText = `${key} ${workflow.description || ''}`;
      const score = calculateSimilarity(searchText, workflowText);
      if (score >= 30) {
        matches.push({
          id: workflow.n8n_id || key,
          name: key,
          description: workflow.description,
          similarity: score,
          phase: governance.workflows?.[workflow.n8n_id]?.phase || 'UNTRACKED',
          path: workflow.path
        });
      }
    }
  }
  
  // Check governance tracked workflows
  if (governance.workflows) {
    for (const [id, meta] of Object.entries(governance.workflows)) {
      const workflowText = `${meta.name} ${meta.description || ''}`;
      const score = calculateSimilarity(searchText, workflowText);
      if (score >= 30 && !matches.find(m => m.id === id)) {
        matches.push({
          id,
          name: meta.name,
          description: meta.description,
          similarity: score,
          phase: meta.phase || 'DEV'
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
  
  if (!governance.workflows) {
    governance.workflows = {};
  }
  
  governance.workflows[workflowId] = {
    name,
    phase,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    history: [{
      action: 'created',
      phase,
      timestamp: new Date().toISOString()
    }]
  };
  
  saveGovernance(governance);
  logHook('governance', 'Registered workflow', { workflowId, name, phase });
}

/**
 * Handle pre-create workflow check
 */
async function handlePreCreate(toolInput) {
  const name = toolInput.name || '';
  const nodes = toolInput.nodes || [];
  
  logHook('governance', 'Pre-create check', { name, nodeCount: nodes.length });
  
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
If you proceed, this will be tagged as DEV phase.`
      };
    } else if (top.similarity >= 40) {
      // Somewhat similar - inform
      const topMatches = similar.slice(0, 3).map(m => 
        `  - "${m.name}" (${m.similarity}% match, ${m.phase})`
      ).join('\n');
      
      return {
        continue: true,
        systemMessage: `📋 GOVERNANCE: Found similar workflows:\n${topMatches}
New workflow will be tagged as DEV phase.`
      };
    }
  }
  
  // No similar workflows - proceed with DEV tag reminder
  return {
    continue: true,
    systemMessage: `📋 GOVERNANCE: No similar workflows found. New workflow "${name}" will be auto-tagged as DEV phase.
Remember: Workflows without phase tags are grounds for archival review.`
  };
}

/**
 * Handle pre-update workflow check
 */
async function handlePreUpdate(toolInput) {
  const workflowId = toolInput.id;
  const name = toolInput.name;
  
  if (!workflowId) {
    return { continue: true }; // Can't check without ID
  }
  
  const phase = getWorkflowPhase(workflowId, name);
  
  logHook('governance', 'Pre-update check', { workflowId, name, phase });
  
  if (phase === null) {
    // Not tracked - WARN and suggest archival triage
    return {
      continue: true,
      systemMessage: `⚠️ GOVERNANCE: Workflow "${name}" is UNTAGGED (not in governance.yaml).
Untagged workflows are grounds for archival review.
ACTION REQUIRED: After this update, add workflow to governance.yaml with appropriate phase.
If this is active work, assign DEV phase. If deprecated, assign ARCHIVED.`
    };
  }
  
  if (phase === 'ARCHIVED') {
    // ARCHIVED phase - BLOCK modification
    return {
      continue: false,
      systemMessage: `❌ GOVERNANCE BLOCKED: Workflow "${name}" is ARCHIVED.
Archived workflows cannot be modified. Clone to a new DEV workflow if you need to resurrect this.`
    };
  }

  // DEV phase - allow (this is the only active phase)
  return {
    continue: true,
    systemMessage: `✅ GOVERNANCE: Workflow "${name}" is in DEV phase - modification allowed.`
  };
}

/**
 * Handle pre-delete workflow check - WARN but allow (fail gracefully)
 */
async function handlePreDelete(toolInput) {
  const workflowId = toolInput.id;
  
  logHook('governance', 'Pre-delete warning', { workflowId });
  
  // FAIL GRACEFULLY: Warn but allow deletion to proceed
  return {
    continue: true,
    systemMessage: `⚠️ GOVERNANCE WARNING: Deleting workflow ${workflowId}.
Consider archiving instead of deleting for audit trail.
Proceeding with deletion as requested.`
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
        systemMessage: `✅ GOVERNANCE: Workflow "${name}" registered as DEV phase (ID: ${workflowId})`
      };
    }
  } catch (e) {
    logHook('governance', 'Post-create registration failed', { error: e.message });
  }
  
  return {};
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

    logHook('governance', `Hook triggered: ${hookType}`, { toolName, dataKeys: Object.keys(data) });
    
    let result = { continue: true };
    
    if (hookType === 'PreToolUse') {
      if (toolName.includes('n8n_create_workflow')) {
        result = await handlePreCreate(toolInput);
      } else if (toolName.includes('n8n_update') || toolName.includes('n8n_update_full') || toolName.includes('n8n_update_partial')) {
        result = await handlePreUpdate(toolInput);
      } else if (toolName.includes('n8n_delete_workflow')) {
        result = await handlePreDelete(toolInput);
      }
    } else if (hookType === 'PostToolUse') {
      if (toolName.includes('n8n_create_workflow')) {
        result = await handlePostCreate(toolInput, toolOutput);
      }
    }
    
    outputResult(result);
    process.exit(result.continue === false ? 2 : 0);
    
  } catch (e) {
    logHook('governance', 'Error', { error: e.message, stack: e.stack });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  PHASES,
  MODIFIABLE_PHASES,
  PROTECTED_PHASES,
  calculateSimilarity,
  findSimilarWorkflows,
  getWorkflowPhase,
  registerWorkflow
};

// Run if called directly
if (require.main === module) {
  main();
}
