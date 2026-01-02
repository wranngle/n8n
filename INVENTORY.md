# n8n Workflow Development Toolkit - Complete Inventory

**The Mechanic's Garage: Every tool in its place.**

---

## Directory Structure

```
D:\Things\Work\Wranngle\n8n\
│
├── .claude/
│   ├── commands/                    # 10 Slash Commands
│   │   ├── workflow.md              # ⭐ MASTER: Complete 10-stage pipeline
│   │   ├── new-workflow.md          # Start new workflow development
│   │   ├── search-library.md        # Search all workflow sources
│   │   ├── validate.md              # Comprehensive validation
│   │   ├── deploy.md                # Deploy to n8n instance
│   │   ├── lookup-api.md            # API documentation waterfall
│   │   ├── preflight.md             # Pre-development system check
│   │   ├── quick-node.md            # Rapid node configuration
│   │   ├── analyze-workflow.md      # Deep workflow content analysis
│   │   └── screenshot-to-workflow.md # Convert screenshots to JSON
│   │
│   ├── hooks/                       # 6 Automation Hooks
│   │   ├── detect-workflow-intent.js    # Injects search reminder
│   │   ├── pre-deploy-check.js          # Validates before deployment
│   │   ├── workflow-file-guard.js       # Ensures correct file locations
│   │   ├── post-deploy-log.js           # Logs deployments
│   │   ├── auto-git-stage.js            # Auto-stages workflow files
│   │   ├── session-init.js              # Session initialization
│   │   └── analyze-before-build.js      # Content analysis utility
│   │
│   ├── skills/                      # 8 Claude Code Skills
│   │   ├── n8n-workflow-dev/        # Custom master skill (4 files)
│   │   ├── n8n-expression-syntax/   # Expression patterns (4 files)
│   │   ├── n8n-mcp-tools-expert/    # Tool mastery (5 files)
│   │   ├── n8n-workflow-patterns/   # 5 architecture patterns (7 files)
│   │   ├── n8n-validation-expert/   # Error debugging (4 files)
│   │   ├── n8n-node-configuration/  # Node config (1 file)
│   │   ├── n8n-code-javascript/     # JS Code nodes (1 file)
│   │   └── n8n-code-python/         # Python Code nodes (1 file)
│   │
│   ├── agents/                      # 9 Claude Code Agents
│   │   ├── n8n-workflow-architect.md    # ⭐ Custom: Workflow design & build
│   │   ├── code-reviewer.md             # Code quality review
│   │   ├── context-manager.md           # Context optimization
│   │   ├── debugger.md                  # Debug specialist
│   │   ├── deployment-engineer.md       # Deployment automation
│   │   ├── mcp-backend-engineer.md      # MCP development
│   │   ├── n8n-mcp-tester.md            # MCP testing
│   │   ├── technical-researcher.md      # Research agent
│   │   └── test-automator.md            # Test automation
│   │
│   └── settings.json                # Hooks configuration
│
├── config/
│   └── mcp-servers.json             # MCP server registry
│
├── context/
│   ├── api-docs/                    # Cached API documentation
│   │   └── README.md
│   ├── workflow-patterns/           # Reusable patterns
│   │   └── common-patterns.md
│   ├── n8n-mcp-knowledge.md         # ⭐ Complete n8n-mcp reference
│   └── knowledge-seed.md            # Memory graph seed
│
├── tools/
│   └── search/
│       ├── workflow-library-api.md  # Zie619 API reference (tested)
│       └── search-all-sources.js    # Unified search
│
├── workflows/
│   ├── dev/                         # Development workflows
│   ├── staging/                     # Pre-production
│   └── production/                  # Production exports
│
├── scripts/
│   ├── git-workflow.md              # Git version control
│   └── n8n-workflow-skill.md        # Legacy skill definition
│
├── CLAUDE.md                        # Master playbook (~500 lines)
├── RUNBOOK.md                       # Operations guide (~450 lines)
├── INVENTORY.md                     # This file
└── n8n_meta_automation_infodump.txt # Original reference
```

---

## Tool Registry Summary

### MCP Servers (7 Configured)

| Server | Tools | Purpose |
|--------|-------|---------|
| **n8n-mcp** | 39 | 528 nodes, 2709 templates, 29 task templates |
| **context7** | 2 | Real-time documentation injection |
| **exa** | 6 | Deep web research |
| **ref-tools** | 2 | Documentation search |
| **scrapling** | 6 | Web scraping (anti-bot bypass, 774x faster) |
| **memory** | 8 | Knowledge graph |
| **desktop-commander** | 15+ | File/process management |

### n8n-MCP Tool Categories

| Category | Key Tools |
|----------|-----------|
| Node Discovery | `search_nodes`, `list_nodes`, `get_node_essentials`, `get_node_info` |
| Task Templates | `list_tasks`, `get_node_for_task` (29 pre-configured) |
| Validation | `validate_node_operation`, `validate_workflow`, `validate_node_minimal` |
| Templates | `search_templates`, `get_template`, `list_node_templates` |
| Workflow Mgmt | `n8n_create_workflow`, `n8n_update_partial_workflow`, `n8n_list_workflows` |
| AI Tools | `list_ai_tools` (263 nodes), `get_node_as_tool_info` |

### External APIs

| API | Workflows | Access Method |
|-----|-----------|---------------|
| Zie619 Library | 4,343 | GitHub Raw URLs (always works) |
| MCP Templates | 2,709 | n8n-mcp tools |
| n8n Instance | - | your-n8n-instance.com (when deployed) |

---

## Claude Code Skills (8 Installed)

| Skill | Files | Triggers |
|-------|-------|----------|
| **n8n-workflow-dev** | 4 | Building workflows, task templates |
| **n8n-expression-syntax** | 4 | `{{}}` syntax, $json, $node |
| **n8n-mcp-tools-expert** | 5 | Tool usage, node formats |
| **n8n-workflow-patterns** | 7 | 5 architecture patterns |
| **n8n-validation-expert** | 4 | Error debugging, profiles |
| **n8n-node-configuration** | 1 | Operation-aware config |
| **n8n-code-javascript** | 1 | Code node JS patterns |
| **n8n-code-python** | 1 | Code node Python |

**Total skill files**: 27

---

## Slash Commands (10)

| Command | Purpose |
|---------|---------|
| **`/workflow`** | ⭐ Master 10-stage intent-to-production pipeline |
| `/preflight` | System readiness check |
| `/new-workflow` | Start workflow development |
| `/search-library` | Search all workflow sources |
| `/validate` | Comprehensive validation |
| `/deploy` | Deploy to n8n instance |
| `/lookup-api` | API documentation waterfall |
| `/quick-node` | Rapid node configuration |
| `/analyze-workflow` | Deep workflow content analysis |
| `/screenshot-to-workflow` | Convert screenshots to JSON |

---

## Claude Code Agents (9)

Specialized AI personalities for delegated tasks, running in isolated context windows.

| Agent | Purpose | Invocation |
|-------|---------|------------|
| **n8n-workflow-architect** | ⭐ Design, build, validate n8n workflows | Auto on workflow requests |
| code-reviewer | Review code quality and security | After code changes |
| debugger | Debug and fix issues | On errors |
| context-manager | Optimize context usage | Large conversations |
| deployment-engineer | Deployment automation | Deploy tasks |
| mcp-backend-engineer | MCP server development | MCP work |
| n8n-mcp-tester | Test MCP functionality | After MCP changes |
| technical-researcher | Deep research tasks | Research requests |
| test-automator | Automated testing | Test creation |

**Usage**: Agents are automatically invoked based on task description, or explicitly with "Use the {agent} agent to..."

---

## Automation Hooks (6)

| Hook | Event | Action |
|------|-------|--------|
| `detect-workflow-intent.js` | UserPromptSubmit | Injects search reminder |
| `pre-deploy-check.js` | PreToolUse (create_workflow) | Validates before deploy |
| `workflow-file-guard.js` | PreToolUse (Write) | Ensures correct paths |
| `post-deploy-log.js` | PostToolUse (create_workflow) | Logs deployments |
| `auto-git-stage.js` | PostToolUse (Write) | Auto-stages files |
| `session-init.js` | SessionStart | Context initialization |

---

## Key Documentation

### CLAUDE.md (Master Playbook)
- Pre-flight checklist (mandatory)
- 39 n8n-mcp tools organized by category
- 29 task templates reference
- 4 validation profiles
- 8 installed skills
- API documentation waterfall
- Security checklist

### RUNBOOK.md (Operations Guide)
- Environment setup
- Development lifecycle
- Common operations
- Troubleshooting
- Expression reference

### Skill Reference Files
- `SKILL.md` - Core skill instructions
- `*_GUIDE.md` - Supporting guides
- Pattern files (webhook, API, database, AI, scheduled)

---

## Critical Gotchas (From Skills & n8n-mcp Docs)

| Issue | Wrong | Correct |
|-------|-------|---------|
| Webhook data | `$json.name` | `$json.body.name` |
| Tool format (search) | `n8n-nodes-base.slack` | `nodes-base.slack` |
| Tool format (workflow) | `nodes-base.slack` | `n8n-nodes-base.slack` |
| Code node return | `return data` | `return [{json: data}]` |
| Expression syntax | `$json.field` | `{{$json.field}}` |
| **AI connections** | **Agent → Tool** | **Tool → Agent** (reversed!) |
| Workflow updates | Send full workflow | Use `n8n_update_partial_workflow` (80-90% savings) |
| IF connections | `sourceIndex: 0` | `branch: "true"` (semantic) |

### AI Connection Pattern (CRITICAL)
```
Standard nodes:  Source → Target  (data flows right)
AI tool nodes:   AI Agent ← Tool  (tool connects TO agent)
```

8 AI connection types: `ai_tool`, `ai_memory`, `ai_chain`, `ai_document`, `ai_embedding`, `ai_languageModel`, `ai_outputParser`, `ai_retriever`

---

## Statistics

| Metric | Count |
|--------|-------|
| Total files | 60+ |
| Slash commands | 10 |
| Skills | 8 (27 files) |
| **Agents** | **9** |
| Hooks | 6 |
| MCP servers | 7 |
| n8n-mcp tools | 39 |
| Task templates | 29 |
| Validation profiles | 4 |
| Workflow patterns | 5 |
| External workflows | 7,052 |
| n8n nodes accessible | 528 |
| AI-capable nodes | 269 |
| AI connection types | 8 |
| Workflow diff operations | 15 |

---

## Quick Start

```bash
# Full workflow pipeline (recommended)
/workflow

# Screenshot to JSON conversion
/screenshot-to-workflow

# Search existing solutions first
/search-library {keywords}

# Individual operations
/quick-node webhook
/validate
/deploy
```

---

*Toolkit Version: 2.0.0*
*Last Updated: 2025-12-14*
*Skills Source: czlonkowski/n8n-skills + custom*
*Ready for production workflow development.*
