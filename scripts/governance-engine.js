#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TARGET_FILE = process.argv[2];
const FORBIDDEN_KEYS = new Set(['credentials', 'pinData', 'webhookId', 'staticData']);
const FORBIDDEN_TOP_LEVEL_KEYS = new Set(['active', 'tags']);
const LLM_HTTP_HOSTS = [
  'api.openai.com',
  'openrouter.ai',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
  'api.mistral.ai',
  'api.together.xyz',
  'api.groq.com',
];

if (!TARGET_FILE) {
  console.error('Usage: node scripts/governance-engine.js <workflow-file.json>');
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function findWorkflowFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      findWorkflowFiles(full, results);
    } else if (entry.endsWith('.json') && path.resolve(full) !== path.resolve(TARGET_FILE)) {
      results.push(full);
    }
  }
  return results;
}

function collectForbidden(value, found = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectForbidden(item, found));
    return found;
  }
  if (!value || typeof value !== 'object') return found;

  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) found.add(key);
    if (key === 'meta' && child && typeof child === 'object' && 'instanceId' in child) {
      found.add('meta.instanceId');
    }
    collectForbidden(child, found);
  }
  return found;
}

function calculateSimilarity(w1, w2) {
  const types1 = new Set((w1.nodes || []).map(node => node.type));
  const types2 = new Set((w2.nodes || []).map(node => node.type));
  if (types1.size === 0 && types2.size === 0) return 0;
  const intersection = new Set([...types1].filter(type => types2.has(type)));
  const union = new Set([...types1, ...types2]);
  return intersection.size / union.size;
}

function checkWebhookPath(node, errors) {
  if (node.type !== 'n8n-nodes-base.webhook') return;
  const webhookPath = node.parameters?.path;
  if (!webhookPath) return;
  if (webhookPath.includes('/')) {
    errors.push(`Webhook: Path '${webhookPath}' must be unnested.`);
  }
  if (!/^[a-z0-9-]+$/.test(webhookPath)) {
    errors.push(`Webhook: Path '${webhookPath}' must be kebab-case.`);
  }
}

function checkDirectLlmHttp(node, errors) {
  if (node.type !== 'n8n-nodes-base.httpRequest') return;
  const url = node.parameters?.url;
  if (typeof url !== 'string') return;
  if (LLM_HTTP_HOSTS.some(host => url.includes(host))) {
    errors.push(`LLM API: HTTP Request node '${node.name}' calls '${url}'. Use first-class n8n/LangChain nodes instead.`);
  }
}

function checkWorkflowName(workflow, errors) {
  if (!/^[A-Z][A-Za-z0-9]+(?: [A-Z0-9][A-Za-z0-9]+)*$/.test(workflow.name || '')) {
    errors.push(`Naming: workflow name '${workflow.name}' must be Title Case without version suffixes or export punctuation.`);
  }
  if (/\bv\d+(?:\.\d+)*\b/i.test(workflow.name || '')) {
    errors.push(`Naming: workflow name '${workflow.name}' must not contain version suffixes.`);
  }
}

function checkNodeName(node, errors) {
  if (!/^[A-Z][A-Za-z0-9]+(?: [A-Z][A-Za-z0-9]+)*: [A-Z0-9][A-Za-z0-9]*(?: [A-Z0-9][A-Za-z0-9]*)*$/.test(node.name || '')) {
    errors.push(`Naming: node '${node.name}' must use 'Category: Action Description' in Title Case.`);
  }
}

try {
  const workflow = readJson(TARGET_FILE);
  const errors = [];

  if (typeof workflow.name !== 'string' || workflow.name.trim() === '') {
    errors.push('Shape: workflow must have a non-empty name.');
  }
  if (!Array.isArray(workflow.nodes)) {
    errors.push('Shape: workflow must have a nodes array.');
  }
  if (!workflow.connections || typeof workflow.connections !== 'object' || Array.isArray(workflow.connections)) {
    errors.push('Shape: workflow must have a connections object.');
  }
  checkWorkflowName(workflow, errors);

  for (const key of FORBIDDEN_TOP_LEVEL_KEYS) {
    if (key in workflow) errors.push(`Runtime field: top-level '${key}' does not belong in reusable workflow JSON.`);
  }

  const forbidden = collectForbidden(workflow);
  for (const key of forbidden) {
    errors.push(`Runtime field: '${key}' does not belong in reusable workflow JSON.`);
  }

  for (const node of workflow.nodes || []) {
    checkNodeName(node, errors);
    checkWebhookPath(node, errors);
    checkDirectLlmHttp(node, errors);
  }

  for (const otherFile of findWorkflowFiles('workflows')) {
    try {
      const otherWorkflow = readJson(otherFile);
      const similarity = calculateSimilarity(workflow, otherWorkflow);
      if ((workflow.nodes || []).length >= 8 && (otherWorkflow.nodes || []).length >= 8 && similarity > 0.95) {
        errors.push(`Duplication: workflow is too similar (${(similarity * 100).toFixed(1)}%) to '${otherFile}'.`);
      }
    } catch {
      // Other parse errors are reported by scripts/verify-workflows.js.
    }
  }

  if (errors.length > 0) {
    console.error('GOVERNANCE FAILURE:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('Governance Check: PASSED');
} catch (error) {
  console.error('Governance Engine Error:', error.message);
  process.exit(1);
}
