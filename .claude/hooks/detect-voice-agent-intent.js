#!/usr/bin/env node
/**
 * detect-voice-agent-intent.js
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

const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', 'logs', 'voice-agent-intent.log');

function log(message, data = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    message,
    ...data
  };
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n');
  } catch (e) { /* ignore */ }
}

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
];

// Company name extraction pattern
const COMPANY_PATTERN = /(?:for|called|named)\s+["']?([A-Z][^"'\n]+?)["']?(?:\s*$|\s+(?:with|using|that))/i;

async function main() {
  let input = '';
  
  // Read stdin
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  
  try {
    const data = JSON.parse(input);
    const userMessage = data.user_message || data.message || '';
    
    // Check for voice agent patterns
    const isVoiceAgentRequest = VOICE_AGENT_PATTERNS.some(pattern => 
      pattern.test(userMessage)
    );
    
    if (isVoiceAgentRequest) {
      // Extract company name if present
      const companyMatch = userMessage.match(COMPANY_PATTERN);
      const companyName = companyMatch ? companyMatch[1].trim() : null;
      
      log('Voice agent intent detected', { 
        userMessage: userMessage.substring(0, 100),
        companyName 
      });
      
      // Output instruction to invoke skill
      const result = {
        continue: true,
        systemMessage: `🎤 VOICE AGENT FACTORY ACTIVATED

Detected request to create a voice agent${companyName ? ` for "${companyName}"` : ''}.

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
      };
      
      console.log(JSON.stringify(result));
    } else {
      // No voice agent intent - exit silently to allow
      process.exit(0);
    }
    
  } catch (e) {
    log('Error', { error: e.message });
    process.exit(0); // Exit silently on error
  }
}

main().catch(e => {
  process.exit(0); // Exit silently on error
});
