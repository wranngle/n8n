#!/usr/bin/env node
/**
 * detect-voice-agent-intent.js
 * Hook: UserPromptSubmit
 *
 * Detects voice agent creation requests and routes to voice-agent-factory skill.
 *
 * Triggers on:
 * - "make a voice agent for"
 * - "create an agent for"
 * - "oncall demo agent"
 * - "voice receptionist"
 * - "AI phone agent"
 */

const { logHook, readStdinJson, outputResult } = require('./hook-utils');

// Voice agent trigger patterns
const VOICE_AGENT_PATTERNS = [
  /make\s+(a\s+)?voice\s+agent/i,
  /create\s+(a\s+)?(voice\s+)?agent\s+for/i,
  /oncall\s+(demo\s+)?agent/i,
  /voice\s+receptionist/i,
  /ai\s+phone\s+agent/i,
  /phone\s+agent\s+for/i,
  /voice\s+ai\s+for/i,
  /demo\s+agent\s+for/i,
  /elevenlabs\s+agent/i,
  /twilio\s+voice/i
];

// Company name extraction pattern
const COMPANY_PATTERN = /(?:for|called|named)\s+["']?([A-Z][^"'\n]+?)["']?(?:\s*$|\s+(?:with|using|that))/i;

/**
 * Detect voice agent intent in user message
 */
function detectVoiceAgentIntent(userMessage) {
  if (!userMessage) return { detected: false };

  const isVoiceAgentRequest = VOICE_AGENT_PATTERNS.some(pattern =>
    pattern.test(userMessage)
  );

  if (!isVoiceAgentRequest) return { detected: false };

  // Extract company name if present
  const companyMatch = userMessage.match(COMPANY_PATTERN);
  const companyName = companyMatch ? companyMatch[1].trim() : null;

  return {
    detected: true,
    companyName,
    matchedPattern: VOICE_AGENT_PATTERNS.find(p => p.test(userMessage))?.source
  };
}

async function main() {
  try {
    const data = await readStdinJson();

    // Try multiple possible field names for user message
    const userMessage = (
      data.user_prompt ||
      data.user_message ||
      data.prompt ||
      data.message ||
      data.content ||
      ''
    ).trim();

    logHook('detect-voice-agent-intent', 'Hook triggered', {
      messageLength: userMessage.length,
      dataKeys: Object.keys(data)
    });

    // Skip if message is too short
    if (userMessage.length < 10) {
      process.exit(0);
    }

    // Check for voice agent patterns
    const detection = detectVoiceAgentIntent(userMessage);

    if (detection.detected) {
      logHook('detect-voice-agent-intent', 'Voice agent intent detected', {
        companyName: detection.companyName,
        matchedPattern: detection.matchedPattern
      });

      // Output instruction to invoke skill
      outputResult({
        continue: true,
        systemMessage: `🎤 VOICE AGENT FACTORY ACTIVATED

Detected request to create a voice agent${detection.companyName ? ` for "${detection.companyName}"` : ''}.

**MANDATORY**: Invoke the voice-agent-factory skill:
\`\`\`
Skill("voice-agent-factory")
\`\`\`

This skill will:
1. Parse company name and industry
2. Load appropriate prompt template
3. Create ElevenLabs agent with optimized settings
4. Generate SMS booking workflow for n8n
5. Create test scenarios
6. Output setup documentation

Proceed with skill invocation.`
      });
    }

    // Exit cleanly
    process.exit(0);

  } catch (e) {
    logHook('detect-voice-agent-intent', 'Error', { error: e.message, stack: e.stack });
    process.exit(0); // Exit silently on error
  }
}

main();
