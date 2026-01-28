#!/usr/bin/env node

/**
 * ElevenLabs Sarah Agent Test Suite
 *
 * Tests the Sarah Wranngle Receptionist voice agent using the ElevenLabs
 * conversation simulation API.
 *
 * Credentials are auto-loaded from:
 *   1. Environment variable ELEVENLABS_API_KEY (if set)
 *   2. ~/.claude/.env file (automatic fallback)
 *
 * Usage:
 *   node test-sarah.js [scenario] [--json]
 *
 * Scenarios:
 *   happy-path  - Full booking flow with phone and SMS (default)
 *   minimal     - Quick 4-turn conversation test
 *   no-phone    - Edge case: user refuses to share info
 *
 * Options:
 *   --json      - Output results as JSON for CI/CD integration
 */

const fs = require('fs');
const path = require('path');

/**
 * Load credentials from .env file
 * @param {string} envPath - Path to .env file
 * @returns {Record<string, string>} Key-value pairs from .env
 */
function loadEnvFile(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    return env;
  } catch {
    return {};
  }
}

// Auto-load from ~/.claude/.env if env vars not set
const CLAUDE_ENV_PATH = path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', '.env');
const envFile = loadEnvFile(CLAUDE_ENV_PATH);

// Configuration with automatic fallback to .env file
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || envFile.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID || 'agent_8001kdgp7qbyf4wvhs540be78vew';

// Named constants for turn limits (based on conversation complexity)
const TURNS = {
  FULL_BOOKING_FLOW: 10,  // Name + phone + SMS permission + tool call + confirmation
  QUICK_TEST: 4,          // Greeting + inquiry + response + follow-up
  EDGE_CASE: 8            // Extended conversation for difficult scenarios
};

// Retry configuration for unstable API
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 2000,
  BACKOFF_MULTIPLIER: 2
};

// Request timeout (ElevenLabs can be slow)
const REQUEST_TIMEOUT_MS = 120000;

/**
 * @typedef {Object} Scenario
 * @property {string} prompt - The simulated user prompt
 * @property {number} turns - Maximum conversation turns
 */

/**
 * @typedef {Object} TestResult
 * @property {boolean} success - Whether the test completed
 * @property {boolean} smsCalled - Whether the SMS tool was invoked
 * @property {Object} data - Raw API response data
 */

/** @type {Record<string, Scenario>} */
const scenarios = {
  'happy-path': {
    prompt: 'You are a dentist calling about AI. Phone number is 555-1234. Agree to receive SMS.',
    turns: TURNS.FULL_BOOKING_FLOW
  },
  'minimal': {
    prompt: 'You are interested in AI voice agents.',
    turns: TURNS.QUICK_TEST
  },
  'no-phone': {
    prompt: 'You are a dentist but refuse to share personal information.',
    turns: TURNS.EDGE_CASE
  }
};

/**
 * Sleep utility for retry backoff
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with timeout using AbortController
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Execute API request with retry logic
 * @param {string} url - Request URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, options) {
  let lastError;
  let delay = RETRY_CONFIG.INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);

      // Retry on 500 errors (known ElevenLabs instability)
      if (response.status === 500 && attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
        console.error(`Attempt ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS}: Server error 500, retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= RETRY_CONFIG.BACKOFF_MULTIPLIER;
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;

      if (error.name === 'AbortError') {
        console.error(`Attempt ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS}: Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      } else {
        console.error(`Attempt ${attempt}/${RETRY_CONFIG.MAX_ATTEMPTS}: ${error.message}`);
      }

      if (attempt < RETRY_CONFIG.MAX_ATTEMPTS) {
        await sleep(delay);
        delay *= RETRY_CONFIG.BACKOFF_MULTIPLIER;
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Test Sarah agent with specified scenario
 * @param {string} scenarioName - Name of scenario to run
 * @param {boolean} jsonOutput - Whether to output JSON
 * @returns {Promise<TestResult>}
 */
async function testSarah(scenarioName = 'happy-path', jsonOutput = false) {
  // Validate API key
  if (!ELEVENLABS_API_KEY) {
    const error = 'ELEVENLABS_API_KEY environment variable is required';
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error }));
    } else {
      console.error(`Error: ${error}`);
    }
    process.exit(1);
  }

  const config = scenarios[scenarioName] || scenarios['happy-path'];

  if (!jsonOutput) {
    console.log(`=== SARAH TEST: ${scenarioName} ===\n`);
  }

  const body = {
    simulation_specification: {
      simulated_user_config: {
        prompt: {
          prompt: config.prompt,
          llm: 'gpt-4o-mini',
          temperature: 0.7
        }
      }
    },
    new_turns_limit: config.turns
  };

  try {
    const response = await fetchWithRetry(
      `https://api.elevenlabs.io/v1/convai/agents/${AGENT_ID}/simulate_conversation`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      if (jsonOutput) {
        console.log(JSON.stringify({ success: false, error: `HTTP ${response.status}: ${error}` }));
      } else {
        console.error(`Error ${response.status}: ${error}`);
      }
      process.exit(1);
    }

    const data = await response.json();

    // Check if SMS tool was called
    const smsCalled = data.simulated_conversation.some(
      turn => turn.tool_calls?.some(t => t.tool_name === 'send_sms')
    );

    const result = {
      success: true,
      scenario: scenarioName,
      smsCalled,
      callSuccessful: data.analysis.call_successful,
      summary: data.analysis.transcript_summary,
      turnCount: data.simulated_conversation.length,
      data
    };

    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      // Print conversation
      console.log('=== CONVERSATION ===\n');
      for (const turn of data.simulated_conversation) {
        const role = turn.role.toUpperCase();
        const msg = turn.message;
        const tools = turn.tool_calls?.length > 0
          ? ` [TOOLS: ${turn.tool_calls.map(t => t.tool_name).join(', ')}]`
          : '';
        console.log(`[${role}]: ${msg}${tools}`);
      }

      // Print analysis
      console.log('\n=== ANALYSIS ===');
      console.log(`Call Successful: ${data.analysis.call_successful}`);
      console.log(`Summary: ${data.analysis.transcript_summary}`);
      console.log(`\nSMS Tool Called: ${smsCalled ? 'YES' : 'NO'}`);
    }

    process.exit(0);

  } catch (error) {
    if (jsonOutput) {
      console.log(JSON.stringify({ success: false, error: error.message }));
    } else {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const scenario = args.find(arg => !arg.startsWith('--')) || 'happy-path';

testSarah(scenario, jsonOutput);
