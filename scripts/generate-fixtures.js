#!/usr/bin/env node
/**
 * generate-fixtures.js — emit one deterministic synthetic payload per
 * live-universalized workflow listed in workflows/registry.yaml.
 *
 * Output: fixtures/<slug>.json, one file per registry entry whose `path`
 * lives under workflows/live-universalized/. The trigger node of each
 * workflow is inspected (webhook / form trigger / schedule / manual /
 * evaluation / pipedrive) and a shape-appropriate payload is emitted.
 *
 * Determinism is the contract:
 *   - No timestamps, no random IDs, no env-derived values.
 *   - Object keys are emitted in stable sorted order.
 *   - Re-running the script over a clean checkout MUST produce zero diff.
 *
 * Exit code: 0 on success, non-zero on hard failure (missing workflow JSON,
 * unparseable registry, invalid trigger inference).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const REGISTRY = path.join(REPO_ROOT, 'workflows', 'registry.yaml');
const FIXTURES_DIR = path.join(REPO_ROOT, 'fixtures');
const LIVE_PREFIX = 'workflows/live-universalized/';

function parseRegistrySlugs(yamlText) {
  const out = [];
  const lines = yamlText.split('\n');
  let currentSlug = null;
  let inWorkflows = false;
  for (const raw of lines) {
    if (/^workflows:\s*$/.test(raw)) { inWorkflows = true; continue; }
    if (!inWorkflows) continue;
    if (/^[a-z]/.test(raw)) { inWorkflows = false; continue; }
    const slugMatch = raw.match(/^ {2}([a-z][a-z0-9_-]+):\s*$/);
    if (slugMatch) { currentSlug = slugMatch[1]; continue; }
    const pathMatch = raw.match(/^ {4}path:\s*"([^"]+)"\s*$/);
    if (pathMatch && currentSlug) {
      out.push({ slug: currentSlug, path: pathMatch[1] });
    }
  }
  return out;
}

function pickTrigger(nodes) {
  const triggers = nodes.filter((n) => {
    const t = n.type || '';
    return (
      t === 'n8n-nodes-base.webhook' ||
      t === 'n8n-nodes-base.formTrigger' ||
      t === 'n8n-nodes-base.scheduleTrigger' ||
      t === 'n8n-nodes-base.manualTrigger' ||
      t === 'n8n-nodes-base.evaluationTrigger' ||
      t === 'n8n-nodes-base.pipedriveTrigger' ||
      t === 'n8n-nodes-base.executeWorkflowTrigger'
    );
  });
  const priority = [
    'n8n-nodes-base.webhook',
    'n8n-nodes-base.formTrigger',
    'n8n-nodes-base.evaluationTrigger',
    'n8n-nodes-base.pipedriveTrigger',
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.executeWorkflowTrigger',
    'n8n-nodes-base.manualTrigger',
  ];
  for (const wanted of priority) {
    const hit = triggers.find((n) => n.type === wanted);
    if (hit) return hit;
  }
  return null;
}

function payloadForWebhook(slug, node) {
  const params = (node && node.parameters) || {};
  const httpMethod = (params.httpMethod || 'POST').toUpperCase();
  const webhookPath = params.path || slug;
  return {
    body: { example: true, slug },
    headers: {
      'content-type': 'application/json',
      'x-fixture-slug': slug,
    },
    method: httpMethod,
    params: {},
    path: webhookPath,
    query: {},
  };
}

function payloadForFormTrigger(slug, node) {
  const params = (node && node.parameters) || {};
  const fields = ((params.formFields && params.formFields.values) || []).map((f) => ({
    fieldLabel: f.fieldLabel || f.name || 'field',
    fieldType: f.fieldType || 'text',
    value: 'example',
  }));
  return {
    formMode: 'test',
    slug,
    submittedAt: 'fixture-time',
    submittedFields: fields,
  };
}

function payloadForSchedule(slug) {
  return {
    cronExpression: '0 * * * *',
    slug,
    triggeredAt: 'fixture-time',
    triggeredBy: 'schedule',
  };
}

function payloadForEvaluation(slug) {
  return {
    datasetRow: { example: true, slug },
    rowIndex: 0,
    slug,
    triggeredBy: 'evaluation',
  };
}

function payloadForPipedrive(slug) {
  return {
    current: { id: 1, slug, status: 'open', title: 'Fixture Deal' },
    event: 'updated.deal',
    slug,
    triggeredBy: 'pipedrive',
  };
}

function payloadForManual(slug) {
  return { slug, triggeredBy: 'manual' };
}

function payloadForUnknown(slug) {
  return { slug, triggeredBy: 'unknown' };
}

function inferPayload(slug, workflow) {
  const trig = pickTrigger(workflow.nodes || []);
  if (!trig) return { payload: payloadForUnknown(slug), trigger: 'unknown' };
  switch (trig.type) {
    case 'n8n-nodes-base.webhook':
      return { payload: payloadForWebhook(slug, trig), trigger: 'webhook' };
    case 'n8n-nodes-base.formTrigger':
      return { payload: payloadForFormTrigger(slug, trig), trigger: 'form' };
    case 'n8n-nodes-base.scheduleTrigger':
      return { payload: payloadForSchedule(slug), trigger: 'schedule' };
    case 'n8n-nodes-base.evaluationTrigger':
      return { payload: payloadForEvaluation(slug), trigger: 'evaluation' };
    case 'n8n-nodes-base.pipedriveTrigger':
      return { payload: payloadForPipedrive(slug), trigger: 'pipedrive' };
    case 'n8n-nodes-base.manualTrigger':
      return { payload: payloadForManual(slug), trigger: 'manual' };
    case 'n8n-nodes-base.executeWorkflowTrigger':
      return { payload: payloadForManual(slug), trigger: 'execute-workflow' };
    default:
      return { payload: payloadForUnknown(slug), trigger: 'unknown' };
  }
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeysDeep(value[k]);
    return out;
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(sortKeysDeep(value), null, 2) + '\n';
}

function main() {
  if (!fs.existsSync(REGISTRY)) {
    console.error(`error: registry not found at ${REGISTRY}`);
    process.exit(2);
  }
  const entries = parseRegistrySlugs(fs.readFileSync(REGISTRY, 'utf8'));
  const live = entries.filter((e) => e.path.startsWith(LIVE_PREFIX));

  fs.mkdirSync(FIXTURES_DIR, { recursive: true });

  if (live.length === 0) {
    console.log('generated 0 fixture(s) — no live-universalized entries in registry.yaml');
    return;
  }

  const summary = { generated: 0, skipped: 0, triggers: {} };
  const errors = [];

  for (const { slug, path: wfPath } of live.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const wfAbs = path.join(REPO_ROOT, wfPath);
    if (!fs.existsSync(wfAbs)) {
      errors.push(`missing workflow JSON for ${slug}: ${wfPath}`);
      continue;
    }
    let workflow;
    try {
      workflow = JSON.parse(fs.readFileSync(wfAbs, 'utf8'));
    } catch (err) {
      errors.push(`invalid JSON in ${wfPath}: ${err.message}`);
      continue;
    }
    const { payload, trigger } = inferPayload(slug, workflow);
    summary.triggers[trigger] = (summary.triggers[trigger] || 0) + 1;
    if (trigger === 'unknown') {
      summary.skipped += 1;
      console.warn(`warn: ${slug} — no recognized trigger, emitting placeholder`);
    } else {
      summary.generated += 1;
    }
    const outPath = path.join(FIXTURES_DIR, `${slug}.json`);
    fs.writeFileSync(outPath, stableStringify(payload));
  }

  if (errors.length) {
    console.error('errors:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(4);
  }

  console.log(
    `generated ${summary.generated} fixture(s), ${summary.skipped} placeholder(s) — triggers: ${JSON.stringify(summary.triggers)}`,
  );
}

main();
