# Change: Refactor Voice AI Agents v3

## Why

This change consolidates and supersedes the existing `update-sarah-agent-v2` proposal (33 tasks, 0 completed) while adding comprehensive file reorganization for the `workflows/voice_ai_agents/` directory.

**Problems Addressed:**
1. **Stale Proposal:** Sarah v2.0 is already in production, but the spec proposal was never formally completed
2. **Disorganized Files:** Multiple redundant prompt files, scattered test results, inconsistent structure
3. **Missing Specs:** No formal OpenSpec specifications exist for voice agent infrastructure and organization
4. **Incomplete Agent:** SEWY Garage agent exists but is incomplete (no phone number assigned)

## What Changes

### Directory Reorganization
- **ADDED** `agents/` - Per-agent organization with config, prompt, spec, tests
- **ADDED** `pipelines/` - Centralized n8n workflow JSON files
- **ADDED** `docs/` - API documentation and integration guides
- **ADDED** `old/` - Archived/superseded files
- **MODIFIED** Agent files moved to proper subdirectories

### OpenSpec Specifications (4 Capabilities)
- **ABSORBED** `voice-agent-sarah` - 15 requirements from v2 (production state)
- **ABSORBED** `voice-agent-testing` - 12 requirements from v2 (test framework)
- **ADDED** `voice-agent-infrastructure` - Pipelines, integrations, evaluation
- **ADDED** `voice-agent-organization` - Directory structure, registry, archival

### File Operations
- **MOVED** `sarah-agent-config.json` → `agents/sarah/config.json`
- **MOVED** `sarah-agent-tech-spec.md` → `agents/sarah/tech-spec.md`
- **MOVED** `SARAH-COMPLETE-SETUP.md` → `agents/sarah/SETUP.md`
- **MOVED** `test-scenarios-sarah-v2.yaml` → `agents/sarah/tests/scenarios.yaml`
- **MOVED** `sewy-garage/` → `agents/sewy-garage/`
- **MOVED** `elevenlabs-twilio-voiceagent/` → `docs/elevenlabs-twilio-voiceagent/`
- **MOVED** Workflow JSONs → `pipelines/`
- **ARCHIVED** `sarah-merged-prompt.md`, `sarah-final-prompt-100pct.md`, `sarah-enhanced-prompt-v1.1.md`, `sarah-sms-tool.json`

## Impact

- **Affected specs:** `voice-agent-sarah`, `voice-agent-testing`, `voice-agent-infrastructure`, `voice-agent-organization` (all new)
- **Affected files:** 20+ files in `workflows/voice_ai_agents/`
- **Supersedes:** `update-sarah-agent-v2` proposal (will be archived after this completes)
- **Dependencies:** None (reorganization only, no behavior changes)

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| File moves break references | Medium | Update agent-registry.yaml, verify paths |
| Spec absorption loses detail | Low | Copy entire content, validate with --strict |
| Supersystem tests fail after reorg | Low | Tests use relative paths within supersystem/ |
| Legacy archival loses history | Low | Git preserves rename history |

## Success Criteria

1. All 4 OpenSpec capabilities validate with `--strict`
2. Directory structure matches proposed layout
3. No orphaned files in root voice_ai_agents directory
4. Supersystem tests continue to pass
5. Agent registry paths updated and verified
6. Original v2 proposal archived cleanly
