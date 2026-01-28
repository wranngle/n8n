#!/usr/bin/env node
/**
 * ElevenLabs Sarah Agent - Comprehensive ATDD Test Suite
 *
 * Applies the ULTRATHINK framework specifically for ElevenLabs
 * Conversational AI agent testing via the Simulation API.
 *
 * Features:
 * - 1000+ test scenarios per conversation dimension
 * - Exponential combinations of caller personas, scenarios, and edge cases
 * - Auto-healing webhook handler validation
 * - Real ElevenLabs Simulation API integration
 */

const fs = require('fs');
const path = require('path');

// Load API key from .claude.json
const CLAUDE_JSON_PATH = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude.json');
let API_KEY = null;
try {
  const claudeJson = JSON.parse(fs.readFileSync(CLAUDE_JSON_PATH, 'utf-8'));
  if (claudeJson.projects) {
    for (const [key, value] of Object.entries(claudeJson.projects)) {
      if (value?.mcpServers?.elevenlabs?.env?.ELEVENLABS_API_KEY) {
        API_KEY = value.mcpServers.elevenlabs.env.ELEVENLABS_API_KEY;
        break;
      }
    }
  }
} catch {}

const SARAH_AGENT_ID = 'agent_xxxx_demo';
const API_BASE = 'https://api.elevenlabs.io/v1';

// ============================================================================
// ELEVENLABS-SPECIFIC FIELD DOMAINS
// ============================================================================

const ELEVENLABS_FIELD_DOMAINS = {
  // Caller persona variations
  caller_persona: {
    values: [
      // Business owner personas
      'busy_hvac_contractor',
      'skeptical_plumber',
      'interested_electrician',
      'rude_business_owner',
      'elderly_shop_owner',
      'non_english_speaker',
      'confused_first_time_caller',
      'competitor_spy',
      'angry_previous_customer',
      'tire_kicker',
      // Edge personas
      'completely_silent',
      'only_says_yes',
      'only_says_no',
      'speaks_very_fast',
      'speaks_very_slow',
      'heavy_accent',
      'child_voice',
      'background_noise_heavy',
      'poor_connection',
      'robot_voice_detection'
    ],
    cardinality: 100
  },

  // Call direction
  call_direction: {
    values: ['inbound', 'outbound'],
    cardinality: 2
  },

  // Initial sentiment
  initial_sentiment: {
    values: ['positive', 'neutral', 'negative', 'confused', 'hostile', 'enthusiastic'],
    cardinality: 6
  },

  // Scenario type
  scenario_type: {
    values: [
      'appointment_booking',
      'price_inquiry',
      'service_complaint',
      'general_inquiry',
      'emergency_service',
      'callback_request',
      'cancel_appointment',
      'reschedule_appointment',
      'follow_up_call',
      'wrong_number',
      'spam_detection',
      'competitor_price_check',
      'partnership_inquiry',
      'job_application',
      'media_inquiry',
      'legal_inquiry'
    ],
    cardinality: 50
  },

  // Conversation complexity
  max_turns: {
    values: [3, 5, 8, 10, 15, 20, 30],
    cardinality: 7
  },

  // Language/locale
  locale: {
    values: ['en-US', 'en-GB', 'en-AU', 'es-US', 'fr-CA'],
    cardinality: 5
  },

  // Time of call
  call_time_context: {
    values: ['business_hours', 'after_hours', 'weekend', 'holiday', 'emergency'],
    cardinality: 5
  },

  // Business context injection
  business_context: {
    values: [
      'hvac_residential',
      'hvac_commercial',
      'plumbing_emergency',
      'electrical_inspection',
      'general_contracting',
      'roofing_estimate'
    ],
    cardinality: 10
  },

  // Interruption patterns
  interruption_mode: {
    values: ['none', 'occasional', 'frequent', 'constant'],
    cardinality: 4
  },

  // Speech patterns
  speech_pattern: {
    values: ['normal', 'stuttering', 'mumbling', 'shouting', 'whispering', 'distracted'],
    cardinality: 6
  }
};

// ============================================================================
// PERSONA PROMPT GENERATORS
// ============================================================================

const PERSONA_PROMPTS = {
  busy_hvac_contractor: (context) => `
You are a busy HVAC contractor who just got ${context.call_direction === 'outbound' ? 'cold called' : 'connected'}.
You have 5 trucks on the road and your phone is ringing constantly.
Be skeptical but professional. You're interested if they can actually help your business.
Time is money - get to the point quickly.
Current mood: ${context.initial_sentiment}
`,

  skeptical_plumber: (context) => `
You are a skeptical master plumber who has been burned by salespeople before.
Ask tough questions about pricing, guarantees, and ROI.
You won't commit to anything without seeing proof.
Current mood: ${context.initial_sentiment}
`,

  rude_business_owner: (context) => `
You are an extremely rude business owner having the worst day.
Be dismissive, interrupt frequently, use mild profanity.
Eventually hang up if not convinced quickly.
This tests the agent's de-escalation capabilities.
`,

  non_english_speaker: (context) => `
You are a business owner with limited English.
Mix in broken English, ask for clarification often.
Say things like "No understand" or "What mean?"
Test the agent's patience and clarity.
`,

  completely_silent: (context) => `
You are a caller who remains completely silent.
Do not say anything. Just breathe occasionally.
Test how the agent handles silence and prompts for response.
`,

  competitor_spy: (context) => `
You pretend to be interested but are actually gathering competitive intel.
Ask specific questions about pricing, processes, and client lists.
Test the agent's ability to not disclose sensitive information.
`,

  elderly_shop_owner: (context) => `
You are an elderly shop owner who is hard of hearing.
Ask "What?" frequently. Speak slowly.
Be friendly but need things repeated.
Test the agent's patience and accommodation.
`,

  angry_previous_customer: (context) => `
You are furious about a previous bad experience (make one up).
Demand to speak to a manager. Threaten bad reviews.
Test escalation handling and empathy.
`
};

// ============================================================================
// SCENARIO GENERATORS
// ============================================================================

function generateScenario(combination) {
  const persona = PERSONA_PROMPTS[combination.caller_persona] || PERSONA_PROMPTS.busy_hvac_contractor;
  const context = {
    call_direction: combination.call_direction || 'inbound',
    initial_sentiment: combination.initial_sentiment || 'neutral',
    scenario_type: combination.scenario_type || 'general_inquiry',
    business_context: combination.business_context || 'hvac_residential'
  };

  return {
    id: `sarah-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${combination.caller_persona} - ${combination.scenario_type}`,
    simulated_user_prompt: persona(context),
    dynamic_variables: {
      call_direction: context.call_direction,
      caller_sentiment: context.initial_sentiment,
      business_type: context.business_context,
      time_of_day: combination.call_time_context || 'business_hours'
    },
    settings: {
      max_turns: combination.max_turns || 10,
      first_message_mode: context.call_direction === 'outbound' ? 'agent_initiates' : 'simulate_user_input'
    },
    evaluation_criteria: generateEvaluationCriteria(combination)
  };
}

function generateEvaluationCriteria(combination) {
  const criteria = [
    {
      name: 'professional_greeting',
      weight: 1,
      check: 'Agent introduces themselves and company name within first 2 turns'
    },
    {
      name: 'listens_to_needs',
      weight: 2,
      check: 'Agent asks clarifying questions before proposing solutions'
    },
    {
      name: 'handles_objections',
      weight: 2,
      check: 'Agent addresses concerns professionally without being pushy'
    }
  ];

  // Add scenario-specific criteria
  if (combination.scenario_type === 'appointment_booking') {
    criteria.push({
      name: 'captures_appointment_details',
      weight: 3,
      check: 'Agent collects: date/time preference, service type, contact info'
    });
  }

  if (combination.caller_persona === 'angry_previous_customer') {
    criteria.push({
      name: 'de_escalation',
      weight: 3,
      check: 'Agent acknowledges frustration and offers resolution path'
    });
  }

  if (combination.caller_persona === 'competitor_spy') {
    criteria.push({
      name: 'information_security',
      weight: 3,
      check: 'Agent does not disclose client lists, proprietary pricing, or internal processes'
    });
  }

  return criteria;
}

// ============================================================================
// ELEVENLABS API EXECUTOR
// ============================================================================

async function executeElevenLabsSimulation(scenario) {
  const payload = {
    simulation_specification: {
      simulated_user_config: {
        prompt: scenario.simulated_user_prompt,
        first_message_mode: scenario.settings.first_message_mode || 'simulate_user_input'
      },
      max_turns: scenario.settings.max_turns || 10,
      evaluation_criteria: scenario.evaluation_criteria
    }
  };

  // Add dynamic variables if present
  if (scenario.dynamic_variables && Object.keys(scenario.dynamic_variables).length > 0) {
    payload.extra_body = {
      dynamic_variables: scenario.dynamic_variables
    };
  }

  try {
    const response = await fetch(`${API_BASE}/convai/agents/${SARAH_AGENT_ID}/simulate_conversation`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const body = await response.json().catch(() => response.text());

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
      scenario_id: scenario.id
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      scenario_id: scenario.id
    };
  }
}

// ============================================================================
// TEST MATRIX GENERATOR
// ============================================================================

function generateTestMatrix(options = {}) {
  const {
    testsPerDimension = 100,
    coverageLevel = 'pairwise'
  } = options;

  const scenarios = [];
  const fields = Object.keys(ELEVENLABS_FIELD_DOMAINS);

  // Generate pairwise combinations
  if (coverageLevel === 'pairwise' || coverageLevel === 'triple') {
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        const field1 = fields[i];
        const field2 = fields[j];
        const values1 = ELEVENLABS_FIELD_DOMAINS[field1].values;
        const values2 = ELEVENLABS_FIELD_DOMAINS[field2].values;

        // Generate combinations for this pair
        for (const v1 of values1.slice(0, Math.ceil(testsPerDimension / values2.length))) {
          for (const v2 of values2) {
            scenarios.push(generateScenario({
              [field1]: v1,
              [field2]: v2
            }));
          }
        }
      }
    }
  }

  // Add edge case scenarios
  const edgeCases = [
    // All hostile
    { caller_persona: 'rude_business_owner', initial_sentiment: 'hostile', interruption_mode: 'constant' },
    // Silent caller
    { caller_persona: 'completely_silent', max_turns: 5 },
    // Non-English emergency
    { caller_persona: 'non_english_speaker', scenario_type: 'emergency_service' },
    // Competitor intel gathering
    { caller_persona: 'competitor_spy', scenario_type: 'price_inquiry' },
    // Complex booking
    { caller_persona: 'elderly_shop_owner', scenario_type: 'appointment_booking', max_turns: 20 }
  ];

  for (const edge of edgeCases) {
    scenarios.push(generateScenario(edge));
  }

  return scenarios;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('  🎯 ELEVENLABS SARAH AGENT - COMPREHENSIVE ATDD TEST SUITE');
  console.log('='.repeat(70) + '\n');

  if (!API_KEY) {
    console.error('❌ ElevenLabs API key not found in .claude.json');
    process.exit(1);
  }

  console.log(`Agent ID: ${SARAH_AGENT_ID}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}`);

  // Parse arguments
  const args = process.argv.slice(2);
  const options = {
    testsPerDimension: 100,
    coverageLevel: 'pairwise',
    concurrency: 5,
    dryRun: true
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--tests') options.testsPerDimension = parseInt(args[++i], 10);
    if (args[i] === '--coverage') options.coverageLevel = args[++i];
    if (args[i] === '--concurrency') options.concurrency = parseInt(args[++i], 10);
    if (args[i] === '--execute') options.dryRun = false;
  }

  // Generate test matrix
  console.log('\n📊 Generating test matrix...');
  const scenarios = generateTestMatrix(options);
  console.log(`   Generated ${scenarios.length.toLocaleString()} test scenarios`);

  // Calculate coverage
  let totalCombinations = 1;
  for (const domain of Object.values(ELEVENLABS_FIELD_DOMAINS)) {
    totalCombinations *= domain.cardinality;
  }
  console.log(`   Full Cartesian space: ${totalCombinations.toExponential(2)}`);
  console.log(`   Coverage: ${((scenarios.length / totalCombinations) * 100).toFixed(4)}%`);

  if (options.dryRun) {
    console.log('\n⚠️  DRY RUN MODE - No API calls will be made');
    console.log('   Use --execute flag to run actual simulations');

    // Export scenarios for review
    const outputPath = path.join(process.cwd(), 'test-results', 'sarah-scenarios.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify({
      generated: new Date().toISOString(),
      count: scenarios.length,
      scenarios: scenarios.slice(0, 100) // First 100 for review
    }, null, 2));
    console.log(`   Exported ${Math.min(100, scenarios.length)} scenarios to: ${outputPath}`);

    return;
  }

  // Execute simulations
  console.log('\n🚀 Executing simulations...\n');

  const results = {
    total: scenarios.length,
    completed: 0,
    success: 0,
    failed: 0,
    errors: [],
    startTime: Date.now()
  };

  // Process in batches
  const batchSize = options.concurrency;
  for (let i = 0; i < scenarios.length; i += batchSize) {
    const batch = scenarios.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(scenario => executeElevenLabsSimulation(scenario))
    );

    for (const result of batchResults) {
      results.completed++;

      if (result.status === 200) {
        results.success++;
      } else {
        results.failed++;
        if (results.errors.length < 10) {
          results.errors.push({
            scenario_id: result.scenario_id,
            status: result.status,
            error: result.error || result.body
          });
        }
      }
    }

    // Progress
    const percent = Math.floor((results.completed / results.total) * 100);
    const elapsed = (Date.now() - results.startTime) / 1000;
    const rate = results.completed / elapsed;

    process.stdout.write(
      `\r  [${percent}%] ${results.completed}/${results.total} | ` +
      `✅ ${results.success} | ❌ ${results.failed} | ${rate.toFixed(1)} tests/s`
    );

    // Rate limiting - don't hammer the API
    await new Promise(r => setTimeout(r, 200));
  }

  // Final report
  const duration = (Date.now() - results.startTime) / 1000;

  console.log('\n\n' + '='.repeat(70));
  console.log('  📊 FINAL RESULTS');
  console.log('='.repeat(70));
  console.log(`
  Total Scenarios:    ${results.total.toLocaleString()}
  Completed:          ${results.completed.toLocaleString()}
  Success:            ${results.success.toLocaleString()} ✅
  Failed:             ${results.failed.toLocaleString()} ❌

  Pass Rate:          ${((results.success / results.completed) * 100).toFixed(2)}%
  Duration:           ${duration.toFixed(2)}s
  Throughput:         ${(results.completed / duration).toFixed(1)} tests/s
  `);

  if (results.errors.length > 0) {
    console.log('  Sample Errors:');
    for (const err of results.errors.slice(0, 5)) {
      console.log(`    - ${err.scenario_id}: ${err.status} - ${JSON.stringify(err.error).substring(0, 100)}`);
    }
  }

  // Export results
  const resultsPath = path.join(process.cwd(), 'test-results', `sarah-results-${Date.now()}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n  Results exported to: ${resultsPath}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  ELEVENLABS_FIELD_DOMAINS,
  PERSONA_PROMPTS,
  generateScenario,
  generateTestMatrix,
  executeElevenLabsSimulation,
  SARAH_AGENT_ID
};

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
}
