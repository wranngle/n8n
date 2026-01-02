#!/usr/bin/env node
/**
 * elevenlabs-agent-governance.js
 * 
 * ELEVENLABS AGENT GOVERNANCE SYSTEM
 * ==================================
 * 
 * Mirrors the n8n workflow governance system for ElevenLabs voice agents.
 * 
 * Core principles:
 * - Deletion BLOCKED (ElevenLabs MCP doesn't expose delete, but we track for audit)
 * - Archiving ENCOURAGED via phase tags
 * - Deployment phases: DEV, ALPHA, BETA, GA, PROD
 * - Only DEV agents can be modified
 * - Before creating, check for similar existing agents
 * - New agents auto-tagged as DEV
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const PROJECT_ROOT = getProjectRoot();
const GOVERNANCE_PATH = path.join(PROJECT_ROOT, 'context', 'elevenlabs-agents', 'governance.yaml');

// Deployment phases (same as workflow governance)
const PHASES = ['DEV', 'ALPHA', 'BETA', 'GA', 'PROD', 'ARCHIVED'];
const MODIFIABLE_PHASES = ['DEV'];
const PROTECTED_PHASES = ['ALPHA', 'BETA', 'GA', 'PROD'];

// CRITICAL GOVERNANCE RULE:
// Only DEV phase can be auto-assigned
// Promotions beyond DEV REQUIRE EXPLICIT USER APPROVAL
// Claude CANNOT promote agents without user saying "promote to X"
const AUTO_ASSIGNABLE_PHASES = ['DEV'];

/**
 * Parse deployment phase from entity name
 * ElevenLabs agents don't have tags, so phase is encoded in name: "[DEV] Agent Name"
 */
function parsePhaseFromName(name) {
  if (!name) return null;
  const match = name.match(/^\[([A-Z]+)\]\s+/);
  if (match && PHASES.includes(match[1])) {
    return match[1];
  }
  return null; // No phase tag found
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
  // Remove existing prefix if any
  const cleanName = name.replace(/^\[[A-Z]+\]\s+/, '');
  return `[${phase}] ${cleanName}`;
}

/**
 * Ensure governance directory exists
 */
function ensureGovernanceDir() {
  const dir = path.dirname(GOVERNANCE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Load agent governance configuration
 */
function loadGovernance() {
  try {
    ensureGovernanceDir();
    if (fs.existsSync(GOVERNANCE_PATH)) {
      return yaml.load(fs.readFileSync(GOVERNANCE_PATH, 'utf8'));
    }
  } catch (e) {
    logHook('elevenlabs-governance', 'Failed to load governance.yaml', { error: e.message });
  }
  return { agents: {}, settings: {} };
}

/**
 * Save agent governance configuration
 */
function saveGovernance(governance) {
  try {
    ensureGovernanceDir();
    fs.writeFileSync(GOVERNANCE_PATH, yaml.dump(governance, { lineWidth: 120 }));
    return true;
  } catch (e) {
    logHook('elevenlabs-governance', 'Failed to save governance.yaml', { error: e.message });
    return false;
  }
}

/**
 * Get agent phase from governance
 */
function getAgentPhase(agentId, agentName) {
  const governance = loadGovernance();
  
  // Check by ID first
  if (governance.agents && governance.agents[agentId]) {
    return governance.agents[agentId].phase || 'DEV';
  }
  
  // Check by name (fallback)
  if (governance.agents) {
    for (const [id, meta] of Object.entries(governance.agents)) {
      if (meta.name === agentName) {
        return meta.phase || 'DEV';
      }
    }
  }
  
  return null; // Not tracked yet
}

/**
 * Calculate similarity between two agent names/descriptions
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
 * Find similar agents in governance
 */
function findSimilarAgents(name, systemPrompt = '') {
  const governance = loadGovernance();
  const searchText = `${name} ${systemPrompt}`;
  const matches = [];
  
  if (governance.agents) {
    for (const [id, meta] of Object.entries(governance.agents)) {
      const agentText = `${meta.name} ${meta.description || ''} ${meta.system_prompt_snippet || ''}`;
      const score = calculateSimilarity(searchText, agentText);
      if (score >= 30) {
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
 * Register a new agent in governance
 */
function registerAgent(agentId, name, systemPrompt = '', phase = 'DEV') {
  const governance = loadGovernance();
  
  if (!governance.agents) {
    governance.agents = {};
  }
  
  governance.agents[agentId] = {
    name,
    phase,
    description: `Voice agent: ${name}`,
    system_prompt_snippet: systemPrompt.substring(0, 200),
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    history: [{
      action: 'created',
      phase,
      timestamp: new Date().toISOString()
    }]
  };
  
  saveGovernance(governance);
  logHook('elevenlabs-governance', 'Registered agent', { agentId, name, phase });
}

/**
 * Handle pre-create agent check
 */
async function handlePreCreate(toolInput) {
  const name = toolInput.name || '';
  const systemPrompt = toolInput.system_prompt || '';
  
  logHook('elevenlabs-governance', 'Pre-create check', { name });
  
  // Check for phase prefix in name
  const hasPrefix = hasPhasePrefix(name);
  const parsedPhase = parsePhaseFromName(name);
  
  // Find similar existing agents
  const similar = findSimilarAgents(name, systemPrompt);
  
  let messages = [];
  
  // Enforce naming convention
  if (!hasPrefix) {
    const suggestedName = addPhasePrefix(name, 'DEV');
    messages.push(`⚠️ NAMING CONVENTION: Agent name lacks phase prefix.
**Rename to**: \`${suggestedName}\`
ElevenLabs agents MUST have [PHASE] prefix (e.g., [DEV], [PROD]).`);
  } else if (parsedPhase !== 'DEV') {
    // BLOCK: Cannot assign non-DEV phase without explicit user approval
    return {
      continue: false,
      systemMessage: `❌ GOVERNANCE BLOCKED: Cannot create agent with [${parsedPhase}] phase.

**RULE**: Only [DEV] phase can be auto-assigned.
**Promotions beyond DEV require EXPLICIT USER APPROVAL.**

To proceed:
1. Create as [DEV]: Change name to "${addPhasePrefix(name, 'DEV')}"
2. Or get user approval: Ask user to explicitly approve [${parsedPhase}] phase`
    };
  }
  
  // Check for similar agents
  if (similar.length > 0) {
    const top = similar[0];
    
    if (top.similarity >= 70) {
      messages.push(`⚠️ SIMILAR AGENT: Found "${top.name}" (${top.similarity}% match, ${top.phase}).
Consider cloning instead. Use mcp__elevenlabs-mcp__get_agent(agent_id: "${top.id}") to review.`);
    } else if (top.similarity >= 40) {
      const topMatches = similar.slice(0, 3).map(m => 
        `  - "${m.name}" (${m.similarity}% match, ${m.phase})`
      ).join('\n');
      messages.push(`📋 Similar agents found:\n${topMatches}`);
    }
  }
  
  if (messages.length === 0) {
    messages.push(`✅ ELEVENLABS GOVERNANCE: Agent "${name}" will be registered.`);
  }
  
  return {
    continue: true,
    systemMessage: messages.join('\n\n')
  };
}

/**
 * Handle post-create - register new agent with phase from name
 */
async function handlePostCreate(toolInput, toolOutput) {
  try {
    const output = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;
    
    // Extract agent ID from response
    let agentId = null;
    if (output.text) {
      const match = output.text.match(/agent_[a-z0-9]+/i);
      if (match) agentId = match[0];
    }
    
    const name = toolInput.name || 'Unnamed Agent';
    const systemPrompt = toolInput.system_prompt || '';
    
    // Parse phase from name, default to DEV
    const phase = parsePhaseFromName(name) || 'DEV';
    
    if (agentId) {
      registerAgent(agentId, name, systemPrompt, phase);
      
      const hasPrefix = hasPhasePrefix(name);
      let message = `✅ ELEVENLABS GOVERNANCE: Agent registered as ${phase} phase (ID: ${agentId})`;
      
      if (!hasPrefix) {
        message += `\n⚠️ Agent name lacks [${phase}] prefix. Consider renaming for consistency.`;
      }
      
      return { systemMessage: message };
    }
  } catch (e) {
    logHook('elevenlabs-governance', 'Post-create registration failed', { error: e.message });
  }
  
  return {};
}

/**
 * Main hook handler
 */
async function main() {
  const hookType = process.env.CLAUDE_HOOK_TYPE || 'PreToolUse';
  const toolName = process.env.CLAUDE_TOOL_NAME || '';
  
  logHook('elevenlabs-governance', `Hook triggered: ${hookType}`, { toolName });
  
  try {
    const data = await readStdinJson();
    const toolInput = data.tool_input || {};
    const toolOutput = data.tool_output || {};
    
    let result = { continue: true };
    
    if (hookType === 'PreToolUse') {
      if (toolName.includes('create_agent')) {
        result = await handlePreCreate(toolInput);
      }
    } else if (hookType === 'PostToolUse') {
      if (toolName.includes('create_agent')) {
        result = await handlePostCreate(toolInput, toolOutput);
      }
    }
    
    outputResult(result);
    process.exit(result.continue === false ? 2 : 0);
    
  } catch (e) {
    logHook('elevenlabs-governance', 'Error', { error: e.message, stack: e.stack });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  PHASES,
  MODIFIABLE_PHASES,
  PROTECTED_PHASES,
  parsePhaseFromName,
  hasPhasePrefix,
  addPhasePrefix,
  calculateSimilarity,
  findSimilarAgents,
  getAgentPhase,
  registerAgent
};

// Run if called directly
if (require.main === module) {
  main();
}
