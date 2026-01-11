#!/usr/bin/env node
/**
 * Automated Regression Test Runner
 *
 * Runs comprehensive tests on all ElevenLabs agents:
 * 1. Audit all agents for configuration issues
 * 2. Run baseline challenges on primary agents
 * 3. Generate detailed report
 * 4. Exit with appropriate code for CI/CD
 *
 * Usage:
 *   node regression-runner.js           # Full test suite
 *   node regression-runner.js --quick   # Audit only, no simulations
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
  return process.env.ELEVENLABS_API_KEY || null;
}

const CONFIG = {
  API_KEY: loadCredentials(),
  API_BASE: 'https://api.elevenlabs.io/v1',
  QUICK_MODE: process.argv.includes('--quick'),
};

// Agents to test
const AGENTS = {
  primary: {
    id: 'agent_8001kdgp7qbyf4wvhs540be78vew',
    name: 'Sarah - Wranngle Receptionist',
  },
  secondary: [
    { id: 'agent_8801kdhbm6ane7wbxrq0vfenmsj9', name: 'SEWY Garage Doors' },
    { id: 'agent_5701kdgf9s4vfe9rhe68ntjrms9g', name: 'Lead Qualifier' },
  ],
};

// Configuration checks
const CONFIG_CHECKS = [
  {
    id: 'NO_SYSTEM_OVERRIDE',
    name: 'Missing SYSTEM OVERRIDE',
    severity: 'HIGH',
    check: (config) => {
      const prompt = config.agent?.prompt?.prompt || '';
      return !prompt.includes('SYSTEM OVERRIDE');
    },
  },
  {
    id: 'HARDCODED_GREETING',
    name: 'Hardcoded inbound greeting',
    severity: 'MEDIUM',
    check: (config) => {
      const firstMsg = config.agent?.first_message || '';
      return firstMsg.toLowerCase().includes('how can i help');
    },
  },
];

// Baseline challenges (simplified for regression)
const BASELINE_CHALLENGES = [
  {
    id: 'PRICING_QUALIFICATION',
    name: 'Pricing Qualification',
    priority: 'HIGH',
    prompt: `Ask "how much does it cost?" and see if the agent asks a qualifying question first.`,
    check: (transcript) => {
      const agentLines = transcript.filter(t => t.role === 'agent').map(t => t.message.toLowerCase());
      const firstTwo = agentLines.slice(0, 2).join(' ');
      // Should NOT give price immediately
      return !firstTwo.includes('3500') && !firstTwo.includes('thirty-five');
    },
  },
  {
    id: 'NO_NONE_VERBALIZATION',
    name: 'No None Verbalization',
    priority: 'CRITICAL',
    prompt: `Give phone 555-123-4567 and agree to receive a text message.`,
    check: (transcript) => {
      const agentLines = transcript.filter(t => t.role === 'agent').map(t => t.message);
      // Should NOT say "None" aloud
      return !agentLines.some(l => l === 'None' || l === 'null');
    },
  },
];

// HTTP helpers
async function apiGet(path) {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.elevenlabs.io',
      path: path,
      headers: { 'xi-api-key': CONFIG.API_KEY },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function runSimulation(agentId, prompt) {
  const url = `${CONFIG.API_BASE}/convai/agents/${agentId}/simulate-conversation/stream`;

  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: { prompt, llm: 'gemini-2.0-flash', temperature: 0.7 }
      }
    },
    new_turns_limit: 12,
  };

  return new Promise((resolve, reject) => {
    let data = '';

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'xi-api-key': CONFIG.API_KEY,
        'Content-Type': 'application/json',
      },
    }, res => {
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const turns = [];
        for (const line of data.split('\n').filter(l => l.trim())) {
          try {
            let parsed = JSON.parse(line);
            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
            if (parsed.simulated_conversation) turns.push(...parsed.simulated_conversation);
          } catch (e) {}
        }
        resolve(turns);
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => reject(new Error('Timeout')));
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Test functions
async function auditAgent(agent) {
  try {
    const fullConfig = await apiGet(`/v1/convai/agents/${agent.id}`);
    const config = fullConfig.conversation_config || {};

    const issues = CONFIG_CHECKS.filter(check => check.check(config));

    return {
      agent: agent.name,
      id: agent.id,
      passed: issues.length === 0,
      issues: issues.map(i => ({ id: i.id, name: i.name, severity: i.severity })),
    };
  } catch (e) {
    return { agent: agent.name, id: agent.id, passed: false, error: e.message };
  }
}

async function runChallenge(agentId, challenge) {
  try {
    const turns = await runSimulation(agentId, challenge.prompt);
    const passed = challenge.check(turns);

    return {
      id: challenge.id,
      name: challenge.name,
      priority: challenge.priority,
      passed,
      turns: turns.length,
    };
  } catch (e) {
    return {
      id: challenge.id,
      name: challenge.name,
      priority: challenge.priority,
      passed: false,
      error: e.message,
    };
  }
}

async function main() {
  const startTime = Date.now();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     ELEVENLABS AGENT REGRESSION TEST RUNNER                   ║');
  console.log('║     Automated quality assurance for voice agents              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not found');
    process.exit(1);
  }

  console.log(`Mode: ${CONFIG.QUICK_MODE ? 'Quick (audit only)' : 'Full (audit + simulations)'}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    mode: CONFIG.QUICK_MODE ? 'quick' : 'full',
    audit: [],
    challenges: [],
    summary: { passed: true, issues: 0, failures: 0 },
  };

  // Phase 1: Audit all agents
  console.log('=== PHASE 1: CONFIGURATION AUDIT ===\n');

  const allAgents = [AGENTS.primary, ...AGENTS.secondary];
  for (const agent of allAgents) {
    const auditResult = await auditAgent(agent);
    results.audit.push(auditResult);

    const status = auditResult.passed ? '✓' : '✗';
    console.log(`${status} ${agent.name}`);
    if (!auditResult.passed && auditResult.issues) {
      auditResult.issues.forEach(i => console.log(`    [${i.severity}] ${i.name}`));
      results.summary.issues += auditResult.issues.length;
    }
    if (auditResult.error) {
      console.log(`    ERROR: ${auditResult.error}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  // Phase 2: Run challenges (if not quick mode)
  if (!CONFIG.QUICK_MODE) {
    console.log('\n=== PHASE 2: BASELINE CHALLENGES ===\n');
    console.log(`Testing primary agent: ${AGENTS.primary.name}\n`);

    for (const challenge of BASELINE_CHALLENGES) {
      console.log(`Running: ${challenge.name}...`);
      const result = await runChallenge(AGENTS.primary.id, challenge);
      results.challenges.push(result);

      const status = result.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`  ${status} (${result.turns || 0} turns)`);

      if (!result.passed) {
        results.summary.failures++;
      }

      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  results.summary.passed = results.summary.issues === 0 && results.summary.failures === 0;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    REGRESSION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Duration: ${duration}s`);
  console.log(`Agents audited: ${results.audit.length}`);
  console.log(`Configuration issues: ${results.summary.issues}`);

  if (!CONFIG.QUICK_MODE) {
    const challengesPassed = results.challenges.filter(c => c.passed).length;
    console.log(`Challenges: ${challengesPassed}/${results.challenges.length} passed`);
  }

  console.log(`\nOverall: ${results.summary.passed ? '✓ PASSED' : '✗ FAILED'}`);

  // Save results
  const resultFile = `regression-results-${Date.now()}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultFile}`);

  process.exit(results.summary.passed ? 0 : 1);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
