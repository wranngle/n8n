'use strict';

const FALLIBLE_TYPE_PREFIXES = [
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.postgres',
  'n8n-nodes-base.mysql',
  'n8n-nodes-base.emailSend',
  'n8n-nodes-base.executeWorkflow',
  'n8n-nodes-base.twilio',
  'n8n-nodes-base.stripe',
];

function isFallible(node) {
  const type = typeof node.type === 'string' ? node.type : '';
  return FALLIBLE_TYPE_PREFIXES.some((p) => type === p || type.startsWith(`${p}.`));
}

function hasErrorBranch(workflow, node) {
  const connections = workflow.connections || {};
  const byName = connections[node.name];
  if (!byName || typeof byName !== 'object') return false;
  return Array.isArray(byName.error) && byName.error.length > 0;
}

function hasContinueOnFail(node) {
  if (node.continueOnFail === true) return true;
  if (typeof node.onError === 'string' && node.onError !== 'stopWorkflow') return true;
  return false;
}

module.exports = {
  id: 'missing-error-handler',
  description: 'Fallible nodes (HTTP, DB, email, executeWorkflow, payment) must declare an error branch or onError policy.',
  check(workflow) {
    const findings = [];
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    for (const node of nodes) {
      if (!isFallible(node)) continue;
      if (hasErrorBranch(workflow, node)) continue;
      if (hasContinueOnFail(node)) continue;
      findings.push({
        nodeId: node.id || node.name,
        nodeName: node.name,
        message: `fallible node "${node.name}" (${node.type}) has no error branch and no continueOnFail/onError policy`,
      });
    }
    return findings;
  },
};
