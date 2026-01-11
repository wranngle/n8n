#!/usr/bin/env node
/**
 * Audit All ElevenLabs Agents
 * Checks each agent for common issues:
 * - Hardcoded first_message with inbound greeting
 * - Missing pricing qualification
 * - Missing call direction handling
 * - Missing tool verbalization guardrails
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }
  return null;
}

const API_KEY = loadCredentials();

const AGENTS = [
  { id: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9', name: 'SEWY Garage Doors - Sarah' },
  { id: 'agent_5701kdgf9s4vfe9rhe68ntjrms9g', name: 'Wranngle Lead Qualifier' },
  { id: 'agent_3801kdf7fkhcev8tkhpm92d65jws', name: 'Client Data Test Agent' },
  { id: 'agent_3301kedf4zqket7bd8zngdaen1ww', name: 'Sarah - Wranngle COPY' },
];

// Issues to check
const CHECKS = [
  {
    id: 'HARDCODED_GREETING',
    name: 'Hardcoded inbound greeting in first_message',
    check: (config) => {
      const firstMsg = config.agent?.first_message || '';
      return firstMsg.toLowerCase().includes('how can i help');
    },
    severity: 'HIGH',
  },
  {
    id: 'NO_CALL_DIRECTION',
    name: 'Missing call_direction handling in prompt',
    check: (config) => {
      const prompt = config.agent?.prompt?.prompt || '';
      return !prompt.toLowerCase().includes('call_direction');
    },
    severity: 'HIGH',
  },
  {
    id: 'NO_PRICING_GUARD',
    name: 'Missing pricing qualification guardrail',
    check: (config) => {
      const prompt = config.agent?.prompt?.prompt || '';
      const hasPricing = prompt.toLowerCase().includes('pricing') || prompt.toLowerCase().includes('price');
      const hasQualify = prompt.toLowerCase().includes('qualifying question') ||
                        prompt.toLowerCase().includes('before giving any price');
      return hasPricing && !hasQualify;
    },
    severity: 'MEDIUM',
  },
  {
    id: 'NO_NONE_GUARD',
    name: 'Missing tool verbalization guardrail (None/null)',
    check: (config) => {
      const prompt = config.agent?.prompt?.prompt || '';
      return !prompt.toLowerCase().includes('never speak tool return') &&
             !prompt.toLowerCase().includes('never verbalize tool');
    },
    severity: 'MEDIUM',
  },
];

async function getAgentConfig(agentId) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.elevenlabs.io',
      path: `/v1/convai/agents/${agentId}`,
      headers: { 'xi-api-key': API_KEY },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function auditAgent(agent) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`AUDITING: ${agent.name}`);
  console.log(`ID: ${agent.id}`);
  console.log('='.repeat(60));

  try {
    const fullConfig = await getAgentConfig(agent.id);
    const config = fullConfig.conversation_config || {};

    const firstMessage = config.agent?.first_message || 'NOT SET';
    console.log(`\nFirst Message: "${firstMessage}"`);

    const promptLength = (config.agent?.prompt?.prompt || '').length;
    console.log(`Prompt Length: ${promptLength} chars`);

    const issues = [];

    for (const check of CHECKS) {
      const hasIssue = check.check(config);
      if (hasIssue) {
        issues.push(check);
        console.log(`  ⚠ [${check.severity}] ${check.name}`);
      }
    }

    if (issues.length === 0) {
      console.log(`  ✓ No issues detected`);
    }

    return {
      agent: agent.name,
      id: agent.id,
      firstMessage,
      promptLength,
      issues: issues.map(i => ({ id: i.id, name: i.name, severity: i.severity })),
    };

  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    return {
      agent: agent.name,
      id: agent.id,
      error: e.message,
    };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ELEVENLABS AGENT AUDIT                                    ║');
  console.log('║     Checking all agents for common issues                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  if (!API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found');
    process.exit(1);
  }

  const results = [];

  for (const agent of AGENTS) {
    const result = await auditAgent(agent);
    results.push(result);
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }

  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('                    AUDIT SUMMARY');
  console.log('═'.repeat(60));

  const agentsWithIssues = results.filter(r => r.issues && r.issues.length > 0);
  const highSeverityCount = results.reduce((sum, r) =>
    sum + (r.issues || []).filter(i => i.severity === 'HIGH').length, 0);

  console.log(`\nAgents audited: ${AGENTS.length}`);
  console.log(`Agents with issues: ${agentsWithIssues.length}`);
  console.log(`HIGH severity issues: ${highSeverityCount}`);

  if (agentsWithIssues.length > 0) {
    console.log('\nAgents needing fixes:');
    agentsWithIssues.forEach(r => {
      console.log(`  - ${r.agent}`);
      r.issues.forEach(i => console.log(`      [${i.severity}] ${i.name}`));
    });
  }

  // Save results
  const resultFile = `agent-audit-${Date.now()}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultFile}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
