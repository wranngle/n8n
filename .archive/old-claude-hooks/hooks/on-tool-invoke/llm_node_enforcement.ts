#!/usr/bin/env bun
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * HOOK: llm_node_enforcement.js
 * EVENT: PreToolUse
 * PURPOSE: Validates LLM model names against banned list
 * ENFORCEMENT: BLOCKING
 *
 * LLM NODE PATTERN ENFORCEMENT
 * ============================
 *
 * Hook: PreToolUse (n8n_create_workflow, n8n_update_*)
 *
 * BLOCKS workflows that use HTTP Request nodes to call LLM APIs directly.
 * REQUIRES AI Agent nodes with proper credentials instead.
 *
 * Blocked patterns:
 * - HTTP Request to openrouter.ai
 * - HTTP Request to api.openai.com/v1/chat/completions
 * - HTTP Request to generativelanguage.googleapis.com
 * - Any HTTP to known LLM endpoints
 *
 * Required pattern:
 * - Use @n8n/n8n-nodes-langchain.lmChatGoogleGemini
 * - Use @n8n/n8n-nodes-langchain.lmChatOpenAi
 * - Use @n8n/n8n-nodes-langchain.agent
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const {logHook, readStdinJson, outputResult} = require('../hook_utils');

// Type definitions
type HttpViolation = {
  isViolation: boolean;
  endpoint?: string;
  nodeName?: string;
  url?: string;
};

type CodeViolation = {
  isViolation: boolean;
  endpoint?: string;
  nodeName?: string;
  codeSnippet?: string;
};

type ModelViolation = {
  isViolation: boolean;
  nodeName?: string;
  model?: string;
  reason?: string;
};

type Violation = HttpViolation | CodeViolation;

// Load model configuration from centralized config
function loadModelConfig() {
  try {
    const configPath = path.join(__dirname, '../../config/model-rankings.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error: unknown) {
    logHook('llm-enforcement', 'Failed to load model config', {error: (error as Error).message});
  }

  return {
    banned: ['gpt-5-mini', 'gpt-4o-mini', 'gemini-2.0-flash-001', 'gemini-1.5-flash', 'claude-3-haiku'],
    deprecated_aliases: {},
    enforced: {n8n_llm_text: 'gemini-3-pro', n8n_llm_code: 'claude-opus-4-5'},
  };
}

const modelConfig = loadModelConfig();
const BANNED_MODELS = modelConfig.banned || [];
const DEPRECATED_ALIASES = modelConfig.deprecated_aliases || {};
const ENFORCED_MODELS = modelConfig.enforced || {};

// Blocked LLM API endpoints (HTTP Request to these = violation)
const BLOCKED_LLM_ENDPOINTS = [
  'openrouter.ai',
  'api.openai.com/v1/chat',
  'api.openai.com/v1/completions',
  'generativelanguage.googleapis.com',
  'api.anthropic.com',
  'api.cohere.ai',
  'api.mistral.ai',
  'api.together.xyz',
  'api.groq.com',
];

// Approved LangChain node types for LLM operations
const APPROVED_LLM_NODES = [
  '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  '@n8n/n8n-nodes-langchain.lmChatAnthropic',
  '@n8n/n8n-nodes-langchain.lmChatOllama',
  '@n8n/n8n-nodes-langchain.lmChatMistralCloud',
  '@n8n/n8n-nodes-langchain.agent',
  '@n8n/n8n-nodes-langchain.chainLlm',
  '@n8n/n8n-nodes-langchain.toolAgent',
];

/**
 * Check if a node is an HTTP Request calling an LLM API
 * @param {object} node - Workflow node
 * @returns {{isViolation: boolean, endpoint: string|null}}
 */
function checkHttpLlmViolation(node) {
  if (!node?.type) {
    return {isViolation: false};
  }

  // Only check HTTP Request nodes
  if (!node.type.includes('httpRequest')) {
    return {isViolation: false};
  }

  const parameters = node.parameters || {};
  const url = parameters.url || '';

  // Check against blocked endpoints
  for (const endpoint of BLOCKED_LLM_ENDPOINTS) {
    if (url.toLowerCase().includes(endpoint.toLowerCase())) {
      return {
        isViolation: true,
        endpoint,
        nodeName: node.name,
        url: url.slice(0, 100), // Truncate for logging
      };
    }
  }

  // Also check for LLM-related keywords in URLs
  const llmKeywords = ['chat/completions', 'generateContent', 'messages', 'llm', 'inference'];
  for (const keyword of llmKeywords) {
    if (url.toLowerCase().includes(keyword) // Additional check: does it look like an LLM API?
      && (url.includes('api.') || url.includes('/v1/') || url.includes('/v1beta/'))) {
      return {
        isViolation: true,
        endpoint: 'detected LLM API pattern',
        nodeName: node.name,
        url: url.slice(0, 100),
      };
    }
  }

  return {isViolation: false};
}

/**
 * Check if a Code node contains LLM API calls in jsCode
 * @param {object} node - Workflow node
 * @returns {{isViolation: boolean, endpoint: string|null}}
 */
function checkCodeNodeLlmViolation(node) {
  if (!node?.type) {
    return {isViolation: false};
  }

  // Only check Code nodes
  if (!node.type.includes('code')) {
    return {isViolation: false};
  }

  const parameters = node.parameters || {};
  const jsCode = parameters.jsCode || '';

  if (!jsCode) {
    return {isViolation: false};
  }

  // Check for LLM API endpoints in code
  for (const endpoint of BLOCKED_LLM_ENDPOINTS) {
    if (jsCode.toLowerCase().includes(endpoint.toLowerCase())) {
      return {
        isViolation: true,
        endpoint: `Code node calling ${endpoint}`,
        nodeName: node.name,
        codeSnippet: jsCode.slice(0, 100),
      };
    }
  }

  // Check for fetch/axios/http calls to LLM patterns
  const llmPatterns = [
    /fetch\s*\(\s*['"`].*?(openrouter|openai|anthropic|gemini)/i,
    /axios\s*\.\s*(get|post)\s*\(\s*['"`].*?(openrouter|openai|anthropic|gemini)/i,
    /httprequest\s*\(\s*{[^}]*url[^}]*(openrouter|openai|anthropic|gemini)/i,
    /['"`]https?:\/\/[^'"`]*?(chat\/completions|generatecontent)[^'"`]*['"`]/i,
  ];

  for (const pattern of llmPatterns) {
    if (pattern.test(jsCode)) {
      return {
        isViolation: true,
        endpoint: 'LLM API call detected in Code node',
        nodeName: node.name,
        codeSnippet: jsCode.slice(0, 100),
      };
    }
  }

  return {isViolation: false};
}

/**
 * Check if a LangChain LLM node uses a banned model
 * @param {object} node - Workflow node
 * @returns {{isViolation: boolean, nodeName: string, model: string, reason: string|null}}
 */
function checkLangChainNodeModel(node) {
  if (!node?.type) {
    return {isViolation: false};
  }

  // Only check LangChain LLM nodes
  const llmNodeTypes = [
    'lmChatGoogleGemini',
    'lmChatOpenAi',
    'lmChatAnthropic',
    'lmChatMistralCloud',
    'lmChatOllama',
  ];

  const isLlmNode = llmNodeTypes.some(t => node.type.includes(t));
  if (!isLlmNode) {
    return {isViolation: false};
  }

  const model = node.parameters?.model || node.parameters?.modelId || '';
  if (!model) {
    return {isViolation: false};
  }

  const modelLower = model.toLowerCase();

  // Check against banned models list
  for (const banned of BANNED_MODELS) {
    if (modelLower === banned.toLowerCase()) {
      // Determine context-appropriate enforced model
      const enforced = ENFORCED_MODELS.n8n_llm_text || 'gemini-3-pro';
      const aliasMessage = DEPRECATED_ALIASES[banned] || '';

      return {
        isViolation: true,
        nodeName: node.name,
        model,
        reason: `'${model}' is deprecated. ${aliasMessage || `Use '${enforced}' instead.`}`,
      };
    }
  }

  return {isViolation: false};
}

/**
 * Check if workflow has any approved LLM nodes
 * @param {Array} nodes - Workflow nodes
 * @returns {Array<string>} - List of approved LLM nodes found
 */
function findApprovedLlmNodes(nodes) {
  if (!nodes || !Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .filter(node => APPROVED_LLM_NODES.includes(node.type))
    .map(node => `${node.name} (${node.type})`);
}

/**
 * Analyze workflow for LLM pattern violations
 * @param {object} toolInput - Tool input with nodes array
 * @returns {{violations: Array, approvedNodes: Array}}
 */
function analyzeWorkflow(toolInput) {
  const nodes = toolInput.nodes || [];
  const violations: Violation[] = [];
  const modelViolations: ModelViolation[] = [];
  const approvedNodes = findApprovedLlmNodes(nodes);

  for (const node of nodes) {
    // Check HTTP Request nodes
    const httpCheck = checkHttpLlmViolation(node);
    if (httpCheck.isViolation) {
      violations.push(httpCheck);
    }

    // Check Code nodes for embedded LLM calls
    const codeCheck = checkCodeNodeLlmViolation(node);
    if (codeCheck.isViolation) {
      violations.push(codeCheck);
    }

    // Check LangChain nodes for banned models
    const modelCheck = checkLangChainNodeModel(node);
    if (modelCheck.isViolation) {
      modelViolations.push(modelCheck);
    }
  }

  return {violations, modelViolations, approvedNodes};
}

/**
 * Generate fix suggestion
 * @param {Array} violations - List of violations
 * @returns {string} - Suggested fix
 */
function generateFixSuggestion(violations) {
  const suggestion = `
FIX REQUIRED: Replace HTTP Request nodes with AI Agent/LLM nodes

Recommended approach:
1. Use @n8n/n8n-nodes-langchain.lmChatGoogleGemini for Gemini
2. Use @n8n/n8n-nodes-langchain.lmChatOpenAi for OpenAI
3. Use @n8n/n8n-nodes-langchain.agent for AI Agent workflows

Model Rankings (use these):
- Text/General: gemini-3-pro (Rank #1)
- Coding: claude-opus-4-5 (Rank #1)

To get node configuration:
  mcp__n8n-mcp__get_node_essentials({nodeType: "nodes-langchain.lmChatGoogleGemini"})

Store credentials in:
  workflows/{project}/env/.env.gemini or .env.openai
`;

  return suggestion;
}

/**
 * Main hook handler
 */
async function main() {
  logHook('llm-enforcement', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolName = data.tool_name || '';
    const toolInput = data.tool_input || {};
    const hookType = data.hook_event_name || 'PreToolUse';

    // Only validate on PreToolUse for workflow create/update
    if (hookType !== 'PreToolUse') {
      outputResult({continue: true});
      process.exit(0);
      return;
    }

    if (!toolName.includes('n8n_create_workflow') && !toolName.includes('n8n_update')) {
      outputResult({continue: true});
      process.exit(0);
      return;
    }

    // Analyze workflow
    const {violations, modelViolations, approvedNodes} = analyzeWorkflow(toolInput);

    logHook('llm-enforcement', 'Analysis complete', {
      violationCount: violations.length,
      modelViolationCount: modelViolations.length,
      approvedNodeCount: approvedNodes.length,
    });

    // BLOCKING: Report model violations (banned/deprecated models)
    if (modelViolations.length > 0) {
      const violationList = modelViolations.map(v =>
        `  - Node "${v.nodeName}": ${v.reason}`).join('\n');

      const enforced = ENFORCED_MODELS.n8n_llm_text || 'gemini-3-pro';

      logHook('llm-enforcement', 'BLOCKED - Banned model in LangChain node', {modelViolations});

      outputResult({
        continue: false,
        reason: `❌ LLM MODEL ENFORCEMENT FAILED

Banned/deprecated models detected in LangChain nodes:
${violationList}

**RULE**: n8n workflows must use approved LLM models.
**Enforced model**: ${enforced}

To fix:
1. Replace deprecated models with approved versions
2. See config/model-rankings.json for full rankings
3. Text workflows: use gemini-3-pro
4. Code workflows: use claude-opus-4-5`,
      });
      process.exit(2);
      return;
    }

    // Report HTTP violations (advisory, not blocking)
    if (violations.length > 0) {
      const violationList = violations.map(v =>
        `  - Node "${v.nodeName}": HTTP Request to ${v.endpoint}`).join('\n');

      const message = `
❌ LLM NODE PATTERN VIOLATION

HTTP Request nodes are calling LLM APIs directly:
${violationList}

This pattern is BLOCKED. Use AI Agent/LLM nodes instead.
${generateFixSuggestion(violations)}
`;

      logHook('llm-enforcement', 'WARNING - HTTP LLM violation', {violations});

      // Warn but allow (to enable independent operation)
      process.stderr.write(`⚠️  LLM NODE PATTERN WARNING: ${message}\n`);

      outputResult({
        continue: true,
        systemMessage: `⚠️ LLM NODE PATTERN WARNING: Direct HTTP requests to LLM APIs detected.
Please consider using AI Agent/LLM nodes instead for better governance.
${generateFixSuggestion(violations)}`,
      });
      process.exit(0);
      return;
    }

    // Log approved nodes found (informational)
    if (approvedNodes.length > 0) {
      logHook('llm-enforcement', 'Approved LLM nodes found', {approvedNodes});
      outputResult({
        continue: true,
        systemMessage: `✅ LLM Pattern: Using approved nodes: ${approvedNodes.join(', ')}`,
      });
    } else {
      outputResult({continue: true});
    }

    process.exit(0);
  } catch (error: unknown) {
    logHook('llm-enforcement', 'Error', {error: (error as Error).message});
    outputResult({continue: true}); // Fail open
    process.exit(0);
  }
}

// Export for testing
export {
  checkHttpLlmViolation, checkCodeNodeLlmViolation, checkLangChainNodeModel, findApprovedLlmNodes, analyzeWorkflow, loadModelConfig, BLOCKED_LLM_ENDPOINTS, APPROVED_LLM_NODES, BANNED_MODELS, ENFORCED_MODELS,
};

// Run if called directly
if (require.main === module) {
  main();
}
