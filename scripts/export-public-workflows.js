#!/usr/bin/env node
/**
 * Export selected live n8n workflows into public-library artifacts.
 *
 * This is intentionally catalog-driven. The live tenant contains archived
 * duplicates, health checks, and direct-LLM-HTTP experiments that should not be
 * published as reusable examples.
 */

const fs = require('fs');
const path = require('path');
const api = require('./lib/n8n-api');

const OUT_DIR = path.join(__dirname, '..', 'workflows', 'live-universalized');
const MANIFEST_FILE = path.join(__dirname, '..', 'docs', 'live-universalized-manifest.json');

const CATALOG = [
  ['81W6PAGZfSi81ZQ9', 'Client Intake Data Lookup', 'client-intake-data-lookup', 'draft', 'Reusable intake endpoint that assembles client configuration and lookup data.'],
  ['SY5XCbzxX32eCIeO', 'Lead Intake Form Receiver', 'lead-intake-form-receiver', 'published', 'Production-style form receiver with validation, notification, and downstream handoff.'],
  ['xdzhNykWZSzHgPDC', 'Presales Report Generator', 'presales-report-generator', 'draft', 'Webhook-driven presales research and report generation workflow.'],
  ['CBoXlSNiDOHA5YmA', 'Universal Message Sender', 'universal-message-sender', 'published', 'Reusable messaging endpoint with routing, provider calls, waits, and response handling.'],
  ['uFFwYcr7XgdRCvdW', 'SMS Conversation Assistant', 'sms-conversation-assistant', 'published', 'SMS assistant workflow for request parsing, routing, and follow-up messaging.'],
  ['wZryG5tdRBFZUNMF', 'Service Business SMS Assistant', 'service-business-sms-assistant', 'draft', 'Service-business SMS assistant demo with Twilio delivery and structured response handling.'],
  ['Rry9i9JdDulTrCci', 'Email Dispatch Endpoint', 'email-dispatch-endpoint', 'draft', 'Authenticated email sending endpoint with validation and response shaping.'],
  ['MG1lNoZ1enpAo16W', 'Vector Store Setup Utility', 'vector-store-setup-utility', 'draft', 'Utility workflow for creating and validating vector-store infrastructure.'],
  ['Ar2lX0cprjeWB4Kd', 'Execution Logger Endpoint', 'execution-logger-endpoint', 'draft', 'Small endpoint for capturing workflow execution telemetry.'],
  ['ITUFwZq7ixgjTZMJ', 'Slack Notification Endpoint', 'slack-notification-endpoint', 'draft', 'Webhook endpoint for formatting and sending operational Slack notifications.'],
  ['oik6SebewNAh1cV5', 'Client Data Lookup Endpoint', 'client-data-lookup-endpoint', 'draft', 'Reusable lookup endpoint for workflow composition.'],
  ['SjItj6uzYSr9rotM', 'Scheduled Wait Loop', 'scheduled-wait-loop', 'draft', 'Schedule and webhook controlled wait-loop orchestration pattern.'],
  ['5eowJIoZFZOSG85m', 'Outbound Voice Call With Context', 'outbound-voice-call-with-context', 'draft', 'Outbound voice-call trigger that enriches requests with client context.'],
  ['NcP4oEeS3xolYXzC', 'Reliable Outbound Voice Caller', 'reliable-outbound-voice-caller', 'draft', 'Outbound voice-call endpoint with validation, routing, wait, and response handling.'],
  ['cEORduJCqCVDOKce', 'CRM Post Call Updater', 'crm-post-call-updater', 'draft', 'Post-call workflow that routes call outcomes into CRM updates.'],
  ['GZsLwzpsTvl9jIEs', 'Post Call Event Receiver', 'post-call-event-receiver', 'draft', 'Webhook receiver for post-call events with routing and downstream handoff.'],
  ['8qlDREZy5qtEGkNK', 'Post Call Orchestrator', 'post-call-orchestrator', 'draft', 'Orchestrates post-call processing across several internal workflow endpoints.'],
  ['qQmGqBM1pe4QUI05', 'CRM Lead Auto Caller', 'crm-lead-auto-caller', 'draft', 'CRM-triggered workflow that starts an outbound call flow for qualified leads.'],
  ['6jT5kplal5Pn3Ez0', 'Post Call Self Healing Endpoint', 'post-call-self-healing-endpoint', 'draft', 'Endpoint pattern for retrying or repairing failed post-call processing.'],
  ['LpWW36WkDAOTpGYC', 'Dead Letter Reprocess Endpoint', 'dead-letter-reprocess-endpoint', 'draft', 'Dead-letter reprocessing endpoint for failed workflow events.'],
  ['xpRbSAaB40G0bdLJ', 'Bulk Web Scraper', 'bulk-web-scraper', 'published', 'Bulk URL scraping workflow with fan-out, aggregation, and response shaping.'],
  ['dWQJHG2fIwDSt5eP', 'Web Scraper Endpoint', 'web-scraper-endpoint', 'published', 'Simple webhook scraping endpoint for single-page extraction.'],
  ['1GlU3wGKi5a0zUB4', 'Stealth Scraper Endpoint', 'stealth-scraper-endpoint', 'draft', 'HTTP-backed stealth scraping endpoint pattern.'],
  ['EnfIzTTvtUMRImGX', 'Browser Scraper Endpoint', 'browser-scraper-endpoint', 'draft', 'Browser-backed scraping endpoint pattern.'],
  ['ik6YjG0Sh5AAXR8G', 'Fetch Scraper Endpoint', 'fetch-scraper-endpoint', 'draft', 'Fetch-backed scraping endpoint pattern.'],
  ['DGBMdZP4JehVfZxO', 'Workflow Test Data Table API', 'workflow-test-data-table-api', 'published', 'Workflow-as-code test API using n8n Data Tables for cases and results.'],
  ['KrqpJuyN8pjTouAo', 'Voice Agent Evaluation Harness', 'voice-agent-evaluation-harness', 'published', 'Voice-agent simulation and evaluation harness.'],
  ['4TqaQ6kORDzZVwVP', 'Simulation Review Master Orchestrator', 'simulation-review-master-orchestrator', 'draft', 'Master orchestration workflow for simulation review runs.'],
  ['KoQChBtjUa5F9bZg', 'Simulation Verification Loop', 'simulation-verification-loop', 'draft', 'Looping verification workflow with waits, checks, and terminal responses.'],
  ['RjLiUAiuUs5XPvBj', 'Conversation Evaluation Endpoint', 'conversation-evaluation-endpoint', 'draft', 'Conversation evaluation endpoint for voice-agent QA.'],
  ['mwepwjfX27x4uTMu', 'Native Evaluation Runner', 'native-evaluation-runner', 'draft', 'n8n-native evaluation runner pattern using evaluation trigger nodes.'],
  ['M7ZmLGCxyVOn5QJ6', 'Parallel Evaluation Runner', 'parallel-evaluation-runner', 'draft', 'Parallel fan-out evaluation runner with aggregation-ready responses.'],
  ['D4GGMXFGC1PLOUT0', 'Voice Agent Config Lookup', 'voice-agent-config-lookup', 'draft', 'Lookup helper for voice-agent configuration.'],
  ['ZBks5kJOLnPDN1Fr', 'Extraction Engine Test Harness', 'extraction-engine-test-harness', 'draft', 'Test harness that invokes an extraction subworkflow.'],
  ['paneUFRzPscNvih2', 'Pipeline Test Webhook Processor', 'pipeline-test-webhook-processor-live', 'draft', 'Live-instance version of the pipeline smoke-test processor.'],
  ['p60GgdEwiDcIrxgp', 'Universal Evaluation Runner', 'universal-evaluation-runner', 'draft', 'Manual evaluation runner that dispatches test payloads into target workflows.'],
].map(([id, name, slug, state, summary]) => ({id, name, slug, state, summary}));

const BLOCKED_LLM_HOSTS = [
  'api.openai.com',
  'openrouter.ai',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
  'api.mistral.ai',
  'api.together.xyz',
  'api.groq.com',
];

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{30,}/g,
  /sk_[a-f0-9]{40,}/g,
  /sk-[A-Za-z0-9]{40,}/g,
  /AC[a-f0-9]{32}/g,
  /wsec_[A-Za-z0-9_-]{32,}/g,
  /M[GS][a-f0-9]{32}/g,
  /HX[a-f0-9]{32}/g,
  /\+1\d{10}/g,
  /\b[A-Fa-f0-9]{32,}\b/g,
];

const TEXT_REPLACEMENTS = [
  [/sarah/gi, 'client'],
  [/Southeastern Wyoming Garage Doors/gi, 'Example Service Company'],
  [/sewy/gi, 'service-business'],
  [/wranngle/gi, 'example'],
  [/supersystem/gi, 'orchestration-system'],
  [/sris/gi, 'simulation-review'],
  [/bulletproof/gi, 'reliable'],
  [/n8n\.wranngle\.com/gi, 'n8n.example.com'],
];

const RUNTIME_KEYS = new Set([
  'active',
  'activeVersion',
  'activeVersionId',
  'createdAt',
  'credentials',
  'id',
  'pinData',
  'shared',
  'staticData',
  'tags',
  'triggerCount',
  'updatedAt',
  'versionId',
  'webhookId',
]);

function sanitizeString(value) {
  let next = value;
  for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  for (const pattern of SECRET_PATTERNS) {
    next = next.replace(pattern, '{{ $env.SECRET_VALUE }}');
  }
  next = next.replace(/https:\/\/n8n\.example\.com\/webhook/gi, '{{ $env.WEBHOOK_BASE_URL }}/webhook');
  return next;
}

function scrub(value, inNode = false) {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(item => scrub(item, inNode));
  if (!value || typeof value !== 'object') return value;

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (RUNTIME_KEYS.has(key) && !(inNode && key === 'id')) continue;
    if (key === 'workflowId' && typeof child === 'string' && /^[A-Za-z0-9_-]{12,}$/.test(child)) {
      result[key] = '{{ $env.N8N_SUBWORKFLOW_ID }}';
      continue;
    }
    if (key === 'meta' && child && typeof child === 'object') {
      const meta = scrub(child, false);
      delete meta.instanceId;
      if (Object.keys(meta).length > 0) result[key] = meta;
      continue;
    }
    if (key === 'nodes' && Array.isArray(child)) {
      result[key] = child.map(node => scrub(node, true));
      continue;
    }
    result[key] = scrub(child, inNode);
  }
  return result;
}

function titleWords(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const upper = word.toUpperCase();
      if (['API', 'CRM', 'HTTP', 'SMS', 'URL', 'QA', 'ID'].includes(upper)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function nodeBaseName(node) {
  const type = node.type || '';
  const raw = titleWords(node.name || 'Node');
  if (type.includes('webhook') && !type.includes('respondToWebhook')) return 'Webhook: Receive Request';
  if (type.includes('respondToWebhook')) return 'Webhook: Return Response';
  if (type.includes('code')) return `Transform: ${raw.replace(/^Code ?/i, '') || 'Process Payload'}`;
  if (type.includes('switch') || type.includes('if')) return `Route: ${raw.replace(/^If ?/i, '') || 'Choose Path'}`;
  if (type.includes('httpRequest')) return `HTTP: ${raw.replace(/^HTTP ?/i, '') || 'Call Service'}`;
  if (type.includes('email')) return 'Email: Send Notification';
  if (type.includes('twilio')) return 'SMS: Send Message';
  if (type.includes('pipedrive')) return 'CRM: Update Record';
  if (type.includes('dataTable')) return 'Data Table: Manage Rows';
  if (type.includes('wait')) return 'Wait: Pause Execution';
  if (type.includes('merge')) return 'Merge: Combine Branches';
  if (type.includes('split')) return 'Transform: Split Items';
  if (type.includes('aggregate')) return 'Transform: Aggregate Items';
  if (type.includes('manualTrigger')) return 'Trigger: Manual Start';
  if (type.includes('scheduleTrigger')) return 'Trigger: Schedule Run';
  if (type.includes('evaluation')) return 'Evaluate: Run Test';
  if (type.includes('executeWorkflow')) return 'Workflow: Execute Subworkflow';
  if (type.includes('set')) return 'Transform: Set Fields';
  if (type.includes('crypto')) return 'Security: Sign Payload';
  if (type.includes('noOp')) return 'Flow: No Operation';
  return `Step: ${raw || 'Process Item'}`;
}

function renameNodes(workflow) {
  const counts = new Map();
  const nameMap = new Map();
  for (const node of workflow.nodes || []) {
    const base = nodeBaseName(node);
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    const nextName = count === 1 ? base : `${base} Step${count}`;
    nameMap.set(node.name, nextName);
    node.name = nextName;
  }

  const connections = {};
  const nodeNames = new Set((workflow.nodes || []).map(node => node.name));
  for (const [source, outputs] of Object.entries(workflow.connections || {})) {
    const nextSource = nameMap.get(source);
    if (!nextSource || !nodeNames.has(nextSource)) continue;
    connections[nextSource] = outputs;
    for (const outputGroup of Object.values(outputs || {})) {
      if (!Array.isArray(outputGroup)) continue;
      for (const branch of outputGroup) {
        if (!Array.isArray(branch)) continue;
        for (let i = branch.length - 1; i >= 0; i -= 1) {
          const edge = branch[i];
          if (edge && nameMap.has(edge.node)) {
            edge.node = nameMap.get(edge.node);
          }
          if (!edge || !nodeNames.has(edge.node)) {
            branch.splice(i, 1);
          }
        }
      }
    }
  }
  workflow.connections = connections;
}

function hasBlockedLlmHttp(workflow) {
  const text = JSON.stringify(workflow);
  return BLOCKED_LLM_HOSTS.some(host => text.includes(host));
}

function integrationList(workflow) {
  const names = new Set();
  for (const node of workflow.nodes || []) {
    const type = node.type || '';
    if (type.includes('webhook')) names.add('webhook');
    if (type.includes('httpRequest')) names.add('http');
    if (type.includes('email')) names.add('email');
    if (type.includes('twilio')) names.add('twilio');
    if (type.includes('pipedrive')) names.add('pipedrive');
    if (type.includes('dataTable')) names.add('data-table');
    if (type.includes('slack')) names.add('slack');
    if (type.includes('qdrant')) names.add('qdrant');
    if (type.includes('evaluation')) names.add('n8n-evaluation');
  }
  return [...names].sort();
}

async function main() {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const exported = [];
  const skipped = [];

  for (const entry of CATALOG) {
    const res = await api.request('GET', `/api/v1/workflows/${entry.id}`);
    if (res.status !== 200) {
      skipped.push({name: entry.name, slug: entry.slug, state: entry.state, reason: `HTTP ${res.status}`});
      continue;
    }
    if (hasBlockedLlmHttp(res.body)) {
      skipped.push({name: entry.name, slug: entry.slug, state: entry.state, reason: 'direct LLM HTTP call'});
      continue;
    }

    const workflow = scrub(res.body);
    workflow.name = entry.name;
    workflow.settings = workflow.settings || {executionOrder: 'v1'};
    workflow.meta = {
      source: 'universalized-live-workflow',
      state: entry.state,
      summary: entry.summary,
    };
    renameNodes(workflow);

    const outPath = path.join(OUT_DIR, `${entry.slug}.json`);
    fs.writeFileSync(outPath, `${JSON.stringify(workflow, null, 2)}\n`);
    exported.push({
      name: entry.name,
      slug: entry.slug,
      state: entry.state,
      summary: entry.summary,
      path: path.relative(path.join(__dirname, '..'), outPath).replace(/\\/g, '/'),
      nodes: workflow.nodes.length,
      integrations: integrationList(workflow),
    });
  }

  fs.mkdirSync(path.dirname(MANIFEST_FILE), {recursive: true});
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify({exportedAt: new Date().toISOString(), exported, skipped}, null, 2)}\n`);

  console.log(`Exported ${exported.length} workflows to ${path.relative(process.cwd(), OUT_DIR)}`);
  if (skipped.length > 0) {
    console.log(`Skipped ${skipped.length} workflows:`);
    for (const item of skipped) console.log(`- ${item.name}: ${item.reason}`);
  }
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
