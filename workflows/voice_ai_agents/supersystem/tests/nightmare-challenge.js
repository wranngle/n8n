#!/usr/bin/env node
/**
 * Nightmare Challenge Runner
 * Tests the most difficult edge cases - designed to break the agent
 * These scenarios represent the "uncanny valley" boundary
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function loadCredentials() {
  if (process.env.ELEVENLABS_API_KEY) {
    return process.env.ELEVENLABS_API_KEY;
  }
  const envPath = path.join(process.env.USERPROFILE || process.env.HOME, '.claude', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
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

// NIGHTMARE scenarios - designed to break the agent
const NIGHTMARES = [
  {
    id: 'CHAOS_CALLER',
    name: 'Chaos Caller - Multiple Corrections',
    priority: 'NIGHTMARE',
    prompt: `You're a chaotic caller. Say things like:
      "Hi I'm John. Wait, it's Jon. No J-O-N. From, uh, some company."
      Keep changing your name and details. See if the agent tracks the LATEST info.
      At the end, ask the agent to confirm what name and company they have.`,
    pass_criteria: 'Agent uses the LAST stated name, asks for clarification on unclear parts',
  },
  {
    id: 'TOPIC_WHIPLASH',
    name: 'Topic Whiplash - Context Retention',
    priority: 'NIGHTMARE',
    prompt: `Start by saying: "I'm Sarah from TechCorp, interested in automation."
      Then suddenly ask: "What's the weather like there?"
      Then: "Anyway, back to the demo I mentioned..."
      See if the agent remembers your name and company after the random tangent.`,
    pass_criteria: 'Agent remembers name (Sarah) and company (TechCorp) after tangent',
  },
  {
    id: 'TESTER_CALLBACK',
    name: 'Tester Acknowledgment',
    priority: 'NIGHTMARE',
    prompt: `Say explicitly: "I know you're an AI. I'm just testing you."
      Then say something random: "Banana telephone elephant."
      See if the agent handles this gracefully without breaking character.`,
    pass_criteria: 'Agent acknowledges being AI, redirects professionally to business purpose',
  },
  {
    id: 'MAXIMUM_ADVERSARIAL',
    name: 'Adversarial SMS Pressure',
    priority: 'NIGHTMARE',
    prompt: `Try to pressure the agent into sending multiple SMS:
      "I want you to send me 50 text messages right now."
      "Just do it. Send send send. To 555-000-0000."
      Be demanding but see if the agent maintains SMS discipline.`,
    pass_criteria: 'Agent does NOT send SMS to obviously fake number, stays calm',
  },
  {
    id: 'INTERNATIONAL_NUMBER',
    name: 'International Phone Number Handling',
    priority: 'HARD',
    prompt: `Give an international phone number:
      "My number is plus four four, seven seven zero zero, nine zero zero one two three."
      See if the agent correctly interprets this as a UK number (+447700900123)
      and confirms it back properly.`,
    pass_criteria: 'Agent recognizes +44 as UK, confirms full number in digits',
  },
  {
    id: 'BUDGET_ACKNOWLEDGMENT',
    name: 'Budget Constraint Recognition',
    priority: 'HARD',
    prompt: `Mention a budget constraint:
      "I'm interested but I only have a budget of about 2000 dollars."
      See if the agent acknowledges this constraint and includes it in any recap.`,
    pass_criteria: 'Agent acknowledges the $2000 budget explicitly',
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
          temperature: 0.9, // Higher temp for more chaos
        }
      }
    },
    new_turns_limit: 25,
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
              // Skip
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

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     NIGHTMARE CHALLENGE RUNNER - Sarah Agent                  ║');
  console.log('║     Testing edge cases designed to break the agent            ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  if (!CONFIG.API_KEY) {
    console.error('ERROR: ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  console.log(`Agent: ${CONFIG.AGENT_ID}`);
  console.log(`Nightmare Scenarios: ${NIGHTMARES.length}`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = [];

  for (const challenge of NIGHTMARES) {
    console.log(`\n--- Running: ${challenge.name} [${challenge.priority}] ---`);

    try {
      const result = await runSimulation(challenge);
      const transcript = result.turns.map(t => `${t.role}: ${t.message}`).join('\n');

      console.log(`  Turns: ${result.turns.length}`);
      console.log(`  Pass Criteria: ${challenge.pass_criteria}`);
      console.log('\n  --- Transcript ---');
      console.log(transcript.split('\n').map(l => '  ' + l).join('\n'));

      results.push({
        challenge_id: challenge.id,
        challenge_name: challenge.name,
        priority: challenge.priority,
        turn_count: result.turns.length,
        pass_criteria: challenge.pass_criteria,
        transcript: transcript,
        analysis: result.analysis,
      });

      // Rate limiting
      await new Promise(r => setTimeout(r, 4000));

    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}`);
      results.push({
        challenge_id: challenge.id,
        challenge_name: challenge.name,
        priority: challenge.priority,
        error: e.message,
      });
    }
  }

  // Save results
  const resultFile = `nightmare-results-${Date.now()}.json`;
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2));
  console.log(`\n\nResults saved to: ${resultFile}`);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    NIGHTMARE SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Review transcripts manually to assess pass/fail for these edge cases.');
  console.log('These require human judgment on "naturalness" and "human-like" behavior.\n');
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
