/**
 * Layer 2: n8n Workflow Auto-Corrector
 * 
 * Automatically fixes n8n workflows using partial update API.
 * CRITICAL: Error handling is NODE-LEVEL, not in parameters!
 */

const https = require('https');

const CONFIG = {
  N8N_API_KEY: process.env.N8N_API_KEY,
  N8N_BASE_URL: process.env.N8N_BASE_URL || 'https://n8n.wranngle.com',
  MCP_ENDPOINT: '/mcp-server/http'
};

/**
 * Make request to n8n API
 */
async function n8nRequest(method, path, body = null) {
  const url = new URL(path, CONFIG.N8N_BASE_URL);
  
  const options = {
    method,
    headers: {
      'X-N8N-API-KEY': CONFIG.N8N_API_KEY,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  const data = await response.json();
  
  return { status: response.status, data };
}

/**
 * Get workflow by ID
 */
async function getWorkflow(workflowId) {
  const result = await n8nRequest('GET', `/api/v1/workflows/${workflowId}`);
  if (result.status !== 200) {
    throw new Error(`Failed to get workflow: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

/**
 * Update workflow with full replacement
 */
async function updateWorkflowFull(workflowId, workflow) {
  const result = await n8nRequest('PUT', `/api/v1/workflows/${workflowId}`, workflow);
  if (result.status !== 200) {
    throw new Error(`Failed to update workflow: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

/**
 * Apply partial update using diff operations
 * This mimics n8n_update_partial_workflow MCP tool behavior
 */
async function applyPartialUpdate(workflowId, operations) {
  // Get current workflow
  const workflow = await getWorkflow(workflowId);
  
  // Apply operations
  for (const op of operations) {
    switch (op.type) {
      case 'updateNode':
        applyNodeUpdate(workflow, op.nodeName, op.changes);
        break;
      case 'addNode':
        workflow.nodes.push(op.node);
        break;
      case 'removeNode':
        workflow.nodes = workflow.nodes.filter(n => n.name !== op.nodeName);
        // Also remove connections
        delete workflow.connections[op.nodeName];
        for (const [source, conns] of Object.entries(workflow.connections)) {
          for (const branch of conns.main || []) {
            const filtered = branch.filter(c => c.node !== op.nodeName);
            branch.length = 0;
            branch.push(...filtered);
          }
        }
        break;
      case 'addConnection':
        addConnection(workflow, op.source, op.target, op.sourceOutput || 0, op.targetInput || 0);
        break;
      case 'removeConnection':
        removeConnection(workflow, op.source, op.target);
        break;
      case 'updateSettings':
        workflow.settings = { ...workflow.settings, ...op.settings };
        break;
      case 'updateName':
        workflow.name = op.name;
        break;
      default:
        console.warn(`[Layer2] Unknown operation type: ${op.type}`);
    }
  }

  // Save updated workflow
  return await updateWorkflowFull(workflowId, workflow);
}

/**
 * Apply changes to a node
 * CRITICAL: Handle NODE-level vs parameter-level properties correctly
 */
function applyNodeUpdate(workflow, nodeName, changes) {
  const node = workflow.nodes.find(n => n.name === nodeName);
  if (!node) {
    throw new Error(`Node not found: ${nodeName}`);
  }

  // NODE-LEVEL properties (NOT in parameters)
  const nodeLevelProps = [
    'onError', 'retryOnFail', 'maxTries', 'waitBetweenTries',
    'continueOnFail', 'disabled', 'notes', 'position'
  ];

  for (const [key, value] of Object.entries(changes)) {
    if (nodeLevelProps.includes(key)) {
      // Apply at node level
      node[key] = value;
    } else if (key.startsWith('parameters.')) {
      // Apply nested in parameters
      const paramKey = key.replace('parameters.', '');
      setNestedValue(node.parameters, paramKey, value);
    } else if (key === 'parameters') {
      // Replace entire parameters
      node.parameters = { ...node.parameters, ...value };
    } else {
      // Default to node level
      node[key] = value;
    }
  }
}

/**
 * Set nested value using dot notation
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Add connection between nodes
 */
function addConnection(workflow, source, target, sourceOutput = 0, targetInput = 0) {
  if (!workflow.connections[source]) {
    workflow.connections[source] = { main: [[]] };
  }
  
  while (workflow.connections[source].main.length <= sourceOutput) {
    workflow.connections[source].main.push([]);
  }
  
  workflow.connections[source].main[sourceOutput].push({
    node: target,
    type: 'main',
    index: targetInput
  });
}

/**
 * Remove connection between nodes
 */
function removeConnection(workflow, source, target) {
  if (!workflow.connections[source]) return;
  
  for (const branch of workflow.connections[source].main || []) {
    const idx = branch.findIndex(c => c.node === target);
    if (idx !== -1) {
      branch.splice(idx, 1);
    }
  }
}

/**
 * Auto-fix patterns for n8n workflows
 */
const WORKFLOW_FIXES = {
  // Add retry logic to HTTP nodes
  ADD_RETRY_LOGIC: (nodeName) => ({
    type: 'updateNode',
    nodeName,
    changes: {
      retryOnFail: true,
      maxTries: 3,
      waitBetweenTries: 1000
    }
  }),

  // Add error handling to node
  ADD_ERROR_HANDLING: (nodeName) => ({
    type: 'updateNode',
    nodeName,
    changes: {
      onError: 'continueErrorOutput',
      continueOnFail: true
    }
  }),

  // Fix webhook data access (common mistake)
  FIX_WEBHOOK_DATA: (nodeName, fieldPath) => ({
    type: 'updateNode',
    nodeName,
    changes: {
      [`parameters.${fieldPath}`]: `={{ $json.body.${fieldPath.split('.').pop()} }}`
    }
  }),

  // Add timeout to HTTP request
  ADD_TIMEOUT: (nodeName, timeoutMs = 30000) => ({
    type: 'updateNode',
    nodeName,
    changes: {
      'parameters.options.timeout': timeoutMs
    }
  })
};

/**
 * Diagnose workflow failure and generate fix operations
 */
function diagnoseWorkflowFailure(failureContext) {
  const { workflowId, errorMessage, nodeName, category } = failureContext;
  const operations = [];

  // Timeout errors
  if (errorMessage?.includes('timeout') || errorMessage?.includes('ETIMEDOUT')) {
    if (nodeName) {
      operations.push(WORKFLOW_FIXES.ADD_RETRY_LOGIC(nodeName));
      operations.push(WORKFLOW_FIXES.ADD_TIMEOUT(nodeName));
    }
  }

  // Connection errors
  if (errorMessage?.includes('ECONNREFUSED') || errorMessage?.includes('ENOTFOUND')) {
    if (nodeName) {
      operations.push(WORKFLOW_FIXES.ADD_RETRY_LOGIC(nodeName));
      operations.push(WORKFLOW_FIXES.ADD_ERROR_HANDLING(nodeName));
    }
  }

  // Expression errors (undefined data)
  if (errorMessage?.includes('undefined') || errorMessage?.includes('Cannot read')) {
    // Likely webhook data access issue
    if (nodeName) {
      operations.push(WORKFLOW_FIXES.ADD_ERROR_HANDLING(nodeName));
    }
  }

  return {
    workflowId,
    operations,
    confidence: operations.length > 0 ? 0.8 : 0.3
  };
}

/**
 * Apply fixes to workflow
 */
async function applyWorkflowFixes(workflowId, operations) {
  if (operations.length === 0) {
    return { success: false, reason: 'No operations to apply' };
  }

  // n8n MCP limits to 5 operations per request
  const batches = [];
  for (let i = 0; i < operations.length; i += 5) {
    batches.push(operations.slice(i, i + 5));
  }

  const results = [];
  for (const batch of batches) {
    try {
      const result = await applyPartialUpdate(workflowId, batch);
      results.push({ success: true, batch, result });
    } catch (error) {
      results.push({ success: false, batch, error: error.message });
    }
  }

  return {
    success: results.every(r => r.success),
    results,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  getWorkflow,
  updateWorkflowFull,
  applyPartialUpdate,
  diagnoseWorkflowFailure,
  applyWorkflowFixes,
  WORKFLOW_FIXES
};
