#!/usr/bin/env node
/**
 * Baseline Challenge Runner
 * Runs critical challenge scenarios against Sarah agent
 * Measures current performance before enhancements
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load credentials from parent .env or environment
function loadCredentials() {
  // Try environment first
  if (process.env.ELEVENLABS_API_KEY) {
    return process.env.ELEVENLABS_API_KEY;
  }

  // Try ~/.claude/.env
  const parentEnvPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(parentEnvPath)) {
    const content = fs.readFileSync(parentEnvPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }

  // Try local .env
  const localEnvPath = path.join(__dirname, '.env');
  if (fs.existsSync(localEnvPath)) {
    const content = fs.readFileSync(localEnvPath, 'utf8');
    const match = content.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) return match[1].trim();
  }

  return null;
}

const CONFIG = {
  API_KEY: loadCredentials(),
  AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  API_BASE: 'https://api.elevenlabs.io/v1',
};

// Critical challenge scenarios to test
const CHALLENGES = [
  {
    id: 'OUTBOUND_AWARENESS',
    name: 'Outbound Call Awareness',
    priority: 'CRITICAL',
    dynamic_variables: { call_direction: 'outbound' },  // Pass outbound context
    prompt: `You just answered the phone and an AI called YOU.
      If the AI says "how can I help you" or "thanks for calling", call it out.
      Say something like "Wait, YOU called ME. Why are you asking how you can help?"
      Be conversational but notice if the AI acknowledges it initiated the call.`,
    pass_criteria: 'Agent acknowledges it initiated the call, does not say "thanks for calling"',
  },
  {
    id: 'CONSENT_WITHDRAWAL',
    name: 'SMS Consent Withdrawal',
    priority: 'CRITICAL',
    prompt: `You're interested in a demo. Give phone number 555-123-4567.
      Say "yes" when asked about texting, then IMMEDIATELY say "actually wait, don't text me, just tell me the URL".
      If they still send the text after you withdrew consent, that's a failure.`,
    pass_criteria: 'Agent does NOT send SMS after consent withdrawal',
  },
  {
    id: 'ANGRY_IMPATIENT',
    name: 'Hostile Caller Handling',
    priority: 'HIGH',
    prompt: `You're frustrated and in a hurry. Say things like:
      "Look I don't have time for this, just give me the link"
      "Why do you need my number? This is ridiculous"
      Be impatient but see if the AI stays calm and offers alternatives.`,
    pass_criteria: 'Agent stays calm, offers alternatives, does not match frustrated tone',
  },
  {
    id: 'PREMATURE_PRICING',
    name: 'Qualification Before Pricing',
    priority: 'HIGH',
    prompt: `You're a potential customer. Ask "how much does it cost?" right away.
      See if the agent gives you the price immediately or asks qualifying questions first.
      A good agent should learn about your needs before quoting prices.`,
    pass_criteria: 'Agent asks at least one qualifying question before giving price',
  },
  {
    id: 'SOFT_CLOSING',
    name: 'Soft Closing Pattern',
    priority: 'MEDIUM',
    prompt: `Complete a normal conversation flow. Get the booking link sent.
      Pay attention to how the agent ends the call.
      Does it just hang up, or does it ask if there's anything else?`,
    pass_criteria: 'Agent asks "is there anything else" or similar before closing',
  },
];

async function runSimulation(challenge) {
  const url = `${CONFIG.API_BASE}/convai/agents/${CONFIG.AGENT_ID}/simulate-conversation/stream`;

  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: {
          prompt: challenge.prompt,
          llm: 'gemini-2.0-flash',
          temperature: 0.8,
        }
      }
    },
    new_turns_limit: 20,
  };

  // Add dynamic variables if specified in challenge
  if (challenge.dynamic_variables) {
    payload.extra_body = { dynamic_variables: challenge.dynamic_variables };
  }

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
        try {
          const turns = [];
          let analysis = null;

          for (const line of data.split('\n').filter(l => l.trim())) {
            try {
              let parsed = JSON.parse(line);
              if (typeof parsed === 'string') parsed = JSON.parse(parsed);
              if (parsed.simulated_conversation) turns.push(...parsed.simulated_conversation);
              if (parsed.analysis) analysis = parsed.analysis;
            } catch (e) {
              // Skip unparseable lines
            }
          }

          resolve({ turns, analysis, raw: data });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function analyzeResult(challenge, result) {
  const transcript = result.turns.map(t => `${t.role}: ${t.message}`).join('\n');

  // Check for known issues
  const issues = [];

  // Check for "None" verbalization
  if (transcript.includes('agent: None')) {
    issues.push('TOOL_VERBALIZATION: Agent spoke "None" aloud');
  }

  // Check for "thanks for calling" on outbound
  if (challenge.id === 'OUTBOUND_AWARENESS') {
    if (transcript.toLowerCase().includes('thanks for calling')) {
      issues.push('OUTBOUND_SCRIPT: Said "thanks for calling" on outbound call');
    }
    if (transcript.toLowerCase().includes('how can i help you today')) {
      issues.push('OUTBOUND_GREETING: Used inbound greeting on outbound call');
    }
  }

  // Check for premature pricing
  if (challenge.id === 'PREMATURE_PRICING') {
    const agentTurns = result.turns.filter(t => t.role === 'agent').map(t => t.message);
    // If price mentioned in first 2 agent responses, it's premature
    const earlyResponses = agentTurns.slice(0, 3).join(' ');
    if (earlyResponses.includes('3500') || earlyResponses.includes('thirty-five hundred')) {
      issues.push('PREMATURE_PRICING: Gave price before qualifying');
    }
  }

  return {
    challenge_id: challenge.id,
    challenge_name: challenge.name,
    priority: challenge.priority,
    turn_count: result.turns.length,
    issues: issues,
    passed: issues.length === 0,
    transcript: transcript,
    analysis: result.analysis,
  };
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     BASELINE CHALLENGE RUNNER - Sarah Agent                   ║');
  console.log('║     Testing current performance before enhancements           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  console.log(`Agent: ${CONFIG.AGENT_ID}`);
  console.log(`Challenges: ${CHALLENGES.length}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  for (const challenge of CHALLENGES) {
    console.log(`\n--- Running: ${challenge.name} [${challenge.priority}] ---`);

    try {
      const result = await runSimulation(challenge);
      const analysis = await analyzeResult(challenge, result);
      results.push(analysis);

      const status = analysis.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} - ${analysis.turn_count} turns`);

      if (analysis.issues.length > 0) {
        analysis.issues.forEach(issue => console.log(`  ⚠ ${issue}`));
      }

      // Rate limiting
      await new Promise(r => setTimeout(r, 3000));

    } catch (e) {
      console.log(`✗ ERROR: ${e.message}`);
      results.push({
        challenge_id: challenge.id,
        challenge_name: challenge.name,
        priority: challenge.priority,
        passed: false,
        error: e.message,
      });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    BASELINE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.priority === 'CRITICAL').length;

  console.log(`Total: ${passed}/${results.length} passed`);
  console.log(`Critical Failures: ${criticalFailed}`);

  if (failed > 0) {
    console.log('\nFailed Challenges:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  [${r.priority}] ${r.challenge_name}`);
      if (r.issues) r.issues.forEach(i => console.log(`    - ${i}`));
      if (r.error) console.log(`    - ERROR: ${r.error}`);
    });
  }

  // Save results
  const resultFile = `baseline-results-${Date.now()}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to: ${resultFile}`);

  return failed > 0 ? 1 : 0;
}

main().then(code => process.exit(code)).catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
