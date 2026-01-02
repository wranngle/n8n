#!/usr/bin/env node
/**
 * TRIGGER TEST CALL
 *
 * Creates a test conversation to verify challenge mode fixes.
 * Uses the signed URL/widget approach for immediate testing.
 */

const fs = require('fs');
const path = require('path');

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m'
};

const AGENT_ID = 'agent_5701kdgf9s4vfe9rhe68ntjrms9g';
const API_KEY = process.env.ELEVENLABS_API_KEY;

async function getSignedUrl() {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`, {
    method: 'GET',
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`Failed to get signed URL: ${response.status}`);
  }

  return response.json();
}

async function getRecentConversations() {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${AGENT_ID}&page_size=5`, {
    headers: { 'xi-api-key': API_KEY }
  });

  if (!response.ok) {
    throw new Error(`Failed to get conversations: ${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     TEST CALL TRIGGER                                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  if (!API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY not set${C.reset}`);
    process.exit(1);
  }

  // Step 1: Get signed URL for widget testing
  console.log(`\n${C.cyan}[1] Getting widget URL for immediate testing...${C.reset}`);
  try {
    const urlData = await getSignedUrl();
    console.log(`\n${C.green}${C.bright}=== WIDGET TEST URL ===${C.reset}`);
    console.log(`${C.yellow}${urlData.signed_url || JSON.stringify(urlData)}${C.reset}`);
    console.log(`\nOpen this URL in browser to test the agent with challenge scenarios.`);
  } catch (e) {
    console.log(`  ${C.yellow}Widget URL not available: ${e.message}${C.reset}`);
  }

  // Step 2: Show current conversation count
  console.log(`\n${C.cyan}[2] Current conversation baseline...${C.reset}`);
  const convData = await getRecentConversations();
  const conversations = convData.conversations || [];
  console.log(`  Total recent conversations: ${conversations.length}`);

  if (conversations.length > 0) {
    console.log(`  Latest: ${conversations[0].conversation_id}`);
    console.log(`  Status: ${conversations[0].status}`);
    console.log(`  Time: ${new Date(conversations[0].start_time_unix_secs * 1000).toISOString()}`);
  }

  // Step 3: Generate test script for challenge scenarios
  console.log(`\n${C.cyan}[3] Challenge Test Script${C.reset}`);
  console.log(`${C.bright}When testing, try these scenarios:${C.reset}`);
  console.log(`
${C.yellow}1. CORRECTION_CASCADE:${C.reset}
   Say: "Hi, I'm Mike. Actually, it's Michael. No wait, call me Mick."
   Verify: Agent uses ONLY "Mick" going forward

${C.yellow}2. TOPIC_WHIPLASH:${C.reset}
   Say: "I'm John from TechCorp interested in automation."
   Then: "What's the weather like?"
   Then: "Anyway, about that demo..."
   Verify: Agent remembers John, TechCorp without re-asking

${C.yellow}3. ANGRY_IMPATIENT:${C.reset}
   Say: "I don't have time for this. Just give me the damn link."
   Verify: Agent stays calm, gives link directly

${C.yellow}4. SPELLED_OUT_NUMBER:${C.reset}
   Say: "My number is five five five, one two three, four five six seven"
   Verify: Agent confirms as "555-123-4567"

${C.yellow}5. TOOL_CONFIRMATION_TRAP:${C.reset}
   Say: "Yeah text me at 555-123-4567"
   Verify: Agent waits for tool response before confirming
`);

  // Step 4: Output verification command
  console.log(`\n${C.cyan}[4] After testing, run this to verify:${C.reset}`);
  console.log(`   node scripts/verify-test-outcomes.js`);

  // Save baseline for comparison
  const baselinePath = path.join(__dirname, '..', 'data', 'test-baseline.json');
  const dataDir = path.dirname(baselinePath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(baselinePath, JSON.stringify({
    timestamp: new Date().toISOString(),
    agent_id: AGENT_ID,
    conversation_count_before: conversations.length,
    last_conversation_id: conversations[0]?.conversation_id || null,
    fixes_applied: ['TOPIC_WHIPLASH', 'CORRECTION_CASCADE', 'ANGRY_IMPATIENT', 'SPELLED_OUT_NUMBER', 'TOOL_CONFIRMATION_TRAP']
  }, null, 2));

  console.log(`\n${C.dim}Baseline saved for post-test comparison${C.reset}`);
}

main().catch(err => {
  console.error(`${C.red}ERROR: ${err.message}${C.reset}`);
  process.exit(1);
});
