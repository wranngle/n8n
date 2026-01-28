# Source Tree Analysis

## Project Root: n8n/

```
n8n/
├── .claude/                          # Claude Code Configuration
│   ├── directives/                   # Integration frameworks
│   │   ├── integrations/             # Third-party service configs
│   │   │   ├── FRAMEWORK.md          # Integration bootstrap framework
│   │   │   └── elevenlabs/           # ElevenLabs integration
│   │   │       ├── manifest.yaml     # 24 MCP tools documented
│   │   │       ├── mcp-tools.md      # Tool reference with examples
│   │   │       ├── knowledge-index.json
│   │   │       └── patterns/         # Workflow patterns
│   │   ├── credential-management.md  # API key handling directive
│   │   └── entity-naming-convention.md
│   ├── hooks/                        # Enforcement hooks (15+)
│   │   ├── detect-workflow-intent.js # → Forces skill invocation
│   │   ├── detect-voice-agent-intent.js
│   │   ├── workflow-governance.js    # → Enforces phase rules
│   │   ├── elevenlabs-agent-governance.js
│   │   ├── pre-deploy-check.js       # → Pre-deployment validation
│   │   ├── suggest-code-node.js      # → Code node recommendations
│   │   ├── credential-automation.js
│   │   ├── workflow-activation.js
│   │   ├── if-node-warning.js        # → Blocks IF node (known bug)
│   │   ├── llm-node-enforcement.js
│   │   ├── naming-convention.js
│   │   ├── api-fallback-enforcer.js
│   │   ├── session-init.js
│   │   ├── run-evaluations.js
│   │   └── analyze-before-build.js
│   └── settings.json                 # Hook configuration
│
├── context/                          # Knowledge Bases
│   ├── elevenlabs-agents/
│   │   └── governance.yaml           # Agent phase tracking
│   ├── technical-research/           # Research documents (12+)
│   │   ├── *.json                    # Technology research
│   │   └── proactive-*.md            # Automation research
│   └── workflow-patterns/
│       ├── voice-agent-elevenlabs-patterns.md
│       └── voice-agent-pattern-index.json
│
├── workflows/                        # n8n Workflow Files
│   ├── governance.yaml               # ⭐ Phase assignments (source of truth)
│   ├── registry.yaml                 # Workflow metadata
│   ├── deployment-log.jsonl          # Deployment audit trail
│   ├── voice_ai_agents/              # Voice agent workflows
│   │   ├── manifest.yaml             # Voice agent registry
│   │   ├── agent-registry.yaml
│   │   ├── elevenlabs-twilio-*.json  # Twilio integration workflows
│   │   ├── supersystem/              # Auto-refinement system
│   │   │   ├── SUPERSYSTEM-ARCHITECTURE.md
│   │   │   ├── supersystem-engine.js
│   │   │   ├── layer1-agent-modifier.js
│   │   │   ├── layer2-workflow-corrector.js
│   │   │   ├── layer3-data-manager.js
│   │   │   ├── layer4-gemini-brain.js
│   │   │   ├── layer5-repo-updater.js
│   │   │   ├── layer6-research-engine.js
│   │   │   ├── autorefinement-engine.js
│   │   │   └── tests/                # Evaluation framework
│   │   ├── sewy-garage/              # SEWY Garage Doors agent
│   │   ├── elevenlabs-twilio-voiceagent/
│   │   │   └── docs/                 # API references
│   │   └── transcript-extraction/
│   └── knowledge_management/
│       └── youtube-rag-pipeline/
│
├── scripts/                          # Automation Utilities
│   ├── *.ps1                         # PowerShell scripts (50+)
│   ├── *.js                          # JavaScript utilities
│   ├── *.py                          # Python scripts
│   └── scrapling/                    # Browser automation
│       ├── cli_*.py                  # CLI tools for n8n data tables
│       └── youtube_transcript_scraper.py
│
├── templates/                        # Reusable Templates
│   ├── elevenlabs-agents/
│   │   ├── best-agent-config-2026.yaml
│   │   └── elevenlabs_prompt_template.md
│   └── voice-agents/
│       └── home_services_garage/
│
├── docs/                             # BMM Documentation (this folder)
│   ├── index.md                      # Master entry point
│   ├── project-overview.md           # This file
│   ├── architecture.md               # System architecture
│   ├── source-tree-analysis.md       # Directory structure
│   └── development-guide.md          # Dev setup
│
├── _bmad-output/                     # BMAD Methodology Outputs
│   ├── config.yaml                   # Project BMM config
│   ├── planning-artifacts/
│   │   └── bmm-workflow-status.yaml  # Workflow tracking
│   └── implementation-artifacts/
│
├── old/                              # Archived/deprecated files
│   └── temp-debug/                   # Temporary debug outputs
│
├── .github/                          # GitHub Configuration
│   └── workflows/                    # CI/CD workflows
│       ├── claude-code-review.yml
│       ├── claude.yml
│       ├── voice-agent-tests.yml
│       └── voice-agent-local-tests.yml
│
├── CLAUDE.md                         # ⭐ PRIMARY METHODOLOGY (500+ lines)
├── INVENTORY.md                      # Project inventory
├── .gitignore
└── .env                              # Environment variables (not committed)
```

## Critical Directories

### `.claude/hooks/` - Enforcement Layer
The hook system is foundational. Without hooks, Claude may ignore CLAUDE.md instructions.

| Hook | Trigger | Action |
|------|---------|--------|
| `detect-workflow-intent.js` | User prompt | Forces skill invocation |
| `workflow-governance.js` | n8n_* tools | Enforces phase rules |
| `pre-deploy-check.js` | n8n_create_workflow | Validates before deploy |
| `if-node-warning.js` | IF node detection | Blocks (known bug) |

### `workflows/` - Workflow Repository
Contains n8n workflow JSON files with governance.

| File | Purpose |
|------|---------|
| `governance.yaml` | Phase assignments (DEV/ALPHA/BETA/GA/PROD) |
| `registry.yaml` | Workflow metadata and relationships |
| `deployment-log.jsonl` | Audit trail of deployments |

### `context/` - Knowledge Management
Pre-indexed knowledge for AI-assisted research.

| Knowledge Base | Content |
|----------------|---------|
| `youtube-knowledge/` | 10,279 indexed tutorials |
| `discord-knowledge/` | 2,930 Q&A entries |
| `workflow-patterns/` | Reusable pattern files |
| `technical-research/` | Technology research JSONs |

## Entry Points

| Entry Point | Location | Purpose |
|-------------|----------|---------|
| Methodology | `CLAUDE.md` | Primary instruction set for Claude |
| Workflow Status | `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` | BMM tracking |
| Governance | `workflows/governance.yaml` | Phase management |
| Agent Registry | `workflows/voice_ai_agents/manifest.yaml` | Voice agent inventory |

## Integration Points

### n8n Instance
- **URL:** https://n8n.wranngle.com
- **MCP Endpoint:** https://n8n.wranngle.com/mcp-server/http
- **Tools:** 39 via n8n-mcp

### ElevenLabs
- **MCP Server:** elevenlabs-mcp (24 tools)
- **Governance:** `context/elevenlabs-agents/governance.yaml`
- **Patterns:** `.claude/directives/integrations/elevenlabs/patterns/`

### Twilio
- **Integration:** Via n8n Twilio node
- **Skill:** `twilio-integration` (in Claude skills)
- **Format:** E.164 phone numbers required
