'use strict';

const piiInNodeName = require('./rules/pii-in-node-name');
const missingErrorHandler = require('./rules/missing-error-handler');
const retryWithoutIdempotency = require('./rules/retry-without-idempotency');
const hardcodedSecrets = require('./rules/hardcoded-secrets');

const RULES = [
  piiInNodeName,
  missingErrorHandler,
  retryWithoutIdempotency,
  hardcodedSecrets,
];

function listRules() {
  return RULES.map((r) => ({ id: r.id, description: r.description }));
}

function getRule(id) {
  return RULES.find((r) => r.id === id) || null;
}

function runRules(workflow, { only, skip } = {}) {
  const selected = RULES.filter((r) => {
    if (only && only.length && !only.includes(r.id)) return false;
    if (skip && skip.length && skip.includes(r.id)) return false;
    return true;
  });
  const out = [];
  for (const rule of selected) {
    let findings;
    try {
      findings = rule.check(workflow) || [];
    } catch (err) {
      findings = [{
        nodeId: '',
        nodeName: '',
        message: `rule crashed: ${err.message}`,
      }];
    }
    for (const f of findings) {
      out.push({
        rule: rule.id,
        nodeId: f.nodeId || '',
        nodeName: f.nodeName || '',
        message: f.message,
      });
    }
  }
  out.sort((a, b) => {
    if (a.rule !== b.rule) return a.rule < b.rule ? -1 : 1;
    if (a.nodeId !== b.nodeId) return a.nodeId < b.nodeId ? -1 : 1;
    return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
  });
  return out;
}

module.exports = { RULES, listRules, getRule, runRules };
