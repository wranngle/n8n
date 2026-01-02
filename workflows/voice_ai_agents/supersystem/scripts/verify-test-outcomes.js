#!/usr/bin/env node
/**
 * VERIFY TEST OUTCOMES
 *
 * Run this AFTER making a test call to verify the challenge fixes worked.
 * Analyzes the latest conversation transcript for expected behaviors.
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

const SARAH_AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';
const API_KEY = process.env.ELEVENLABS_API_KEY;

async function getRecentConversations(agentId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId}&page_size=5`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!response.ok) throw new Error(`Failed to get conversations: ${response.status}`);
  return response.json();
}

async function getConversation(convId) {
  const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversations/${convId}`, {
    headers: { 'xi-api-key': API_KEY }
  });
  if (!response.ok) throw new Error(`Failed to get conversation: ${response.status}`);
  return response.json();
}

// Challenge fix verification patterns
const VERIFICATION_PATTERNS = [
  {
    id: 'CORRECTION_CASCADE',
    description: 'Uses only the LATEST corrected name',
    check: (transcript) => {
      // Look for name correction followed by agent using old name
      const lines = transcript.split('\n');
      let latestName = null;
      let usedOldName = false;

      for (const line of lines) {
        // User provides name
        const userNameMatch = line.match(/user:.*(?:I'm|call me|it's|actually)\s+(\w+)/i);
        if (userNameMatch) {
          const previousName = latestName;
          latestName = userNameMatch[1];

          // Check if agent uses old name after this
          const agentAfter = lines.slice(lines.indexOf(line) + 1).find(l => l.startsWith('agent:'));
          if (agentAfter && previousName && agentAfter.includes(previousName) && !agentAfter.includes(latestName)) {
            usedOldName = true;
          }
        }
      }

      return { passed: !usedOldName, evidence: usedOldName ? 'Agent used old name after correction' : 'Agent used latest name correctly' };
    }
  },
  {
    id: 'CONTEXT_RETENTION',
    description: 'Maintains context through topic switches',
    check: (transcript) => {
      // Look for agent asking for info it already has
      const lines = transcript.split('\n');
      let collectedInfo = new Set();
      let askedAgain = false;

      for (const line of lines) {
        // Track info provided
        if (line.startsWith('user:')) {
          const nameMatch = line.match(/I'm\s+(\w+)/i);
          if (nameMatch) collectedInfo.add(nameMatch[1].toLowerCase());
          const companyMatch = line.match(/from\s+(\w+)/i);
          if (companyMatch) collectedInfo.add(companyMatch[1].toLowerCase());
        }

        // Check if agent asks for collected info again
        if (line.startsWith('agent:')) {
          if (line.match(/what.*name/i) && collectedInfo.size > 0) {
            askedAgain = true;
          }
        }
      }

      return { passed: !askedAgain, evidence: askedAgain ? 'Agent asked for info already provided' : 'Agent retained context' };
    }
  },
  {
    id: 'PROFESSIONAL_TONE',
    description: 'Stays calm with hostile callers',
    check: (transcript) => {
      // Look for agent matching hostile tone
      const hostilePatterns = /sorry|apologize|I understand you're frustrated|calm down/i;
      const agentLines = transcript.split('\n').filter(l => l.startsWith('agent:'));

      // Good pattern - stays professional without matching hostility
      const unprofessional = agentLines.some(l => l.match(/I'm sorry you feel|if you would just|please calm/i));

      return { passed: !unprofessional, evidence: unprofessional ? 'Agent matched hostile tone' : 'Agent stayed professional' };
    }
  },
  {
    id: 'TOOL_TIMING',
    description: 'Confirms only after tool success',
    check: (transcript) => {
      // Look for "sent" or "texted" before tool call evidence
      const prematureConfirm = /I'll send|I'm sending|let me send.*you|texting you now/i;
      const agentLines = transcript.split('\n').filter(l => l.startsWith('agent:'));

      const premature = agentLines.some(l => l.match(prematureConfirm));

      return { passed: !premature, evidence: premature ? 'Agent confirmed before tool completion' : 'Agent waited for tool' };
    }
  }
];

async function main() {
  console.log(`${C.cyan}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     VERIFY TEST OUTCOMES                                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  if (!API_KEY) {
    console.error(`${C.red}ERROR: ELEVENLABS_API_KEY not set${C.reset}`);
    process.exit(1);
  }

  // Load baseline
  const baselinePath = path.join(__dirname, '..', 'data', 'real-outcomes.json');
  let baseline = null;
  if (fs.existsSync(baselinePath)) {
    baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    console.log(`\n${C.cyan}Baseline from: ${baseline.timestamp}${C.reset}`);
  }

  // Get recent conversations
  console.log(`\n${C.cyan}[1] Getting recent conversations...${C.reset}`);
  const convData = await getRecentConversations(SARAH_AGENT_ID);
  const conversations = convData.conversations || [];

  if (conversations.length === 0) {
    console.log(`${C.yellow}No conversations found. Call +1 (888) 266-2193 to test.${C.reset}`);
    process.exit(0);
  }

  // Find conversations after baseline (if available)
  const fixTimestamp = baseline?.timestamp ? new Date(baseline.timestamp).getTime() / 1000 : 0;
  const newConversations = conversations.filter(c => c.start_time_unix_secs > fixTimestamp);

  console.log(`  Total conversations: ${conversations.length}`);
  console.log(`  New since fixes: ${newConversations.length}`);

  if (newConversations.length === 0) {
    console.log(`\n${C.yellow}No conversations since fixes were applied.${C.reset}`);
    console.log(`Call ${C.bright}+1 (888) 266-2193${C.reset} to generate a test conversation.`);
    console.log(`Then run this script again.`);
    process.exit(0);
  }

  // Analyze the most recent conversation
  const latest = newConversations[0];
  console.log(`\n${C.cyan}[2] Analyzing latest conversation: ${latest.conversation_id}${C.reset}`);

  const convDetail = await getConversation(latest.conversation_id);
  const transcript = convDetail.transcript?.map(t => `${t.role}: ${t.message}`).join('\n') || '';

  console.log(`  Duration: ${latest.call_duration_secs || 'N/A'} seconds`);
  console.log(`  Status: ${latest.status}`);

  // Run verification patterns
  console.log(`\n${C.cyan}[3] Verifying challenge fix behaviors...${C.reset}`);

  const results = {
    conversation_id: latest.conversation_id,
    timestamp: new Date().toISOString(),
    checks: []
  };

  for (const pattern of VERIFICATION_PATTERNS) {
    const result = pattern.check(transcript);
    results.checks.push({
      id: pattern.id,
      description: pattern.description,
      passed: result.passed,
      evidence: result.evidence
    });

    const icon = result.passed ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
    console.log(`  ${icon} ${pattern.id}: ${result.evidence}`);
  }

  // Summary
  const passed = results.checks.filter(c => c.passed).length;
  const total = results.checks.length;

  console.log(`\n${C.bright}=== VERIFICATION SUMMARY ===${C.reset}`);
  console.log(`  Checks passed: ${passed}/${total}`);

  if (passed === total) {
    console.log(`  ${C.green}${C.bright}ALL CHECKS PASSED - Challenge fixes working!${C.reset}`);
  } else {
    console.log(`  ${C.yellow}Some checks failed - review transcript for issues${C.reset}`);
  }

  // Show transcript excerpt
  console.log(`\n${C.cyan}Transcript excerpt:${C.reset}`);
  const lines = transcript.split('\n').slice(0, 10);
  for (const line of lines) {
    console.log(`  ${line.substring(0, 100)}${line.length > 100 ? '...' : ''}`);
  }

  // Save results
  const resultsPath = path.join(__dirname, '..', 'data', 'verification-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n${C.dim}Results saved to: ${resultsPath}${C.reset}`);
}

main().catch(err => {
  console.error(`${C.red}ERROR: ${err.message}${C.reset}`);
  process.exit(1);
});
