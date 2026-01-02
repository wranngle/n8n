#!/usr/bin/env node
/**
 * llm-node-enforcement.js
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

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

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
  'api.groq.com'
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
  '@n8n/n8n-nodes-langchain.toolAgent'
];

/**
 * Check if a node is an HTTP Request calling an LLM API
 * @param {object} node - Workflow node
 * @returns {{isViolation: boolean, endpoint: string|null}}
 */
function checkHttpLlmViolation(node) {
  if (!node || !node.type) return { isViolation: false };

  // Only check HTTP Request nodes
  if (!node.type.includes('httpRequest')) {
    return { isViolation: false };
  }

  const params = node.parameters || {};
  const url = params.url || '';

  // Check against blocked endpoints
  for (const endpoint of BLOCKED_LLM_ENDPOINTS) {
    if (url.toLowerCase().includes(endpoint.toLowerCase())) {
      return {
        isViolation: true,
        endpoint,
        nodeName: node.name,
        url: url.substring(0, 100) // Truncate for logging
      };
    }
  }

  // Also check for LLM-related keywords in URLs
  const llmKeywords = ['chat/completions', 'generateContent', 'messages', 'llm', 'inference'];
  for (const keyword of llmKeywords) {
    if (url.toLowerCase().includes(keyword)) {
      // Additional check: does it look like an LLM API?
      if (url.includes('api.') || url.includes('/v1/') || url.includes('/v1beta/')) {
        return {
          isViolation: true,
          endpoint: 'detected LLM API pattern',
          nodeName: node.name,
          url: url.substring(0, 100)
        };
      }
    }
  }

  return { isViolation: false };
}

/**
 * Check if a Code node contains LLM API calls in jsCode
 * @param {object} node - Workflow node
 * @returns {{isViolation: boolean, endpoint: string|null}}
 */
function checkCodeNodeLlmViolation(node) {
  if (!node || !node.type) return { isViolation: false };

  // Only check Code nodes
  if (!node.type.includes('code')) {
    return { isViolation: false };
  }

  const params = node.parameters || {};
  const jsCode = params.jsCode || '';

  if (!jsCode) return { isViolation: false };

  // Check for LLM API endpoints in code
  for (const endpoint of BLOCKED_LLM_ENDPOINTS) {
    if (jsCode.toLowerCase().includes(endpoint.toLowerCase())) {
      return {
        isViolation: true,
        endpoint: `Code node calling ${endpoint}`,
        nodeName: node.name,
        codeSnippet: jsCode.substring(0, 100)
      };
    }
  }

  // Check for fetch/axios/http calls to LLM patterns
  const llmPatterns = [
    /fetch\s*\(\s*['"`].*?(openrouter|openai|anthropic|gemini)/i,
    /axios\s*\.\s*(get|post)\s*\(\s*['"`].*?(openrouter|openai|anthropic|gemini)/i,
    /httpRequest\s*\(\s*\{[^}]*url[^}]*(openrouter|openai|anthropic|gemini)/i,
    /['"`]https?:\/\/[^'"`]*?(chat\/completions|generateContent)[^'"`]*['"`]/i
  ];

  for (const pattern of llmPatterns) {
    if (pattern.test(jsCode)) {
      return {
        isViolation: true,
        endpoint: 'LLM API call detected in Code node',
        nodeName: node.name,
        codeSnippet: jsCode.substring(0, 100)
      };
    }
  }

  return { isViolation: false };
}

/**
 * Check if workflow has any approved LLM nodes
 * @param {Array} nodes - Workflow nodes
 * @returns {Array<string>} - List of approved LLM nodes found
 */
function findApprovedLlmNodes(nodes) {
  if (!nodes || !Array.isArray(nodes)) return [];

  return nodes
    .filter(node => APPROVED_LLM_NODES.some(approved => node.type === approved))
    .map(node => `${node.name} (${node.type})`);
}

/**
 * Analyze workflow for LLM pattern violations
 * @param {object} toolInput - Tool input with nodes array
 * @returns {{violations: Array, approvedNodes: Array}}
 */
function analyzeWorkflow(toolInput) {
  const nodes = toolInput.nodes || [];
  const violations = [];
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
  }

  return { violations, approvedNodes };
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
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    if (!toolName.includes('n8n_create_workflow') && !toolName.includes('n8n_update')) {
      outputResult({ continue: true });
      process.exit(0);
      return;
    }

    // Analyze workflow
    const { violations, approvedNodes } = analyzeWorkflow(toolInput);

    logHook('llm-enforcement', 'Analysis complete', {
      violationCount: violations.length,
      approvedNodeCount: approvedNodes.length
    });

    // Report violations
    if (violations.length > 0) {
      const violationList = violations.map(v =>
        `  - Node "${v.nodeName}": HTTP Request to ${v.endpoint}`
      ).join('\n');

      const message = `
❌ LLM NODE PATTERN VIOLATION

HTTP Request nodes are calling LLM APIs directly:
${violationList}

This pattern is BLOCKED. Use AI Agent/LLM nodes instead.
${generateFixSuggestion(violations)}
`;

      logHook('llm-enforcement', 'BLOCKED - HTTP LLM violation', { violations });

      outputResult({
        continue: false,
        reason: message
      });
      process.exit(2);
      return;
    }

    // Log approved nodes found (informational)
    if (approvedNodes.length > 0) {
      logHook('llm-enforcement', 'Approved LLM nodes found', { approvedNodes });
      outputResult({
        continue: true,
        systemMessage: `✅ LLM Pattern: Using approved nodes: ${approvedNodes.join(', ')}`
      });
    } else {
      outputResult({ continue: true });
    }

    process.exit(0);

  } catch (e) {
    logHook('llm-enforcement', 'Error', { error: e.message });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  checkHttpLlmViolation,
  checkCodeNodeLlmViolation,
  findApprovedLlmNodes,
  analyzeWorkflow,
  BLOCKED_LLM_ENDPOINTS,
  APPROVED_LLM_NODES
};

// Run if called directly
if (require.main === module) {
  main();
}
