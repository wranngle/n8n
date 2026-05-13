#!/usr/bin/env node
/**
 * Fix malformed workflow connections
 * The n8n-mcp tool creates connections with "type": "0" instead of "type": "main"
 */

const api = require('./lib/n8n-api');

const workflowId = process.argv[2];

if (!workflowId) {
  console.error('Usage: node scripts/fix-workflow-connections.js <workflow-id>');
  process.exit(1);
}

console.log('Fixing workflow:', workflowId);

(async () => {
    const get = await api.request('GET', `/api/v1/workflows/${workflowId}`);
    if (get.status !== 200) {
      console.error('Failed to get workflow:', get.status, typeof get.body === 'string' ? get.body : JSON.stringify(get.body, null, 2));
      process.exit(1);
    }

    const workflow = get.body;
    const connections = workflow.connections;
    let fixedCount = 0;

    // Fix all malformed connections
    for (const [nodeName, nodeConnections] of Object.entries(connections)) {
      // Check for numeric keys that should be 'main'
      for (const key of Object.keys(nodeConnections)) {
        if (key === '0' || key === '1' || key === '2') {
          const outputs = nodeConnections[key];

          // Fix target type from "0" to "main"
          for (const outputArray of outputs) {
            for (const connection of outputArray) {
              if (connection.type === '0' || connection.type === '1') {
                console.log(`  Fixing ${nodeName} -> ${connection.node}: type "${connection.type}" -> "main"`);
                connection.type = 'main';
                fixedCount++;
              }
            }
          }

          // Move from numeric key to main array
          if (key === '0') {
            if (!nodeConnections.main) {
              nodeConnections.main = [];
            }
            // Insert at position 0
            nodeConnections.main[0] = outputs[0];
            delete nodeConnections[key];
            console.log(`  Fixed ${nodeName}: moved key "0" to main[0]`);
          }
        }
      }
    }

    if (fixedCount === 0) {
      console.log('No malformed connections found!');
      process.exit(0);
    }

    console.log(`Fixed ${fixedCount} connection(s). Updating workflow...`);

    // Update the workflow
    const updatePayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: connections,
      settings: workflow.settings
    };

    const update = await api.request('PUT', `/api/v1/workflows/${workflowId}`, updatePayload);

    if (update.status === 200) {
      console.log('Workflow connections fixed successfully!');
    } else {
      console.error('Failed to update workflow:', update.status);
      console.error(typeof update.body === 'string' ? update.body.slice(0, 1000) : JSON.stringify(update.body, null, 2).slice(0, 1000));
      process.exit(1);
    }
})().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
