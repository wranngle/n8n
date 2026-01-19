# Tasks: Fix Sarah Voice Agent v3

## 1. Prompt Analysis & Design
- [x] 1.1 Run comprehensive test suite (3,566 tests executed)
- [x] 1.2 Collect all failure data and categorize
- [x] 1.3 Analyze agent response patterns in failures
- [x] 1.4 Identify root causes (technical questions ignored, style mismatch)
- [x] 1.5 Document findings in proposal.md

## 2. Prompt Restructuring
- [ ] 2.1 Create new prompt architecture with ABSOLUTE PRIORITY section at top
- [ ] 2.2 Add explicit "WRONG" examples to avoid
- [ ] 2.3 Reduce prompt length from 13,467 to ~8,000 chars
- [ ] 2.4 Consolidate redundant instructions
- [ ] 2.5 Add hard character limits for brief/rushed caller responses

## 3. Specific Behavioral Fixes
- [ ] 3.1 Fix technical question handling (MUST answer first, examples provided)
- [ ] 3.2 Fix "looking at competitors" objection response
- [ ] 3.3 Fix lead qualification sequence (company name after contact name)
- [ ] 3.4 Fix value proposition word limit (25 words max)
- [ ] 3.5 Fix brief caller response length (100 chars max)

## 4. Prompt Generation
- [ ] 4.1 Write refined `system-prompt-v3.md` with all fixes
- [ ] 4.2 Validate prompt structure and length
- [ ] 4.3 Generate deployment-ready version for manual paste

## 5. Deployment (Manual - User Action Required)
- [ ] 5.1 User reviews generated prompt
- [ ] 5.2 User pastes prompt into ElevenLabs agent portal
- [ ] 5.3 User triggers limited test run (200 tests) to verify
- [ ] 5.4 User reports results back for iteration if needed

## 6. SMS Tool Review
- [x] 6.1 Analyze SMS tool test results (6/6 passing ✅)
- [x] 6.2 Document SMS tool behavior (working correctly)
- [ ] 6.3 No changes required - maintain current implementation

## Dependencies
- Tasks 2.x and 3.x can run in parallel
- Task 4.x requires 2.x and 3.x complete
- Task 5.x requires user action (blocked until user available)

## Blockers
- ElevenLabs API credit consumption - switching to manual deployment
- User availability for manual prompt paste into portal
