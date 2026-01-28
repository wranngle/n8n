# Change: Fix Sarah Voice Agent - Address 81% Test Pass Rate Issues

## Why

After running 3,566 tests across 18 test suites against the Sarah voice agent (agent_xxxx_demo), we achieved only **81% pass rate** (2,890 passes, 676 failures). The target is 98%+. Analysis reveals systematic behavioral failures that require prompt restructuring.

### Test Infrastructure Status
- **Total tests uploaded:** 2,920 to ElevenLabs native testing
- **Tests executed:** 3,566 runs across 4 rounds
- **Pass rate:** 81% (target: 98%)
- **SMS tool tests:** 6/6 passing (100%) ✅

### Root Cause Analysis

| Failure Category | Count | % of Failures | Root Cause |
|-----------------|-------|---------------|------------|
| Personality+Objection | 320 | 47% | Agent ignores caller style, jumps to objection handling |
| Objection+Demo | 221 | 33% | Agent offers demo before properly addressing objection |
| Lead Qualification | 30 | 4% | Agent asks volume question instead of company name |
| Full Discovery | 21 | 3% | Agent skips discovery, goes straight to pitch |
| Pain Agitation | 17 | 3% | Uses generic language instead of industry-specific pain |
| Value Proposition | 15 | 2% | Exceeds word limit (25 words general, 15 for brief callers) |
| Other | 52 | 8% | Emergency redirect, forbidden language, edge cases |

### Critical Finding: Technical Questions Ignored

**Only 1% of failed Personality+Objection tests show the agent answering technical questions**, despite explicit prompt instructions saying "YOU MUST ANSWER THEIR TECHNICAL QUESTION FIRST - THIS IS NON-NEGOTIABLE".

**Agent Response Patterns in 320 Personality+Objection Failures:**
- Asks volume question: 38% (ignoring caller's actual question)
- Response too long: 22% (not matching brief callers)
- Asks industry: 9% (redundant when already stated)
- Gives price: 7%
- Offers demo: 7%
- **Actually answers tech question: 1%** ❌

## What Changes

### 1. Prompt Architecture Restructuring
- Move ABSOLUTE PRIORITY rules to the very top of the prompt
- Reduce prompt from 13,467 chars to ~8,000 chars (40% reduction)
- Remove redundant/conflicting instructions
- Add explicit "WRONG" examples to avoid

### 2. Priority Hierarchy Enforcement
**New priority order (enforced at top of prompt):**
1. Emergency → 911 redirect (highest)
2. Technical question → Answer FIRST, then continue
3. Caller style → Match throughout
4. Objection → Handle in caller's style
5. Discovery → Only after above handled

### 3. Specific Fixes

| Issue | Current Behavior | Fixed Behavior |
|-------|-----------------|----------------|
| Tech questions ignored | Agent skips to objection handling | Agent MUST answer tech question FIRST |
| Brief callers get verbose responses | 200+ char responses | Hard limit: 100 chars for brief/rushed |
| Company name not collected | Agent asks volume first | Agent asks company name immediately after contact name |
| "Looking at competitors" response | "Is it timing or volume?" (irrelevant) | "What matters most: cost, accuracy, or speed?" |
| Value prop too long | 26+ words | Hard limit: 25 words max |

### 4. SMS Tool
**Status: Working correctly (6/6 tests passing)**
- No changes needed to SMS tool behavior
- Tool is properly invoked after explicit consent
- Payload structure is correct

## Impact

- Affected specs: `voice-agent-sarah`
- Affected code: `agents/sarah/system-prompt.md`, `agents/sarah/config.json`
- Expected result: Pass rate increase from 81% to 95%+ (conservative estimate)
- Cost savings: Reduced ElevenLabs API testing credits after fix

## Files to Modify

| File | Change |
|------|--------|
| `workflows/voice_ai_agents/agents/sarah/system-prompt.md` | Complete rewrite with new architecture |
| `workflows/voice_ai_agents/agents/sarah/config.json` | Embed updated prompt |

## Verification Plan

1. Manual review of prompt by human before deployment
2. Deploy to ElevenLabs agent via portal (manual paste)
3. Run limited test batch (200 tests) to verify improvement
4. If 90%+, run full suite (1,200 tests)
5. Iterate if needed
