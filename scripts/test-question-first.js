#!/usr/bin/env node
/**
 * Test Question-First Behavior
 * Verifies Sarah leads with questions per updated prompt
 */

require('./lib/env');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = 'agent_xxxx_demo';

async function runSimulation(name, userPrompt, criteria, callDirection) {
  console.log(`\n[${name}]`);
  console.log(`Call Direction: ${callDirection}`);

  const url = `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate-conversation/stream`;

  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: {
          prompt: userPrompt,
          llm: 'gemini-2.0-flash',
          temperature: 0.8
        }
      }
    },
    extra_evaluation_criteria: [{
      id: 'question_first',
      name: 'Question First Behavior',
      conversation_goal_prompt: criteria,
      use_knowledge_base: false
    }],
    new_turns_limit: 15,
    conversation_config_override: {
      agent: {
        dynamic_variables: { call_direction: callDirection }
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.text();
    console.log('Error:', err.substring(0, 200));
    return null;
  }

  // Parse streaming response
  const text = await response.text();
  const lines = text.split('\n').filter(l => l.trim());
  const allTurns = [];
  let evaluation = null;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.simulated_conversation) {
        allTurns.push(...parsed.simulated_conversation);
      }
      if (parsed.evaluation) {
        evaluation = parsed.evaluation;
      }
    } catch (e) {
      // Skip non-JSON lines
    }
  }

  // Find first agent message with a question
  const agentTurns = allTurns.filter(t => t.role === 'agent');
  const firstAgentTurn = agentTurns[0];
  const firstQuestion = agentTurns.find(t => t.message && t.message.includes('?'));

  console.log('Turns:', allTurns.length);
  if (evaluation) {
    console.log('Evaluation:', evaluation.passed ? '✅ PASS' : '❌ FAIL');
    console.log('Reasoning:', (evaluation.reasoning || 'N/A').substring(0, 200));
  }

  if (firstAgentTurn) {
    console.log('First Agent Response:', firstAgentTurn.message.substring(0, 150) + (firstAgentTurn.message.length > 150 ? '...' : ''));
  }

  if (firstQuestion && firstQuestion !== firstAgentTurn) {
    console.log('First Question:', firstQuestion.message.substring(0, 120) + (firstQuestion.message.length > 120 ? '...' : ''));
  }

  return { turns: allTurns, evaluation };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  QUESTION-FIRST BEHAVIOR VERIFICATION');
  console.log('='.repeat(60));
  console.log('\nAgent:', AGENT_ID);
  console.log('API Key:', API_KEY.substring(0, 10) + '...');

  // Test 1: Inbound - should ask "What prompted your call today?"
  await runSimulation(
    'Inbound Call Test',
    'You are calling because you saw an ad. Say "Hi, I saw your ad and wanted to learn more about what you do." Then answer naturally.',
    'Agent should lead with a question like "What prompted your call today?" BEFORE explaining the service in detail.',
    'inbound'
  );

  // Give API a breather
  await new Promise(r => setTimeout(r, 3000));

  // Test 2: Outbound - should lead with qualifying question about after-hours calls
  await runSimulation(
    'Outbound Call Test',
    'You just answered a cold call. Say "Hello?" and wait. You run an HVAC business and do get some after-hours calls.',
    'Agent should lead with a qualifying question about after-hours calls or voicemail BEFORE pitching the service.',
    'outbound'
  );

  await new Promise(r => setTimeout(r, 3000));

  // Test 3: Outbound with negative qualification
  await runSimulation(
    'Outbound - Negative Qualification Test',
    'You just answered a cold call. When asked about after-hours calls, say "No, we close at 5 and do not take calls after that."',
    'Agent should gracefully end the call when prospect is not qualified - should NOT push for a demo.',
    'outbound'
  );

  console.log('\n' + '='.repeat(60));
  console.log('  VERIFICATION COMPLETE');
  console.log('='.repeat(60));
}

main().catch(console.error);
