#!/usr/bin/env node
/**
 * RETROACTIVE FIX APPLICATOR
 *
 * Applies ALL accumulated learnings and fixes to the ElevenLabs agent.
 * This is the CRITICAL self-improvement mechanism.
 *
 * Analyzes:
 * - All simulation failures from cycle-stats
 * - Pattern occurrences from frictions
 * - Known failure modes from testing
 *
 * Then applies a comprehensive behavioral reinforcement patch.
 */

const fs = require('fs');
const path = require('path');

// Load environment
const envPath = path.join(__dirname, '..', 'env', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const layer1 = require('../layer1-agent-modifier');

const AGENT_ID = 'agent_8001kdgp7qbyf4wvhs540be78vew';

const C = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bright: '\x1b[1m',
  magenta: '\x1b[35m'
};

/**
 * CRITICAL BEHAVIORAL FIXES
 * Each fix addresses a specific failure pattern observed in testing.
 */
const RETROACTIVE_FIXES = [
  {
    id: 'SMS_PERMISSION_DISCIPLINE',
    priority: 'CRITICAL',
    description: 'Never send SMS without explicit verbal consent',
    pattern: 'UNAUTHORIZED_SMS',
    reinforcement: `
## CRITICAL: SMS Permission Protocol
- NEVER call send_sms unless caller explicitly says YES to texting
- Explicit consent phrases: "yes text me", "sure send it", "go ahead and text"
- If unclear, ASK AGAIN: "Just to confirm, I can text you the link?"
- Log consent phrase in your memory before calling tool`
  },
  {
    id: 'NO_PREMATURE_CONFIRMATION',
    priority: 'CRITICAL',
    description: 'Never confirm SMS sent before tool executes',
    pattern: 'PREMATURE_CONFIRM',
    reinforcement: `
## CRITICAL: Tool Response Handling
- NEVER say "I've sent the SMS" until AFTER the tool returns success
- Wait for tool response before confirming
- If tool fails, say "Let me try that again" not "It's sent"
- Tool responses are async - don't assume success`
  },
  {
    id: 'CONTEXT_RETENTION_LONG_CALLS',
    priority: 'HIGH',
    description: 'Maintain context in extended conversations',
    pattern: 'CONTEXT_LOST',
    reinforcement: `
## CRITICAL: Context Retention for Long Calls
- Remember caller's name and company throughout
- Reference previous discussion points: "As you mentioned about..."
- Don't ask for information already provided
- Summarize occasionally: "So [Name], you're looking at..."
- Drive toward booking after 8-10 turns: "Let me get you scheduled"`
  },
  {
    id: 'COMPLETE_DATA_COLLECTION',
    priority: 'HIGH',
    description: 'Always collect minimum required fields',
    pattern: 'INCOMPLETE_DATA',
    reinforcement: `
## CRITICAL: Required Data Collection Checklist
Before calling send_sms, you MUST have:
1. Caller's name (first name minimum)
2. Phone number (10 digits, verified by repeating back)
3. Explicit SMS consent
If missing any, ASK for it. Don't guess or skip.`
  },
  {
    id: 'PHONE_NUMBER_VALIDATION',
    priority: 'HIGH',
    description: 'Verify phone numbers before SMS',
    pattern: 'INVALID_PHONE',
    reinforcement: `
## CRITICAL: Phone Number Verification
- Repeat the number back: "That's 555-123-4567, correct?"
- If unclear or short, ask for clarification
- Must be 10 digits for US numbers
- Don't accept partial numbers like "555-1234"`
  },
  {
    id: 'GRACEFUL_DECLINE_HANDLING',
    priority: 'MEDIUM',
    description: 'Respect when caller declines SMS',
    pattern: 'IGNORED_DECLINE',
    reinforcement: `
## SMS Decline Handling
- If caller declines SMS, IMMEDIATELY stop SMS flow
- Offer alternative: "No problem, you can visit cal.com/wranngle/demo"
- Don't push or ask again after clear decline
- Decline phrases: "no thanks", "prefer email", "just tell me"`
  },
  {
    id: 'EFFICIENT_QUICK_CALLERS',
    priority: 'MEDIUM',
    description: 'Handle hurried callers efficiently',
    pattern: 'INEFFICIENT_HANDLING',
    reinforcement: `
## Quick Caller Protocol
- If caller gives info upfront, don't ask for it again
- Match caller's pace - hurried caller = brief responses
- Skip discovery questions if caller just wants booking link
- "Quick and efficient" - collect name, phone, consent, send`
  },
  {
    id: 'OBJECTION_HANDLING',
    priority: 'MEDIUM',
    description: 'Handle skepticism professionally',
    pattern: 'POOR_OBJECTION_RESPONSE',
    reinforcement: `
## Objection Handling
- Acknowledge concerns: "That's a fair question"
- Provide brief, honest answers
- Offer to address concerns on demo call
- Don't be defensive or dismissive`
  }
];

/**
 * Generate the comprehensive fix patch
 */
function generateComprehensivePatch() {
  const timestamp = new Date().toISOString();

  let patch = `

================================================================================
[SUPERSYSTEM BEHAVIORAL REINFORCEMENT - ${timestamp}]
These rules are CRITICAL and OVERRIDE any conflicting instructions.
================================================================================
`;

  // Add all fixes sorted by priority
  const sortedFixes = [...RETROACTIVE_FIXES].sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  for (const fix of sortedFixes) {
    patch += `\n${fix.reinforcement}\n`;
  }

  patch += `
================================================================================
[END SUPERSYSTEM REINFORCEMENT]
================================================================================
`;

  return patch;
}

/**
 * Analyze existing cycle stats for failure patterns
 */
function analyzeFailurePatterns() {
  const patterns = {
    total_cycles: 0,
    total_failures: 0,
    failure_categories: {},
    persistent_patterns: []
  };

  try {
    const cycleStatsPath = path.join(__dirname, '..', 'tests', 'cycle-stats.json');
    if (fs.existsSync(cycleStatsPath)) {
      const stats = JSON.parse(fs.readFileSync(cycleStatsPath, 'utf8'));
      patterns.total_cycles = stats.cycles.length;

      for (const cycle of stats.cycles) {
        const failures = cycle.simulations - cycle.outcomes.validated;
        patterns.total_failures += failures;

        if (cycle.outcomes.gaps > 0) {
          patterns.failure_categories.GAP_DETECTED =
            (patterns.failure_categories.GAP_DETECTED || 0) + cycle.outcomes.gaps;
        }
      }
    }
  } catch (e) {
    console.log(`  ${C.yellow}Warning: Could not analyze cycle stats: ${e.message}${C.reset}`);
  }

  return patterns;
}

async function main() {
  console.log(`${C.magenta}${C.bright}`);
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     RETROACTIVE FIX APPLICATOR                                ║');
  console.log('║     Applying ALL accumulated learnings to agent               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`${C.reset}`);

  try {
    // Step 1: Analyze failure patterns
    console.log(`\n${C.cyan}[STEP 1] Analyzing failure patterns...${C.reset}`);
    const patterns = analyzeFailurePatterns();
    console.log(`  Total cycles analyzed: ${patterns.total_cycles}`);
    console.log(`  Total failures found: ${patterns.total_failures}`);
    console.log(`  Categories: ${JSON.stringify(patterns.failure_categories)}`);

    // Step 2: Get current agent state
    console.log(`\n${C.cyan}[STEP 2] Getting current agent state...${C.reset}`);
    const beforeAgent = await layer1.getAgent(AGENT_ID);
    const beforePrompt = beforeAgent.conversation_config?.agent?.prompt?.prompt || '';
    console.log(`  Agent: ${beforeAgent.name}`);
    console.log(`  Current prompt length: ${beforePrompt.length} chars`);

    // Check for existing supersystem reinforcements
    const existingReinforcements = (beforePrompt.match(/\[SUPERSYSTEM/g) || []).length;
    console.log(`  Existing SUPERSYSTEM tags: ${existingReinforcements}`);

    // Step 3: Generate comprehensive patch
    console.log(`\n${C.cyan}[STEP 3] Generating comprehensive fix patch...${C.reset}`);
    const patch = generateComprehensivePatch();
    console.log(`  Fixes to apply: ${RETROACTIVE_FIXES.length}`);
    console.log(`  Patch size: ${patch.length} chars`);

    for (const fix of RETROACTIVE_FIXES) {
      console.log(`    [${fix.priority}] ${fix.id}: ${fix.description}`);
    }

    // Step 4: Apply the patch
    console.log(`\n${C.cyan}[STEP 4] Applying comprehensive patch to agent...${C.reset}`);

    // Remove old supersystem patches if they exist (to avoid accumulation)
    let cleanedPrompt = beforePrompt;
    const supersystemRegex = /\n*={10,}\n\[SUPERSYSTEM[\s\S]*?\[END SUPERSYSTEM REINFORCEMENT\]\n={10,}\n*/g;
    cleanedPrompt = cleanedPrompt.replace(supersystemRegex, '');

    const newPrompt = cleanedPrompt + patch;
    console.log(`  Cleaned old patches: ${beforePrompt.length - cleanedPrompt.length} chars removed`);
    console.log(`  New prompt length: ${newPrompt.length} chars`);
    console.log(`  Net change: ${newPrompt.length - beforePrompt.length} chars`);

    const result = await layer1.updateAgent(AGENT_ID, {
      conversation_config: {
        agent: {
          prompt: {
            prompt: newPrompt
          }
        }
      }
    });

    console.log(`  ${C.green}✓ Patch applied successfully${C.reset}`);

    // Step 5: Verify the modification
    console.log(`\n${C.cyan}[STEP 5] Verifying modification...${C.reset}`);
    const afterAgent = await layer1.getAgent(AGENT_ID);
    const afterPrompt = afterAgent.conversation_config?.agent?.prompt?.prompt || '';

    const verified = afterPrompt.includes('[SUPERSYSTEM BEHAVIORAL REINFORCEMENT');
    const hasAllFixes = RETROACTIVE_FIXES.every(fix =>
      afterPrompt.includes(fix.id.replace(/_/g, ' ').toLowerCase()) ||
      afterPrompt.includes(fix.reinforcement.split('\n')[1]?.trim() || '')
    );

    console.log(`  New prompt length: ${afterPrompt.length} chars`);
    console.log(`  Contains SUPERSYSTEM tag: ${verified ? C.green + 'YES' : C.red + 'NO'}${C.reset}`);
    console.log(`  All ${RETROACTIVE_FIXES.length} fixes present: ${hasAllFixes ? C.green + 'YES' : C.yellow + 'PARTIAL'}${C.reset}`);

    // Step 6: Log the modification
    console.log(`\n${C.cyan}[STEP 6] Logging modification...${C.reset}`);
    const logPath = path.join(__dirname, '..', 'data', 'agent-modifications.json');
    let log = { modifications: [] };
    if (fs.existsSync(logPath)) {
      log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }

    log.modifications.push({
      timestamp: new Date().toISOString(),
      agent_id: AGENT_ID,
      type: 'RETROACTIVE_FIX_BATCH',
      fixes_applied: RETROACTIVE_FIXES.map(f => f.id),
      before_prompt_length: beforePrompt.length,
      after_prompt_length: afterPrompt.length,
      prompt_diff: afterPrompt.length - beforePrompt.length,
      success: true,
      patterns_addressed: patterns
    });
    log.last_updated = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));
    console.log(`  Logged to: ${logPath}`);

    // Final summary
    console.log(`\n${C.green}${C.bright}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('            RETROACTIVE FIXES APPLIED SUCCESSFULLY              ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`${C.reset}`);
    console.log(`${C.green}Applied ${RETROACTIVE_FIXES.length} behavioral reinforcements:${C.reset}`);
    for (const fix of RETROACTIVE_FIXES) {
      const icon = fix.priority === 'CRITICAL' ? '🔴' : fix.priority === 'HIGH' ? '🟠' : '🟡';
      console.log(`  ${icon} ${fix.id}`);
    }
    console.log(`\n${C.cyan}Agent prompt increased by ${afterPrompt.length - beforePrompt.length} chars${C.reset}`);

    // Return success for programmatic use
    return {
      success: true,
      fixes_applied: RETROACTIVE_FIXES.length,
      prompt_delta: afterPrompt.length - beforePrompt.length
    };

  } catch (error) {
    console.error(`\n${C.red}ERROR: ${error.message}${C.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for use by supersystem
module.exports = {
  RETROACTIVE_FIXES,
  generateComprehensivePatch,
  analyzeFailurePatterns,
  apply: main
};

if (require.main === module) {
  main();
}
