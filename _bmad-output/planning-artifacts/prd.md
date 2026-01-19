---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/source-tree-analysis.md
  - docs/development-guide.md
  - CLAUDE.md
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 6
workflowType: 'prd'
lastStep: 2
projectType: brownfield
projectClassification:
  type: developer_tool
  domain: general
  complexity: medium
---

# Product Requirements Document - n8n

**Author:** wranngle
**Date:** 2026-01-07

## Executive Summary

The **n8n Workflow Development Command Center** is a comprehensive methodology repository that transforms n8n workflow development from ad-hoc scripting into a disciplined, AI-assisted engineering practice. Built on a hook-driven deterministic architecture, it ensures consistent, high-quality workflow creation through enforced protocols, extensive knowledge bases, and governance controls.

This system serves as both a development environment and a methodology—combining Claude Code AI assistance, n8n workflow automation, and voice AI integrations (ElevenLabs/Twilio) into a unified platform for building production-ready automation solutions.

### What Makes This Special

1. **Hook-Driven Determinism**: Unlike documentation-only methodologies, this system enforces its protocols through code. 15+ hooks intercept operations and ensure compliance—Claude cannot bypass the 21-step protocol.

2. **Unprecedented Knowledge Integration**: 10,279 YouTube tutorials, 2,930 Discord Q&A entries, 4,343 community workflows, and 2,709 official templates are indexed and searchable, with a mandatory 25-source research quota for non-trivial workflows.

3. **Governance Without Friction**: The DEV-only policy with archiving prevents workflow pollution while maintaining development velocity. No deletions allowed—only structured phase transitions.

4. **Voice AI Factory Pattern**: Complete pipeline for creating production-ready voice agents from a single request, including ElevenLabs agent creation, Twilio integration, and SMS tool deployment.

5. **Self-Correcting Supervision**: The Ultrathink engine monitors for friction, inefficiency, and mistakes, triggering automatic research protocols after repeated issues.

## Project Classification

**Technical Type:** Developer Tool / Methodology Platform (Hybrid)
**Domain:** Software Development Tooling
**Complexity:** Medium
**Project Context:** Brownfield - formalizing existing system

This PRD documents the complete system architecture, requirements, and specifications for the n8n Workflow Development Command Center, establishing it as the authoritative reference for development, maintenance, and evolution of the methodology.

## Success Criteria

### User Success

**Developer Experience Excellence:**
- Developers complete workflow builds 50% faster using the 21-step protocol vs. ad-hoc development
- 90%+ of workflows pass validation on first submission (using ai-friendly profile)
- Research phase completion with 25+ sources becomes habitual, not burdensome
- Hook system catches 95%+ of governance violations before deployment

**Knowledge Discovery:**
- Developers find relevant patterns/templates within 3 searches
- YouTube/Discord knowledge base queries return actionable results 80%+ of the time
- "Reinventing the wheel" incidents reduced to <5% of workflow builds

**Confidence & Quality:**
- Developers trust the system to catch errors before production
- Workflow quality scores consistently above threshold
- Reduced debugging time through proactive validation

### Business Success

**Methodology Adoption (3-month targets):**
- 100% of new workflows follow the 21-step protocol
- Governance compliance rate >95%
- Zero unauthorized modifications to non-DEV workflows

**Efficiency Gains (12-month targets):**
- 60% reduction in workflow debugging time
- 40% reduction in duplicate/similar workflow creation
- Knowledge base utilization rate >70% per workflow build

**Platform Health:**
- All 528 nodes maintain documentation coverage >85%
- Template library grows by 10+ validated patterns per quarter
- Community contributions integrated within 2-week cycles

### Technical Success

**System Reliability:**
- Hook execution latency <100ms per hook
- MCP server availability >99.5%
- Knowledge base search response <2 seconds

**Integration Stability:**
- n8n-mcp tools maintain 100% backward compatibility
- ElevenLabs/Twilio integrations operate without credential failures
- Validation profiles produce consistent results across sessions

**Governance Enforcement:**
- Zero workflow deletions (archiving only)
- Phase transitions logged with full audit trail
- Supersession protocol followed for all workflow replacements

### Measurable Outcomes

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Protocol compliance | N/A | >95% | Hook enforcement logs |
| Research quota met | N/A | >90% | Source tracking in workflows |
| First-pass validation | ~60% | >90% | Validation tool results |
| Knowledge reuse | ~30% | >70% | Template/pattern citations |
| Governance violations | Unknown | <5/month | Hook rejection logs |

## Product Scope

### MVP - Minimum Viable Product (Current State)

The existing system represents the MVP with these core capabilities:

1. **Hook-Driven Architecture**
   - 15+ enforcement hooks operational
   - detect-workflow-intent routing functional
   - Governance enforcement active

2. **21-Step Protocol**
   - Complete 6-phase workflow documented
   - Skill invocation map defined
   - Validation loops implemented

3. **Knowledge Bases**
   - YouTube: 10,279 tutorials indexed
   - Discord: 2,930 Q&A entries
   - Templates: 2,709 official templates accessible

4. **Governance System**
   - DEV-only modification policy
   - Archiving workflow operational
   - Phase tracking in governance.yaml

5. **Voice AI Integration**
   - ElevenLabs agent management
   - Twilio SMS/Voice integration
   - Voice-agent-factory skill

### Growth Features (Post-MVP)

1. **Enhanced Analytics**
   - Workflow quality scoring dashboard
   - Protocol compliance metrics visualization
   - Knowledge base utilization reports

2. **Expanded Knowledge Integration**
   - Reddit community auto-indexing
   - Stack Overflow n8n tag monitoring
   - GitHub issue pattern extraction

3. **Advanced Governance**
   - Automated phase promotion recommendations
   - Workflow similarity detection improvements
   - Cross-workflow dependency tracking

4. **Testing Infrastructure**
   - Automated workflow regression testing
   - Supersystem evaluation expansion (1000+ test cases)
   - CI/CD pipeline integration

### Vision (Future)

1. **Self-Evolving Methodology**
   - AI-driven protocol optimization based on success metrics
   - Automatic skill generation from successful patterns
   - Predictive issue detection before workflow deployment

2. **Community Platform**
   - Shared methodology marketplace
   - Cross-organization pattern sharing
   - Federated governance for team environments

3. **Universal Automation Gateway**
   - Extend beyond n8n to other automation platforms
   - Cross-platform workflow translation
   - Universal node abstraction layer

## User Journeys

### Journey 1: Marcus Chen - The Overwhelmed Automation Developer

Marcus is a senior developer at a growing SaaS company who's been tasked with building automation workflows in n8n. He's technically skilled but drowning in ad-hoc requests—each workflow feels like reinventing the wheel. His Slack is full of "can you build a workflow that..." messages, and he's spending more time researching node configurations than actually building.

One Monday morning, after his third failed attempt to configure an ElevenLabs voice agent webhook, Marcus discovers the n8n Workflow Development Command Center. Skeptical but desperate, he clones the repository and runs his first workflow request through Claude Code.

The `detect-workflow-intent` hook fires immediately, routing him to the 21-step protocol. Instead of his usual 2-hour research spiral, the system enforces a structured research phase—pulling from 10,279 YouTube tutorials and 2,930 Discord Q&A entries. Within 15 minutes, Marcus has found three similar workflows in the community library and a template that's 80% of what he needs.

The breakthrough comes during validation. His usual workflow would have deployed with a subtle webhook configuration error that would have taken hours to debug in production. The `pre-deploy-check` hook catches it before deployment, pointing him to the exact issue and the fix.

Six weeks later, Marcus has built 12 production workflows with zero post-deployment critical bugs. His team now jokes that he's become "suspiciously productive." He's promoted to lead the automation practice, using the Command Center as the foundation for all new workflow development.

### Journey 2: Sarah Kim - The Voice Agent Factory User

Sarah runs customer success at a home services company. She's heard about AI voice agents but has no technical background—the closest she's come to coding is Excel formulas. Her CEO wants an AI receptionist to handle after-hours calls, and every vendor quote has been $50K+.

During a conversation with her tech-savvy nephew, she learns about the n8n Command Center's voice-agent-factory skill. With his help, she opens Claude Code and types: "Make an oncall agent for Southeastern Wyoming Garage Doors."

What happens next feels like magic. The system parses her request, matches her industry to a home services template, and begins orchestrating. She watches as it creates an ElevenLabs agent with industry-appropriate personality, deploys an n8n workflow for SMS booking confirmations, and configures Twilio phone integration.

The moment of truth comes when she calls the number herself. "Sarah" the AI receptionist answers with a warm, professional greeting, handles her test booking request naturally, and sends her an SMS confirmation. Total time from request to working agent: 47 minutes.

Three months later, SEWY Garage Doors has handled 2,400 after-hours calls without hiring additional staff. Sarah presents the ROI at an industry conference, and four competitors ask for her consultant's contact info. She just smiles.

### Journey 3: David Okonkwo - The Methodology Maintainer

David is a DevOps engineer who inherited the n8n Command Center from its original creator. His job is to keep the methodology current, add new skills, and ensure the hooks don't break as n8n evolves. He's meticulous, slightly paranoid about regressions, and drinks too much coffee.

His morning starts with reviewing the `.claude/logs/supervision-log.jsonl`. The Ultrathink engine flagged three instances of the same validation error yesterday—IF node routing failures. The automatic research protocol has already fired, documenting the known bug and canonical solution (use Switch node instead).

David updates the `if-node-warning.js` hook to block IF node usage entirely, with a helpful message pointing to the Switch node alternative. He adds the fix to `context/known-bugs/n8n-if-node-v2.md` and commits with the standard format: `[n8n] fix: if-node-warning - Block IF node usage due to routing bug`.

Later, a request comes in for a new Pipedrive integration. David follows the Third-Party Integration Framework, creating the directory structure under `.claude/directives/integrations/pipedrive/`. He inventories available MCP tools (none found), aggregates documentation from Context7 and Exa, and documents known credential patterns.

By end of day, the Pipedrive integration framework is ready. Any developer building Pipedrive workflows will now have instant access to 23 documented API patterns, 4 common failure modes, and credential management templates. David's contribution will save dozens of hours across future workflow builds—but he won't know that. He just knows his commit history is clean.

### Journey 4: Elena Rodriguez - The Troubleshooting Support Engineer

Elena joined the team two weeks ago. Her job is to investigate workflow failures reported by end users and either fix them or escalate to development. She's smart but still learning the n8n ecosystem, and the sheer number of workflows (20+ active) is intimidating.

Her first real ticket: "Voice agent stopped sending SMS confirmations." The workflow ID is `5eowJIoZFZOSG85m`. Elena opens the governance.yaml and finds it—`[DEV] ElevenLabs Twilio Outbound Call with Client Data`. Phase: DEV. Modifiable: Yes.

She pulls the workflow using `mcp__n8n-mcp__n8n_get_workflow` and runs it through validation. The `validate_workflow` tool catches it immediately: the Twilio credential reference is pointing to a deleted credential ID. Someone rotated the API keys but forgot to update this workflow.

Elena attempts to fix it directly, but the `workflow-governance.js` hook blocks her modification—not because of phase (it's DEV), but because her edit would remove an existing webhook path without archiving it first. The hook explains the supersession protocol and points her to the correct procedure.

Twenty minutes later, Elena has fixed the credential reference, followed the proper update procedure, and the workflow is processing SMS confirmations again. She documents the incident in the deployment-log.jsonl and adds "credential rotation checklist" to her personal notes.

Three months later, Elena is the team's go-to troubleshooter. She's contributed two new hooks based on patterns she discovered during investigations, and her documentation in `context/known-bugs/` has prevented at least six recurrences of common issues.

### Journey 5: API Consumer - The External Integration Developer

Jordan works at a partner company that needs to trigger n8n workflows programmatically. They've been given API access to the n8n instance but no guidance on the methodology. Their first attempt to create a workflow via API fails validation with cryptic errors.

Frustrated, Jordan reaches out and is pointed to the `n8n-mcp-tools-expert` skill documentation. They learn about the node type format differences (`nodes-base.slack` vs `n8n-nodes-base.slack`), the validation profiles, and the governance requirements.

Their second attempt uses `mcp__n8n-mcp__validate_workflow` with the `ai-friendly` profile before deployment. The validator catches three issues: a missing webhook authentication, an incorrect expression syntax (`$json.name` instead of `$json.body.name`), and a connection pointing to a non-existent node.

The `n8n-expression-syntax` skill documentation helps Jordan understand the webhook data access pattern. They fix all three issues and deploy successfully. The workflow is automatically registered in governance.yaml as DEV phase, ready for the standard lifecycle.

Jordan's integration now creates 50+ workflows per month, all passing validation on first submission. They've become an advocate for the methodology at their company, even suggesting they adopt a similar hook-driven approach for their own tooling.

## Journey Requirements Summary

These journeys reveal the following capability requirements:

| Journey | User Type | Key Capabilities Required |
|---------|-----------|--------------------------|
| Marcus Chen | Workflow Developer | 21-step protocol, research enforcement, knowledge bases, validation hooks |
| Sarah Kim | Non-Technical User | Voice-agent-factory skill, template matching, orchestrated deployment |
| David Okonkwo | Methodology Maintainer | Hook development, skill management, bug documentation, integration framework |
| Elena Rodriguez | Support Engineer | Governance lookup, validation tools, audit logs, supersession protocol |
| Jordan (API) | External Developer | API validation, documentation, node type formatting, expression syntax |

**Cross-Journey Requirements:**
- All journeys require functional hooks and governance enforcement
- All journeys benefit from comprehensive documentation and error messages
- Validation tools are critical across developer, maintainer, and support roles
- Knowledge bases accelerate onboarding for all user types

## Developer Tool Specific Requirements

### Project-Type Overview

The n8n Workflow Development Command Center is classified as a **Developer Tool** with the following characteristics:

- **Primary Users**: Software developers, automation engineers, DevOps practitioners
- **Distribution Model**: Git repository with Claude Code CLI integration
- **Execution Environment**: Local development machine with Node.js runtime
- **Extension Model**: Skills, hooks, and directives as modular components

### Language & Technology Matrix

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Hooks** | JavaScript (ES Modules) | Event-driven enforcement and routing |
| **Skills** | Markdown + YAML frontmatter | Capability definitions and protocols |
| **Scripts** | PowerShell, Bash | Deployment, testing, evaluation |
| **Knowledge Processing** | Python | YouTube/Discord indexing, data processing |
| **Workflow Output** | JSON (n8n format) | Deployable workflow definitions |

### Installation & Setup Methods

| Method | Target | Prerequisites |
|--------|--------|---------------|
| **Git Clone** | Primary | Git, Node.js 18+, Claude Code CLI |
| **Fork + Customize** | Teams | Same as clone + team configuration |
| **n8n-methodology MCP** | Portable | Claude Code with MCP server support |

**Setup Sequence:**
1. Clone repository to local machine
2. Configure `.env` with API keys (N8N_API_KEY, EXA_API_KEY, etc.)
3. Verify hooks: `node .claude/hooks/session-init.js`
4. Test MCP connectivity: `mcp__n8n-mcp__list_nodes`

### API Surface & Extension Points

| Extension Point | Interface | Documentation |
|-----------------|-----------|---------------|
| **Hooks** | JavaScript exports `{ continue, systemMessage }` or `{ decision, reason }` | `.claude/hooks/*.js` |
| **Skills** | Markdown with YAML frontmatter defining triggers and protocol | `.claude/skills/*/SKILL.md` |
| **Directives** | Markdown reference documents for domain knowledge | `.claude/directives/**/*.md` |
| **Integration Frameworks** | YAML manifest + knowledge index + patterns | `.claude/directives/integrations/{service}/` |

### Code Examples & Patterns

**Hook Structure Example:**
```javascript
// .claude/hooks/detect-workflow-intent.js
export default function detectWorkflowIntent(prompt) {
  const signals = ['workflow', 'n8n', 'automation', 'webhook'];
  const detected = signals.some(s => prompt.toLowerCase().includes(s));
  return detected
    ? { continue: true, systemMessage: 'INVOKE Skill("n8n-workflow-dev")' }
    : { continue: true };
}
```

**Skill Definition Pattern:**
```yaml
# .claude/skills/example-skill/SKILL.md frontmatter
---
name: example-skill
triggers: ['keyword1', 'keyword2']
invokes: ['sub-skill-1', 'sub-skill-2']
---
# Skill Name
## When to Use
## Protocol Steps
## Output Format
```

### Migration & Upgrade Guide

| From | To | Migration Steps |
|------|-----|-----------------|
| **No methodology** | v1.0 | Clone, configure, run first workflow through 21-step protocol |
| **v1.x** | v2.x | Run `git pull`, review CHANGELOG.md, update custom hooks |
| **Custom fork** | Upstream | Cherry-pick changes, preserve custom skills/hooks |

**Backward Compatibility Guarantees:**
- Hook interfaces maintain backward compatibility across minor versions
- Skill format additions are non-breaking
- n8n-MCP tool signatures remain stable
- Knowledge base locations documented and versioned

### CLI Integration & Workflow

Unlike traditional developer tools distributed via package managers, this methodology integrates directly with Claude Code CLI:

| Command | Purpose |
|---------|---------|
| `claude` | Start Claude Code session in project directory |
| `/n8n-workflow-dev` | Invoke master skill explicitly |
| `/voice-agent-factory` | Voice agent creation skill |
| `/quick-node {node}` | Fast node lookup |

### Documentation Structure

| Document | Location | Audience |
|----------|----------|----------|
| **CLAUDE.md** | Project root | AI assistant (Claude) |
| **Development Guide** | `docs/development-guide.md` | Human developers |
| **Architecture** | `docs/architecture.md` | Technical stakeholders |
| **Integration Frameworks** | `.claude/directives/integrations/` | Service-specific context |

### Testing & Validation Infrastructure

| Level | Tool/Method | Coverage |
|-------|-------------|----------|
| **Hook Unit Tests** | Node.js assertions | Hook input/output contracts |
| **Workflow Validation** | n8n-MCP `validate_workflow` | JSON schema + expression syntax |
| **Integration Tests** | Shell scripts in `workflows/*/tests/` | End-to-end service integration |
| **Evaluation System** | Supersystem (1000+ test cases) | Prompt/response quality |

### Implementation Considerations

**Development Environment:**
- Requires active Claude Code CLI session for hook execution
- MCP servers must be configured in `~/.claude.json`
- n8n instance required for deployment testing
- API keys for external services (ElevenLabs, Twilio, Exa)

**Extension Best Practices:**
1. New hooks should follow existing naming conventions (`verb-noun.js`)
2. Skills should define clear triggers and invocation chains
3. Integration frameworks must include manifest, MCP tools, and knowledge index
4. All changes should update CLAUDE.md if they affect AI behavior

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP (Foundation Established)

The n8n Workflow Development Command Center represents a **completed MVP** that is already operational. The system achieves its core promise: transforming ad-hoc n8n development into a disciplined, AI-assisted engineering practice.

**Current State Assessment:**
- ✅ Hook-driven architecture operational (15+ hooks)
- ✅ 21-step protocol implemented and enforced
- ✅ Knowledge bases indexed (20,000+ sources)
- ✅ Governance system active (DEV-only policy)
- ✅ Voice AI factory pipeline functional
- ✅ n8n-MCP integration complete (39 tools, 528 nodes)

**Resource Status:** Single-developer methodology project

### MVP Feature Set (Phase 1 - Current State)

**Core User Journeys Supported:**
- ✅ Marcus Chen (Workflow Developer) - Full 21-step protocol support
- ✅ Sarah Kim (Voice Agent Factory User) - Complete voice agent creation pipeline
- ✅ David Okonkwo (Methodology Maintainer) - Hook/skill extension framework
- ✅ Elena Rodriguez (Support Engineer) - Governance lookup and validation tools
- ⚠️ Jordan (API Consumer) - Partial (documentation exists, no formal API)

**Must-Have Capabilities (Operational):**

| Capability | Status | Implementation |
|------------|--------|----------------|
| Workflow intent detection | ✅ | `detect-workflow-intent.js` hook |
| 21-step protocol enforcement | ✅ | `n8n-workflow-dev` skill |
| Knowledge base search | ✅ | YouTube, Discord, templates indexed |
| Workflow validation | ✅ | n8n-MCP `validate_workflow` |
| Governance enforcement | ✅ | `workflow-governance.js` hook |
| Voice agent creation | ✅ | `voice-agent-factory` skill |
| ElevenLabs integration | ✅ | 24 MCP tools configured |
| Twilio integration | ✅ | Skill with E.164 formatting |
| Deployment automation | ✅ | Pre/post deploy hooks |
| Self-correction (Ultrathink) | ✅ | Supervision log + research protocol |

### Post-MVP Features

**Phase 2 (Growth - 3-6 months):**

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| Workflow quality scoring dashboard | High | Medium | Metrics collection framework |
| Protocol compliance metrics | High | Low | Hook execution logging |
| Knowledge base utilization reports | Medium | Medium | Usage tracking system |
| Reddit community indexing | Medium | Medium | Exa integration |
| Stack Overflow monitoring | Low | Medium | API integration |
| GitHub issue pattern extraction | Low | High | GitHub API + NLP |

**Phase 3 (Expansion - 6-12 months):**

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| Automated phase promotion | High | High | ML confidence scoring |
| Workflow similarity detection v2 | Medium | High | Vector embeddings |
| Cross-workflow dependency tracking | Medium | High | Graph database |
| Automated regression testing | High | High | Test framework |
| Supersystem evaluation expansion | Medium | Medium | Additional test cases |
| CI/CD pipeline integration | Medium | Medium | GitHub Actions |

**Phase 4 (Vision - 12+ months):**

| Feature | Priority | Effort | Dependencies |
|---------|----------|--------|--------------|
| AI-driven protocol optimization | Exploratory | Very High | Success metrics, ML pipeline |
| Automatic skill generation | Exploratory | Very High | Pattern recognition system |
| Predictive issue detection | Exploratory | High | Historical data analysis |
| Shared methodology marketplace | Exploratory | Very High | Platform infrastructure |
| Cross-organization pattern sharing | Exploratory | High | Security model |
| Multi-platform support | Exploratory | Very High | Abstraction layer |

### Scope Boundaries

**In Scope (Maintained):**
- n8n workflow development methodology
- Claude Code CLI integration
- Hook/skill/directive architecture
- Knowledge base indexing and search
- Governance and phase tracking
- Voice AI (ElevenLabs/Twilio) integrations
- Validation and deployment automation

**Out of Scope (Deferred):**
- Native n8n plugin development
- Multi-user collaboration features
- Real-time workflow monitoring
- Commercial licensing/marketplace
- Non-n8n automation platform support
- Custom UI/dashboard development

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| n8n API breaking changes | High | Medium | Version pinning, MCP abstraction layer |
| Claude Code CLI deprecation | Critical | Low | Alternative AI assistant integration paths |
| MCP server instability | Medium | Low | Fallback to direct API calls |
| Knowledge base staleness | Medium | Medium | Automated refresh schedules |

**Operational Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Single maintainer dependency | High | High | Comprehensive documentation, CLAUDE.md |
| Hook execution performance | Medium | Low | Lazy loading, caching |
| API key management | High | Medium | Credential management directive |

**Market Risks:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| n8n market position changes | Medium | Low | Platform-agnostic patterns |
| AI assistant competition | Low | Medium | Portable methodology (MCP server) |
| Community adoption resistance | Medium | Medium | Demonstrated ROI, user journeys |

### Contingency Planning

**Minimum Viable Continuation:**
If resources become constrained, the following core features must be maintained:
1. Hook-driven intent detection (routing)
2. 21-step protocol skill (quality)
3. Governance enforcement (hygiene)
4. Basic validation (error prevention)

**Feature Deprecation Candidates:**
Should scope reduction be required:
1. Voice agent factory (specialized use case)
2. Ultrathink self-correction (enhancement)
3. Advanced analytics (nice-to-have)
4. Community indexing (can use manual research)

## Functional Requirements

The following functional requirements define the **capability contract** for the n8n Workflow Development Command Center. Every feature traces back to these requirements.

### Workflow Development Protocol

- **FR1:** Developers can request n8n workflow builds using natural language descriptions
- **FR2:** System can detect workflow-related intent and route to the appropriate protocol
- **FR3:** Developers can follow a structured 21-step protocol spanning 6 phases (CALIBRATE, DESIGN, BUILD, VALIDATE, TEST, DEPLOY)
- **FR4:** System can enforce mandatory research quotas (25+ sources for non-trivial workflows)
- **FR5:** Developers can track protocol progress across steps and phases
- **FR6:** System can invoke sub-skills at appropriate protocol steps automatically

### Knowledge Base Discovery

- **FR7:** Developers can search YouTube tutorial knowledge base (10,279 indexed videos)
- **FR8:** Developers can search Discord Q&A knowledge base (2,930 indexed entries)
- **FR9:** Developers can search official n8n templates (2,709 templates via MCP)
- **FR10:** Developers can search community workflow library (4,343 workflows)
- **FR11:** System can aggregate search results across multiple knowledge sources
- **FR12:** Developers can access pattern analysis from previous workflow builds
- **FR13:** System can track research source citations per workflow build

### Workflow Governance

- **FR14:** System can enforce DEV-only modification policy on workflows
- **FR15:** System can block workflow deletion and enforce archiving instead
- **FR16:** Administrators can assign deployment phases (DEV, ARCHIVED) to workflows
- **FR17:** System can auto-tag new workflows as DEV phase
- **FR18:** System can track phase transitions with history and audit trail
- **FR19:** Support engineers can lookup workflow governance status by ID
- **FR20:** System can enforce supersession protocol when replacing workflows

### Validation & Error Prevention

- **FR21:** Developers can validate workflow JSON against n8n schema
- **FR22:** System can validate node configurations using multiple profiles (minimal, runtime, ai-friendly, strict)
- **FR23:** System can validate workflow connections and data flow
- **FR24:** System can validate n8n expressions for syntax errors
- **FR25:** Developers can interpret validation errors with guided resolution
- **FR26:** System can detect and block known problematic patterns (e.g., IF node routing bug)
- **FR27:** System can suggest alternative approaches for blocked patterns

### Node Configuration & Templates

- **FR28:** Developers can search n8n nodes by keyword (528 nodes indexed)
- **FR29:** Developers can retrieve node essentials (key properties <5KB)
- **FR30:** Developers can retrieve full node schema when needed (100KB+)
- **FR31:** Developers can access node documentation (87% coverage)
- **FR32:** Developers can search task templates by category (29 pre-configured)
- **FR33:** Developers can retrieve ready-to-use node configurations for common tasks
- **FR34:** System can provide node type format guidance (search vs. workflow JSON vs. AI nodes)

### Deployment Automation

- **FR35:** Developers can create workflows on n8n instance via API
- **FR36:** Developers can update workflows using partial diff operations (80-90% token savings)
- **FR37:** System can run pre-deployment validation hooks
- **FR38:** System can log deployments with audit trail (post-deploy hooks)
- **FR39:** Developers can trigger webhook-based workflows for testing
- **FR40:** System can auto-stage workflow changes to git on file writes

### Voice AI Integration

- **FR41:** Developers can create ElevenLabs voice agents from natural language requests
- **FR42:** System can match industry templates to company/use-case descriptions
- **FR43:** Developers can configure ElevenLabs agent personality and voice
- **FR44:** Developers can deploy SMS confirmation workflows for voice agents
- **FR45:** Developers can configure Twilio phone integration for voice agents
- **FR46:** System can orchestrate complete voice agent pipeline (parse → template → agent → tools → configure)
- **FR47:** Support engineers can manage ElevenLabs agent governance phases

### Third-Party Integration Framework

- **FR48:** Developers can add new third-party service integrations following framework
- **FR49:** System can inventory MCP tools for integrated services
- **FR50:** Developers can access aggregated documentation for integrated services
- **FR51:** System can track credential locations (without storing secrets)
- **FR52:** Developers can access reusable workflow patterns for integrated services
- **FR53:** System can document known failure modes and resolutions per service

### Self-Correction & Supervision

- **FR54:** System can log negative indicators (FRICTION, INEFFICIENCY, WASTE, CORRUPTION, MISTAKES)
- **FR55:** System can trigger automatic research protocol after repeated issues (2+ occurrences)
- **FR56:** System can document known bugs with canonical solutions
- **FR57:** Developers can access known-bugs registry for common issues
- **FR58:** System can implement self-healing hooks for documented issues

### Extension & Customization

- **FR59:** Methodology maintainers can create new enforcement hooks
- **FR60:** Methodology maintainers can create new capability skills
- **FR61:** Methodology maintainers can create new integration frameworks
- **FR62:** System can load hooks from configured directories
- **FR63:** System can invoke skills based on trigger patterns
- **FR64:** Developers can access skill definitions for manual invocation
- **FR65:** System can maintain backward compatibility for hook interfaces

### Documentation & Onboarding

- **FR66:** New developers can access structured documentation (CLAUDE.md, docs/)
- **FR67:** Developers can access development guides with setup instructions
- **FR68:** Developers can access architecture documentation
- **FR69:** Support engineers can access troubleshooting guides
- **FR70:** System can provide hook debugging logs

## Non-Functional Requirements

Non-functional requirements specify HOW WELL the system performs. Categories below are selectively included based on relevance to this developer tool methodology.

### Performance

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-P1** | Hook execution latency | <100ms per hook | Hook execution timer logs |
| **NFR-P2** | Knowledge base search response | <2 seconds | Search query timing |
| **NFR-P3** | n8n-MCP tool response | <3 seconds | MCP call timing |
| **NFR-P4** | Workflow validation response | <5 seconds for typical workflow | Validation tool timing |
| **NFR-P5** | Skill loading time | <500ms | Skill invocation timing |

**Rationale:** Developer experience depends on responsive tooling. Latency above targets creates friction in the workflow development process.

### Reliability

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-R1** | MCP server availability | >99.5% uptime | Server health checks |
| **NFR-R2** | Hook execution reliability | 100% execution for configured hooks | Hook execution logs |
| **NFR-R3** | Validation consistency | Same input produces same output | Validation regression tests |
| **NFR-R4** | Knowledge base availability | Graceful degradation if unavailable | Offline mode tests |
| **NFR-R5** | Governance enforcement reliability | Zero unauthorized modifications | Governance audit logs |

**Rationale:** Developers must trust the system to enforce protocols consistently. Unreliable governance or validation undermines the methodology.

### Integration

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-I1** | n8n-MCP tool backward compatibility | 100% across minor versions | API compatibility tests |
| **NFR-I2** | n8n instance API compatibility | Support n8n 1.0+ | Version matrix testing |
| **NFR-I3** | ElevenLabs MCP integration | All 24 tools functional | Integration tests |
| **NFR-I4** | Twilio integration reliability | E.164 format validation | Format compliance tests |
| **NFR-I5** | External API graceful degradation | Informative errors, no crashes | Error handling tests |

**Rationale:** The system integrates with multiple external services. Each integration point must be reliable and provide clear feedback on failures.

### Maintainability

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-M1** | Hook interface stability | No breaking changes in minor versions | Interface version tracking |
| **NFR-M2** | Skill format extensibility | New fields additive only | Schema validation |
| **NFR-M3** | Documentation coverage | >85% for all nodes, hooks, skills | Coverage metrics |
| **NFR-M4** | Codebase documentation | CLAUDE.md stays current with changes | Review checklist |
| **NFR-M5** | Knowledge base freshness | Quarterly index refresh minimum | Last-updated timestamps |

**Rationale:** As a methodology tool, the system must evolve without breaking existing workflows or requiring extensive relearning.

### Security

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-S1** | API key storage | Never in version control | Pre-commit hooks, .gitignore |
| **NFR-S2** | Credential reference handling | Store references, not secrets | Credential audit |
| **NFR-S3** | Hook execution isolation | No credential leakage in logs | Log audit |
| **NFR-S4** | MCP authentication | Token-based, rotatable | Authentication tests |

**Rationale:** The system handles sensitive API keys for multiple services. While not processing user data, credential security is critical.

### Usability (Developer Experience)

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-U1** | First-pass validation rate | >90% workflows pass on first submission | Validation metrics |
| **NFR-U2** | Research phase completion | 25+ sources becomes habitual | Source tracking |
| **NFR-U3** | Error message clarity | Actionable guidance in all errors | User feedback |
| **NFR-U4** | Protocol discoverability | New developers productive within 1 session | Onboarding metrics |
| **NFR-U5** | Hook feedback transparency | Clear indication of hook actions | Hook log visibility |

**Rationale:** The methodology succeeds when developers adopt it willingly. Poor developer experience leads to protocol bypass attempts.

### Operational

| NFR ID | Requirement | Target | Measurement |
|--------|-------------|--------|-------------|
| **NFR-O1** | Session persistence | Hooks fire correctly on session resume | Resume tests |
| **NFR-O2** | Log retention | Supervision logs retained 30+ days | Log storage checks |
| **NFR-O3** | Deployment audit trail | All deployments logged with metadata | Deployment log review |
| **NFR-O4** | Git integration | Auto-staging within 1 second of write | Git hook timing |

**Rationale:** Operational reliability ensures the methodology works consistently across sessions and provides accountability through audit trails.

### Categories Excluded

The following NFR categories are **not applicable** to this developer tool:

- **Accessibility (WCAG)**: CLI-based tool, not public-facing web interface
- **Scalability**: Single-developer tool, no multi-tenant or high-volume scenarios
- **Internationalization**: English-only methodology documentation
- **Mobile Responsiveness**: Desktop/terminal environment only

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| **Version** | 1.0 |
| **Status** | Complete |
| **Created** | 2026-01-07 |
| **Author** | wranngle |
| **Classification** | developer_tool / general / medium |
| **Total FRs** | 70 |
| **Total NFRs** | 26 |

---

*PRD generated using BMAD Method (Brownfield track)*

