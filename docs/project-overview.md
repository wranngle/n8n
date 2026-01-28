# n8n Workflow Development Methodology

## Project Overview

**Project Name:** n8n  
**Type:** Methodology Repository (DevOps Tooling)  
**Purpose:** Comprehensive n8n workflow development methodology with Claude Code integration  
**Generated:** 2026-01-07

## Executive Summary

This repository serves as a **command center** for n8n workflow development, implementing a hook-driven deterministic architecture that ensures consistent, high-quality workflow creation. It combines AI-assisted development (Claude Code), workflow automation (n8n), and voice AI integration (ElevenLabs/Twilio) into a unified methodology.

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Workflow Platform** | n8n (self-hosted) | Workflow automation engine |
| **AI Assistant** | Claude Code CLI | AI-assisted development |
| **MCP Integration** | n8n-mcp | 39 tools, 528 nodes, 2709 templates |
| **Voice AI** | ElevenLabs | Voice agents, conversational AI |
| **Communication** | Twilio | SMS, Voice, WhatsApp |
| **Scripting** | JavaScript, Python, PowerShell | Hooks, tests, automation |
| **Documentation** | Markdown, YAML, JSON | Configs and methodology |

## Architecture Type

**Hook-Driven Deterministic Architecture** with:
- 21-step workflow development protocol
- 6 phases: CALIBRATE → DESIGN → BUILD → VALIDATE → TEST → DEPLOY
- Governance system (DEV → ALPHA → BETA → GA → PROD → ARCHIVED)
- 11 specialized skills for n8n development
- 15+ enforcement hooks

## Repository Structure

```
n8n/
├── .claude/           # Claude Code configuration
│   ├── hooks/         # 15+ enforcement hooks
│   ├── directives/    # Integration frameworks
│   └── settings.json  # Hook configuration
├── context/           # Knowledge bases
│   ├── youtube-knowledge/    # 10,279 indexed videos
│   ├── discord-knowledge/    # 2,930 Q&A indexed
│   └── workflow-patterns/    # Reusable patterns
├── workflows/         # n8n workflow files
│   ├── governance.yaml       # Phase assignments
│   ├── registry.yaml         # Workflow metadata
│   └── voice_ai_agents/      # Voice agent workflows
├── scripts/           # Automation utilities
├── templates/         # Reusable templates
├── docs/              # BMM documentation (this folder)
└── _bmad-output/      # BMAD methodology outputs
```

## Key Features

### 1. Workflow Development Protocol
- **21-step methodology** ensuring comprehensive workflow creation
- **Mandatory research quota** (25 sources for non-trivial workflows)
- **Validation loops** with 4 profiles (minimal, runtime, ai-friendly, strict)

### 2. Governance System
- **Deployment phases** prevent accidental production changes
- **No deletion policy** - workflows are archived, never deleted
- **Clone protection** for ALPHA/BETA/GA/PROD workflows

### 3. Voice AI Integration
- **ElevenLabs agents** with governance tracking
- **Twilio integration** for SMS/Voice/WhatsApp
- **Client data injection patterns** for personalized calls

### 4. Knowledge Management
- **10,279 YouTube tutorials** indexed
- **2,930 Discord Q&A** searchable
- **4,343 community workflows** available
- **2,709 official templates** via n8n-mcp

## Quick Links

- [Architecture Documentation](./architecture.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Development Guide](./development-guide.md)
- [Primary Methodology](../CLAUDE.md)

## Getting Started

1. **For workflow development:** Follow the 21-step protocol in CLAUDE.md
2. **For voice agents:** Use the voice-agent-factory skill
3. **For integrations:** Check `.claude/directives/integrations/`

## AI-Assisted Development

When using Claude Code in this repository:
- Hooks automatically detect workflow-related requests
- Skills are invoked based on detected intent
- Governance is enforced via pre/post tool hooks
- Research is mandatory before building workflows
