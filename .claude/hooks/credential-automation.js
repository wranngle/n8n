#!/usr/bin/env node
/**
 * credential-automation.js
 *
 * AUTOMATIC CREDENTIAL SEARCH, SAVE, AND TEST
 * ============================================
 *
 * Hook: UserPromptSubmit
 *
 * When an API key or credential is mentioned:
 * 1. Search memory system for existing credential
 * 2. Check env files in project
 * 3. If not found, prompt to save
 * 4. Provide test command for validation
 *
 * Supported services:
 * - ElevenLabs (xi-api-key)
 * - OpenAI (Authorization: Bearer)
 * - Google/Gemini (API key)
 * - Twilio (Account SID + Auth Token)
 * - Pipedrive (API token)
 */

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const PROJECT_ROOT = getProjectRoot();

// Known services and their credential patterns
const SERVICE_PATTERNS = {
  elevenlabs: {
    keywords: ['elevenlabs', 'eleven labs', 'xi-api-key', 'voice ai'],
    envKey: 'ELEVENLABS_API_KEY',
    header: 'xi-api-key',
    testUrl: 'https://api.elevenlabs.io/v1/user',
    n8nCredId: 'eR7srDUHDyZLIZgh'
  },
  openai: {
    keywords: ['openai', 'gpt', 'chatgpt', 'openai api'],
    envKey: 'OPENAI_API_KEY',
    header: 'Authorization: Bearer',
    testUrl: 'https://api.openai.com/v1/models'
  },
  gemini: {
    keywords: ['gemini', 'google ai', 'generative ai', 'gemini api'],
    envKey: 'GOOGLE_API_KEY',
    header: 'x-goog-api-key',
    testUrl: 'https://generativelanguage.googleapis.com/v1/models'
  },
  twilio: {
    keywords: ['twilio', 'sms', 'phone', 'telephony'],
    envKey: 'TWILIO_ACCOUNT_SID',
    envSecondary: 'TWILIO_AUTH_TOKEN',
    testUrl: 'https://api.twilio.com/2010-04-01/Accounts'
  },
  pipedrive: {
    keywords: ['pipedrive', 'crm', 'sales pipeline'],
    envKey: 'PIPEDRIVE_API_TOKEN',
    testUrl: 'https://api.pipedrive.com/v1/users/me'
  },
  openrouter: {
    keywords: ['openrouter'],
    envKey: 'OPENROUTER_API_KEY',
    header: 'Authorization: Bearer',
    testUrl: 'https://openrouter.ai/api/v1/models'
  },
  n8n: {
    keywords: ['n8n api', 'n8n instance', 'n8n credential'],
    envKey: 'N8N_API_KEY',
    testUrl: 'https://n8n.wranngle.com/api/v1/workflows'
  }
};

/**
 * Detect which services are mentioned in user prompt
 * @param {string} prompt - User's message
 * @returns {Array<string>} - List of detected service names
 */
function detectMentionedServices(prompt) {
  if (!prompt || typeof prompt !== 'string') return [];

  const lowerPrompt = prompt.toLowerCase();
  const detected = [];

  for (const [service, config] of Object.entries(SERVICE_PATTERNS)) {
    for (const keyword of config.keywords) {
      if (lowerPrompt.includes(keyword)) {
        detected.push(service);
        break;
      }
    }
  }

  return [...new Set(detected)]; // Dedupe
}

/**
 * Check if service has credential in env files
 * @param {string} service - Service name
 * @returns {{found: boolean, path: string|null, value: string|null}}
 */
function checkEnvFiles(service) {
  const config = SERVICE_PATTERNS[service];
  if (!config) return { found: false };

  const envKey = config.envKey;

  // Check standard locations
  const envPaths = [
    path.join(PROJECT_ROOT, '.env'),
    path.join(PROJECT_ROOT, '.env.local'),
    path.join(PROJECT_ROOT, 'workflows', '.env'),
    path.join(PROJECT_ROOT, 'workflows', 'voice_ai_agents', 'env', `.env.${service}`)
  ];

  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          if (line.startsWith(envKey + '=')) {
            const value = line.substring(envKey.length + 1).trim();
            if (value && value !== '""' && value !== "''") {
              return {
                found: true,
                path: envPath,
                value: value.substring(0, 8) + '...' // Masked
              };
            }
          }
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  return { found: false };
}

/**
 * Generate credential status report
 * @param {Array<string>} services - List of services to check
 * @returns {string} - Status report
 */
function generateCredentialReport(services) {
  if (services.length === 0) return '';

  const lines = ['📋 CREDENTIAL STATUS CHECK'];

  for (const service of services) {
    const config = SERVICE_PATTERNS[service];
    const envCheck = checkEnvFiles(service);

    if (envCheck.found) {
      lines.push(`✅ ${service.toUpperCase()}: Found in ${envCheck.path} (${envCheck.value})`);
      if (config.n8nCredId) {
        lines.push(`   n8n Credential ID: ${config.n8nCredId}`);
      }
    } else {
      lines.push(`❌ ${service.toUpperCase()}: NOT FOUND`);
      lines.push(`   Expected env var: ${config.envKey}`);
      lines.push(`   To save: Create file workflows/voice_ai_agents/env/.env.${service}`);
      lines.push(`   Format: ${config.envKey}=your_api_key_here`);
      if (config.testUrl) {
        lines.push(`   Test: curl -H "${config.header}: $KEY" ${config.testUrl}`);
      }
    }
    lines.push('');
  }

  // Add memory system reminder
  lines.push('💾 Remember: Store credentials in memory system for persistence:');
  lines.push('   mcp__memory__create_entities([{name: "credential_xxx", entityType: "credential", observations: [...]}])');

  return lines.join('\n');
}

/**
 * Check if prompt contains API key pattern (actual key provided)
 * @param {string} prompt - User prompt
 * @returns {{found: boolean, service: string|null, keyPreview: string|null}}
 */
function detectProvidedApiKey(prompt) {
  if (!prompt) return { found: false };

  // Common API key patterns (masked for security)
  const patterns = [
    { pattern: /sk-[a-zA-Z0-9]{20,}/, service: 'openai' },
    { pattern: /[a-f0-9]{32}/, service: 'unknown' }, // Generic 32-char hex
    { pattern: /xi-[a-zA-Z0-9]+/, service: 'elevenlabs' },
    { pattern: /AIza[a-zA-Z0-9_-]{35}/, service: 'google' },
    { pattern: /AC[a-f0-9]{32}/, service: 'twilio' }
  ];

  for (const { pattern, service } of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      return {
        found: true,
        service,
        keyPreview: match[0].substring(0, 8) + '...'
      };
    }
  }

  return { found: false };
}

/**
 * Main hook handler
 */
async function main() {
  logHook('credential-automation', 'Hook triggered');

  try {
    const data = await readStdinJson();
    const userPrompt = data.user_prompt || '';

    // Detect mentioned services
    const mentionedServices = detectMentionedServices(userPrompt);

    // Check if user is providing an actual API key
    const providedKey = detectProvidedApiKey(userPrompt);

    logHook('credential-automation', 'Detection', {
      mentionedServices,
      keyProvided: providedKey.found
    });

    // Generate appropriate response
    const messages = [];

    if (mentionedServices.length > 0) {
      messages.push(generateCredentialReport(mentionedServices));
    }

    if (providedKey.found) {
      messages.push(`
⚠️ API KEY DETECTED in prompt (${providedKey.keyPreview})

IMMEDIATE ACTION REQUIRED:
1. Store in memory: mcp__memory__create_entities
2. Save to env file: workflows/voice_ai_agents/env/.env.${providedKey.service}
3. Test the key before using in workflows

DO NOT include raw API keys in workflow JSON or logs.
`);
    }

    // Output result
    if (messages.length > 0) {
      outputResult({
        continue: true,
        systemMessage: messages.join('\n\n')
      });
    } else {
      outputResult({ continue: true });
    }

    process.exit(0);

  } catch (e) {
    logHook('credential-automation', 'Error', { error: e.message });
    outputResult({ continue: true }); // Fail open
    process.exit(0);
  }
}

// Export for testing
module.exports = {
  detectMentionedServices,
  checkEnvFiles,
  detectProvidedApiKey,
  generateCredentialReport,
  SERVICE_PATTERNS
};

// Run if called directly
if (require.main === module) {
  main();
}
