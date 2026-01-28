# Design: Voice AI Agents Architecture

## Context

The voice_ai_agents directory contains ElevenLabs voice agent configurations, n8n workflow pipelines, testing infrastructure, and supporting documentation. This system enables:

- **Sarah** - B2B Sales SDR for The 24/7 Filter product (production)
- **SEWY Garage** - Southeastern Wyoming Garage Doors agent (development)
- **Supersystem** - 6-layer autonomous evaluation and improvement framework
- **Transcript Extraction** - Post-call processing for lead qualification

## Goals / Non-Goals

**Goals:**
- Establish clear, consistent directory structure
- Separate agent configs from workflow pipelines
- Consolidate testing infrastructure
- Archive superseded files cleanly
- Create formal OpenSpec specifications

**Non-Goals:**
- Modify agent behavior or prompts
- Change supersystem architecture
- Update n8n workflow logic
- Create new voice agents

## Architecture

### Directory Structure

```
workflows/voice_ai_agents/
├── README.md                    # Directory index & quick reference
├── agent-registry.yaml          # Master index of all agents
├── manifest.yaml                # Business process manifest
│
├── agents/                      # Per-agent organization
│   ├── sarah/
│   │   ├── config.json          # ElevenLabs agent config
│   │   ├── system-prompt.md     # Extracted system prompt
│   │   ├── tech-spec.md         # Technical specification
│   │   ├── SETUP.md             # Setup documentation
│   │   └── tests/
│   │       └── scenarios.yaml   # Agent-specific test scenarios
│   │
│   └── sewy-garage/
│       ├── agent-prompt.md
│       ├── tests/
│       └── README.md
│
├── pipelines/                   # n8n workflow definitions
│   ├── elevenlabs-call-completed.json
│   ├── elevenlabs-twilio-bulletproof.json
│   ├── elevenlabs-twilio-client-data.json
│   └── pipedrive-lead-caller.json
│
├── supersystem/                 # Autonomous evaluation framework
│   ├── (6-layer architecture preserved)
│   └── tests/
│
├── templates/                   # Reusable components
│   ├── sms-booking-tool-template.json
│   └── test-scenarios-template.yaml
│
├── transcript-extraction/       # Post-call processing
│   └── (existing structure preserved)
│
├── docs/                        # Documentation
│   └── elevenlabs-twilio-voiceagent/
│
└── old/                         # Archived files
    ├── sarah-merged-prompt.md
    ├── sarah-final-prompt-100pct.md
    ├── sarah-enhanced-prompt-v1.1.md
    └── sarah-sms-tool.json
```

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   ElevenLabs    │────▶│   n8n Pipeline  │────▶│    Pipedrive    │
│   Voice Agent   │     │   (post-call)   │     │      CRM        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│    Twilio       │     │   Supersystem   │
│   (SMS/Voice)   │     │   (evaluation)  │
└─────────────────┘     └─────────────────┘
```

### Agent Configuration Pattern

Each agent follows a consistent structure:

```
agents/<agent-name>/
├── config.json        # ElevenLabs API config (agent_id, voice, tools, etc.)
├── system-prompt.md   # Human-readable prompt (source of truth)
├── tech-spec.md       # Detailed specification document
├── SETUP.md           # Deployment checklist
└── tests/
    └── scenarios.yaml # Agent-specific test scenarios
```

## Decisions

### D1: Separate Agents from Pipelines
**Decision:** Create distinct `agents/` and `pipelines/` directories.
**Rationale:** Agent configs are ElevenLabs-specific; pipelines are n8n-specific. Separation improves discoverability and prevents confusion.
**Alternatives:** Keep flat structure (rejected - poor organization), nest pipelines under agents (rejected - pipelines often serve multiple agents).

### D2: Archive Instead of Delete
**Decision:** Move superseded files to `old/` rather than deleting.
**Rationale:** Preserves history for reference, enables rollback if needed, follows governance.yaml deletion blocking rule.
**Alternatives:** Git-only history (rejected - harder to discover), in-place rename with suffix (rejected - clutters directory).

### D3: Extract System Prompt from Config
**Decision:** Maintain system prompt in separate `.md` file, embed in config at deploy time.
**Rationale:** Markdown files are easier to edit, review, and version control than JSON-embedded strings.
**Alternatives:** Keep embedded (rejected - poor editing experience), use JSON reference (rejected - ElevenLabs API requires inline).

### D4: Preserve Supersystem Structure
**Decision:** Keep supersystem/ directory structure unchanged.
**Rationale:** 6-layer architecture is tested and working. Tests use relative paths. No benefit to reorganization.
**Alternatives:** Flatten into root (rejected - breaks tests), integrate into agents/ (rejected - supersystem is cross-agent).

## Risks / Trade-offs

| Trade-off | Decision | Mitigation |
|-----------|----------|------------|
| More directories = deeper nesting | Accept for clarity | Clear README, consistent naming |
| File moves may break references | Accept, update registry | Verify all paths post-move |
| Prompt duplication (config + md) | Accept for editability | Single source of truth in .md |

## Migration Plan

1. **Phase 1:** Create new directories (agents/, pipelines/, docs/, old/)
2. **Phase 2:** Move files to new locations (git mv for history)
3. **Phase 3:** Update agent-registry.yaml with new paths
4. **Phase 4:** Validate supersystem tests still pass
5. **Phase 5:** Archive old v2 proposal

**Rollback:** Git revert if issues discovered; old/ files available for reference.

## Open Questions

None - all decisions finalized.
