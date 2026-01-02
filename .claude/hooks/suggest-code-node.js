#!/usr/bin/env node
/**
 * suggest-code-node.js
 * Hook: PreToolUse (n8n_create_workflow, n8n_update_full_workflow, n8n_update_partial_workflow)
 *
 * Detects workflow patterns that should use Code nodes for better performance
 * and maintainability. Provides advisory warnings (does not block).
 *
 * Patterns Detected:
 * 1. Sequential Set nodes (≥3)
 * 2. Nested IF/Switch conditionals (≥2 levels)
 * 3. Split → Loop → Merge patterns
 * 4. Filter → Transform chains (≥3)
 * 5. High node count for simple transformation (≥5 Set/Filter nodes)
 */

const { logHook, readStdinJson, outputResult } = require('./hook-utils');

// Node types that could be consolidated into Code nodes
const TRANSFORMATION_NODES = [
  'n8n-nodes-base.set',
  'n8n-nodes-base.filter',
  'n8n-nodes-base.if',
  'n8n-nodes-base.switch'
];

const SET_NODE_TYPES = ['n8n-nodes-base.set'];
const FILTER_NODE_TYPES = ['n8n-nodes-base.filter'];
const CONDITIONAL_NODE_TYPES = ['n8n-nodes-base.if', 'n8n-nodes-base.switch'];
const SPLIT_NODE_TYPES = ['n8n-nodes-base.splitInBatches'];
const MERGE_NODE_TYPES = ['n8n-nodes-base.merge'];
const LOOP_NODE_TYPES = ['n8n-nodes-base.loop'];

/**
 * Analyze workflow for Code node opportunities
 * @param {Array} nodes - Workflow nodes array
 * @param {Object} connections - Workflow connections object
 * @returns {Array} List of suggestions
 */
function analyzeWorkflow(nodes, connections) {
  const suggestions = [];

  if (!nodes || nodes.length === 0) {
    return suggestions;
  }

  // Create node lookup
  const nodeMap = new Map();
  nodes.forEach(node => {
    nodeMap.set(node.name, node);
  });

  // Pattern 1: Count sequential Set nodes
  const setNodes = nodes.filter(n => SET_NODE_TYPES.includes(n.type));
  if (setNodes.length >= 3) {
    suggestions.push({
      pattern: 'Sequential Set Nodes',
      count: setNodes.length,
      threshold: 3,
      message: `${setNodes.length} Set nodes detected. Consider consolidating into a single Code node for cleaner transformation.`,
      nodes: setNodes.map(n => n.name)
    });
  }

  // Pattern 2: Count conditional nodes (IF/Switch)
  const conditionalNodes = nodes.filter(n => CONDITIONAL_NODE_TYPES.includes(n.type));
  if (conditionalNodes.length >= 2) {
    // Check for nesting by analyzing connections
    const hasNestedConditionals = checkNestedConditionals(conditionalNodes, connections);
    if (hasNestedConditionals) {
      suggestions.push({
        pattern: 'Nested Conditionals',
        count: conditionalNodes.length,
        threshold: 2,
        message: `${conditionalNodes.length} nested IF/Switch nodes detected. Consider using Code node logic for cleaner conditional handling.`,
        nodes: conditionalNodes.map(n => n.name)
      });
    }
  }

  // Pattern 3: Split → Loop → Merge pattern
  const splitNodes = nodes.filter(n => SPLIT_NODE_TYPES.includes(n.type));
  const mergeNodes = nodes.filter(n => MERGE_NODE_TYPES.includes(n.type));
  const loopNodes = nodes.filter(n => LOOP_NODE_TYPES.includes(n.type));

  if (splitNodes.length > 0 && (mergeNodes.length > 0 || loopNodes.length > 0)) {
    suggestions.push({
      pattern: 'Split-Loop-Merge',
      count: splitNodes.length + mergeNodes.length + loopNodes.length,
      threshold: 1,
      message: `Split/Loop/Merge pattern detected. Consider using Code node with reduce() for simpler aggregation.`,
      nodes: [...splitNodes, ...mergeNodes, ...loopNodes].map(n => n.name)
    });
  }

  // Pattern 4: Filter → Transform chains
  const filterNodes = nodes.filter(n => FILTER_NODE_TYPES.includes(n.type));
  const totalFilterTransform = filterNodes.length + setNodes.length;
  if (totalFilterTransform >= 4) {
    suggestions.push({
      pattern: 'Filter-Transform Chain',
      count: totalFilterTransform,
      threshold: 4,
      message: `${totalFilterTransform} Filter/Set nodes in workflow. Consider using Code node with chained array methods (.filter().map()).`,
      nodes: [...filterNodes, ...setNodes].map(n => n.name)
    });
  }

  // Pattern 5: Overall transformation node density
  const transformNodes = nodes.filter(n => TRANSFORMATION_NODES.includes(n.type));
  const transformRatio = transformNodes.length / nodes.length;
  if (transformNodes.length >= 5 && transformRatio > 0.4) {
    suggestions.push({
      pattern: 'High Transformation Density',
      count: transformNodes.length,
      threshold: 5,
      message: `${transformNodes.length} transformation nodes (${Math.round(transformRatio * 100)}% of workflow). Code node consolidation could significantly reduce complexity.`,
      nodes: transformNodes.map(n => n.name)
    });
  }

  return suggestions;
}

/**
 * Check if conditional nodes are nested (one leads to another)
 */
function checkNestedConditionals(conditionalNodes, connections) {
  if (conditionalNodes.length < 2 || !connections) return false;

  const conditionalNames = new Set(conditionalNodes.map(n => n.name));

  for (const nodeName of Object.keys(connections)) {
    if (conditionalNames.has(nodeName)) {
      const nodeConns = connections[nodeName];
      if (nodeConns?.main) {
        for (const outputs of nodeConns.main) {
          if (outputs) {
            for (const conn of outputs) {
              if (conditionalNames.has(conn.node)) {
                return true; // Found conditional → conditional connection
              }
            }
          }
        }
      }
    }
  }

  return false;
}

/**
 * Format suggestions into user-friendly message
 */
function formatSuggestions(suggestions) {
  if (suggestions.length === 0) return null;

  let message = '💡 **Code Node Opportunity Detected**\n\n';
  message += 'The following patterns could benefit from Code node consolidation:\n\n';

  suggestions.forEach((s, i) => {
    message += `${i + 1}. **${s.pattern}** (${s.count} nodes)\n`;
    message += `   ${s.message}\n`;
  });

  message += '\n📘 For decision framework: `Skill("n8n-code-node-strategy")`';

  return message;
}

async function main() {
  logHook('suggest-code-node', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const toolInput = data.tool_input || {};

    // Extract nodes and connections from tool input
    let nodes = [];
    let connections = {};

    if (toolInput.nodes) {
      nodes = toolInput.nodes;
    }
    if (toolInput.connections) {
      connections = toolInput.connections;
    }

    // For partial updates, we can't fully analyze - skip
    if (toolInput.operations && !toolInput.nodes) {
      logHook('suggest-code-node', 'Partial update - skipping analysis');
      process.exit(0);
    }

    if (nodes.length === 0) {
      logHook('suggest-code-node', 'No nodes to analyze');
      process.exit(0);
    }

    const suggestions = analyzeWorkflow(nodes, connections);

    logHook('suggest-code-node', 'Analysis complete', {
      nodeCount: nodes.length,
      suggestionsCount: suggestions.length,
      patterns: suggestions.map(s => s.pattern)
    });

    if (suggestions.length > 0) {
      const message = formatSuggestions(suggestions);
      outputResult({
        continue: true, // Advisory only - never block
        systemMessage: message
      });
    }

    process.exit(0);
  } catch (e) {
    logHook('suggest-code-node', 'Error', { error: e.message });
    process.exit(0); // Never fail the deployment
  }
}

main();
