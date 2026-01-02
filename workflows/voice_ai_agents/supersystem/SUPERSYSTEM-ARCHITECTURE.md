# ElevenLabs Supersystem Architecture v2.0

## Autonomous Self-Improving Voice Agent Framework

**Goal**: 100% pass rate through autonomous detection and remediation at ALL layers.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS SELF-IMPROVING SUPERSYSTEM                            │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 6: DEEP RESEARCH ENGINE                                               │  │
│  │  ├── n8n-methodology MCP (YouTube: 10,279 / Discord: 2,930)                  │  │
│  │  ├── Context7 + Ref-tools + Exa (real-time docs)                             │  │
│  │  ├── Canonical solution discovery                                            │  │
│  │  └── Triggers after 2 failures of same pattern                               │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ findings                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 5: CLAUDE CODE AUTO-COMMIT                                            │  │
│  │  ├── Update CLAUDE.md with new patterns                                      │  │
│  │  ├── Add to known-bugs registry                                              │  │
│  │  ├── Create/update skills                                                    │  │
│  │  └── Persist workflow templates                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ fixes                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 4: GEMINI LLM BRAIN (gemini-2.0-flash)                                │  │
│  │  ├── Analyze failures with full context                                      │  │
│  │  ├── Generate remediation strategies                                         │  │
│  │  ├── Function calling for automated fixes                                    │  │
│  │  └── Claude Code fallback for complex reasoning                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ strategies                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 3: DATA LAYER                                                         │  │
│  │  ├── 50+ test personas (randomized industries, objections)                   │  │
│  │  ├── Seed data for client lookup                                             │  │
│  │  ├── Friction log (JSONL)                                                    │  │
│  │  └── Cycle stats (historical performance)                                    │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ test data                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 2: n8n WORKFLOW AUTO-CORRECTOR                                        │  │
│  │  ├── n8n_update_partial_workflow (diff operations)                           │  │
│  │  ├── Error handling at NODE level (onError, retryOnFail, maxTries)           │  │
│  │  ├── Expression validation/fixes                                             │  │
│  │  └── Connection rewiring                                                     │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ workflow fixes                                │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 1: ELEVENLABS AGENT AUTO-MODIFIER                                     │  │
│  │  ├── PATCH /v1/convai/agents/{id} (system prompt, LLM, temp)                 │  │
│  │  ├── Knowledge base updates                                                  │  │
│  │  ├── Tool configuration                                                      │  │
│  │  └── Dynamic variable injection                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                     ↓ agent updates                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  SIMULATION LAYER (existing ultrathink-engine.js)                            │  │
│  │  ├── ElevenLabs simulate-conversation API                                    │  │
│  │  ├── 100+ scenarios from simulation-scenarios.yaml                           │  │
│  │  ├── 6-phase loop: CALIBRATE → EXECUTE → OBSERVE → REMEDIATE → VERIFY → AUTO│  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### Layer 1: ElevenLabs Agent Auto-Modifier

**API Endpoint**: `PATCH https://api.elevenlabs.io/v1/convai/agents/{agent_id}`

**Modifiable Properties**:
```javascript
const agentUpdate = {
  name: "Updated Agent Name",
  conversation_config: {
    // Conversation settings
  },
  workflow: {
    prompt: "Updated system prompt with improvements",
    llm: {
      model_id: "eleven_turbo_v2",
      temperature: 0.7,
      max_tokens: 500
    },
    tool_ids: ["send_sms", "custom_tool_123"],
    knowledge_base: [
      { type: "document", id: "doc_xyz" }
    ],
    rag: {
      enabled: true,
      embedding_model: "all-MiniLM-L6-v2"
    }
  },
  platform_settings: {
    // Twilio, web, etc.
  }
};
```

**Auto-Fix Patterns**:
| Failure Pattern | Auto-Fix Action |
|-----------------|-----------------|
| Tool not called when expected | Add explicit tool instruction to prompt |
| Knowledge gap detected | Update knowledge base document |
| Temperature too random | Reduce temperature by 0.1 |
| Context lost mid-call | Increase max_tokens |

---

### Layer 2: n8n Workflow Auto-Corrector

**API**: `mcp__n8n-mcp__n8n_update_partial_workflow`

**CRITICAL**: Error handling is NODE-LEVEL, not parameters:
```javascript
// ✅ CORRECT
n8n_update_partial_workflow({
  id: "workflow-123",
  operations: [{
    type: "updateNode",
    nodeName: "HTTP Request",
    changes: {
      onError: "continueErrorOutput",     // Node level
      retryOnFail: true,                  // Node level
      maxTries: 3,                        // Node level
      "parameters.url": "https://..."     // Parameters are nested
    }
  }]
});

// ❌ WRONG - parameters.onError doesn't exist
changes: { "parameters.onError": "continueErrorOutput" }
```

**Operation Types** (max 5 per request):
- `addNode` - Add new node
- `removeNode` - Remove node
- `updateNode` - Modify node properties
- `moveNode` - Change position
- `enableNode` / `disableNode` - Toggle node
- `addConnection` / `removeConnection` - Wire nodes
- `updateSettings` - Workflow settings
- `updateName` - Rename workflow
- `addTag` / `removeTag` - Tag management

**Auto-Fix Patterns**:
| Failure Pattern | Auto-Fix Action |
|-----------------|-----------------|
| Webhook timeout | Add retryOnFail: true, maxTries: 3 |
| Expression error | Fix $json.body.x → $json.x mapping |
| Missing error handling | Add onError: "continueErrorOutput" |
| Connection missing | Add addConnection operation |

---

### Layer 3: Data Layer

**Files**:
```
supersystem/
├── tests/
│   ├── simulation-scenarios.yaml    # 17 scenarios + 50 random templates
│   ├── cycle-stats.json             # Historical performance
│   ├── friction-log.jsonl           # Persistent friction tracking
│   └── improvement-suggestions.md   # Generated fix suggestions
├── data/
│   ├── personas/
│   │   ├── industries.yaml          # 14+ industry personas
│   │   ├── objections.yaml          # 6+ objection types
│   │   └── caller-profiles.yaml     # Name, phone, traits
│   └── seed-data/
│       ├── known-clients.json       # For client-lookup testing
│       └── expected-responses.json  # Expected webhook responses
```

**Random Scenario Generation**:
- 14 industries × 10 names × 5 call volumes × 4 interest levels = 2,800 combinations
- 6 objection types × 6 names = 36 objection scenarios
- Total pool: 2,800+ unique simulation scenarios

---

### Layer 4: Gemini LLM Brain

**Model**: `gemini-2.0-flash` (preferred) / `claude-opus-4-5` (fallback)

**Function Calling Pattern**:
```javascript
const tools = [
  {
    type: "function",
    name: "update_elevenlabs_agent",
    description: "Update ElevenLabs agent configuration",
    parameters: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        prompt_improvement: { type: "string" },
        temperature_adjustment: { type: "number" }
      }
    }
  },
  {
    type: "function",
    name: "update_n8n_workflow",
    description: "Update n8n workflow with partial diff",
    parameters: {
      type: "object",
      properties: {
        workflow_id: { type: "string" },
        operations: { type: "array", items: { type: "object" } }
      }
    }
  },
  {
    type: "function",
    name: "trigger_deep_research",
    description: "Trigger Layer 6 deep research for unknown issues",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        failure_context: { type: "string" }
      }
    }
  }
];

// Gemini interaction
const response = await gemini.generateContent({
  model: "gemini-2.0-flash",
  contents: [{ role: "user", parts: [{ text: analysisPrompt }] }],
  tools: [{ functionDeclarations: tools }]
});
```

**Analysis Prompt Template**:
```
You are an autonomous AI system analyzer. Given the following failure context:

## Failure Details
- Scenario: {scenario_name}
- Category: {category}
- Expected: {expected_tools}
- Actual: {actual_tools}
- Missing: {missing_tools}

## Transcript
{last_5_turns}

## Historical Context
- Same failure occurred {occurrence_count} times
- Previous fixes attempted: {previous_fixes}

## Task
1. Diagnose the root cause
2. Determine which layer to fix (1-6)
3. Call the appropriate fix function
4. If uncertain, call trigger_deep_research

Return a function call to fix this issue.
```

---

### Layer 5: Claude Code Auto-Commit

**Integration Points**:

1. **CLAUDE.md Updates**:
   - Add new patterns to "Known Bug Registry"
   - Update tool preferences based on discoveries
   - Add new expression patterns

2. **Skills Updates**:
   - `n8n-workflow-patterns/SKILL.md` - New workflow patterns
   - `n8n-validation-expert/SKILL.md` - New validation rules

3. **Known Bugs**:
   - `context/known-bugs/{issue}.md` - Canonical solutions

4. **Workflow Templates**:
   - `workflows/voice_ai_agents/templates/{pattern}.json`

**Auto-Commit Format**:
```
[supersystem] fix: {layer_name} - {brief_description}

- Root cause: {diagnosis}
- Fix applied: {fix_summary}
- Verified: {verification_status}

🤖 Generated by Supersystem Auto-Corrector
```

---

### Layer 6: Deep Research Engine

**Triggers**: After 2 occurrences of same failure pattern

**Sources (Priority Order)**:
1. `mcp__n8n-methodology__search_knowledge` - YouTube + Discord
2. `mcp__context7__get-library-docs` - Real-time documentation
3. `mcp__ref-tools__ref_search_documentation` - API docs
4. `mcp__exa__web_search_exa` - Web search fallback

**Research Protocol**:
```javascript
async function deepResearch(failurePattern) {
  // 1. Search n8n methodology knowledge base
  const n8nResults = await mcp.n8nMethodology.searchKnowledge({
    query: failurePattern.description,
    sources: ["youtube", "discord"],
    limit: 10
  });
  
  // 2. Search official documentation
  const docsResults = await mcp.context7.getLibraryDocs({
    context7CompatibleLibraryID: "/websites/elevenlabs_io",
    topic: failurePattern.tool || failurePattern.category
  });
  
  // 3. Web search for edge cases
  const webResults = await mcp.exa.webSearch({
    query: `ElevenLabs ${failurePattern.description} solution`,
    numResults: 5
  });
  
  // 4. Synthesize findings
  return synthesizeFindings(n8nResults, docsResults, webResults);
}
```

---

## Execution Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ULTRATHINK LOOP v2.0                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  1. CALIBRATE    → Verify all webhooks, check friction log               │
│                    └─ If friction unresolved 2x → Layer 6 research       │
│                                                                           │
│  2. EXECUTE      → Run batch of 5 simulations                            │
│                    └─ ElevenLabs simulate-conversation API               │
│                                                                           │
│  3. OBSERVE      → Pattern detection                                     │
│         ├─ Failure clustering by category                                │
│         ├─ Missing tool patterns                                         │
│         ├─ Duration anomalies                                            │
│         └─ API errors                                                    │
│                                                                           │
│  4. ANALYZE      → Gemini LLM (Layer 4)                                  │
│         ├─ Root cause diagnosis                                          │
│         ├─ Layer determination (1-6)                                     │
│         └─ Fix strategy generation                                       │
│                                                                           │
│  5. REMEDIATE    → Apply fixes via APIs                                  │
│         ├─ Layer 1: PATCH ElevenLabs agent                               │
│         ├─ Layer 2: n8n_update_partial_workflow                          │
│         ├─ Layer 3: Update test data                                     │
│         ├─ Layer 4: Adjust LLM prompts                                   │
│         ├─ Layer 5: Commit to repo                                       │
│         └─ Layer 6: Trigger research                                     │
│                                                                           │
│  6. VERIFY       → Re-run failed scenarios                               │
│                    └─ Confirm fixes resolved issues                      │
│                                                                           │
│  7. AUTOMATE     → Persist learnings                                     │
│         ├─ Update friction-log.jsonl                                     │
│         ├─ Update cycle-stats.json                                       │
│         ├─ Generate improvement-suggestions.md                           │
│         └─ Auto-commit if changes significant                            │
│                                                                           │
│  8. ITERATE      → Continue until 100% pass rate                         │
│                    └─ Max 10 cycles, 3 cycles without improvement = stop │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Files

| File | Purpose |
|------|---------|
| `supersystem-engine.js` | Main orchestrator (replace ultrathink-engine.js) |
| `layer1-agent-modifier.js` | ElevenLabs PATCH API wrapper |
| `layer2-workflow-corrector.js` | n8n MCP partial update wrapper |
| `layer3-data-manager.js` | Personas, seed data, friction log |
| `layer4-gemini-brain.js` | Gemini API + function calling |
| `layer5-repo-updater.js` | Git commit automation |
| `layer6-research-engine.js` | Deep research orchestration |

---

## Success Metrics

- **Target**: 100% pass rate (not 96%)
- **Max Cycles**: 10 (with 3-cycle improvement check)
- **Webhook Coverage**: All 4 supersystem webhooks tested
- **Auto-Fix Success Rate**: > 80% without manual intervention
- **Time to 100%**: < 30 minutes from first run

---

## Current Status

Based on cycle-stats.json:
- 10 cycles completed
- 50 simulations run
- 40 validated (80% pass rate)
- 0 gaps, 0 bugs detected
- Webhook coverage: 0 (not being tracked)

**GAP**: The current engine runs simulations but doesn't auto-fix anything.
The 6-layer architecture enables full autonomous remediation.

---

*Created: 2025-12-30*
*Version: 2.0 - Autonomous Self-Improving Framework*
