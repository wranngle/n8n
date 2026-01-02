# Third-Party Integration Framework

## Architecture Overview

When a 3rd-party service is implicated in an n8n workflow, this framework bootstraps a comprehensive integration layer—mirroring the n8n development supergateway itself.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY INTEGRATION FRAMEWORK                         │
│                                                                              │
│  USER REQUEST (mentions service)                                            │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 0: DETECTION                                                   │    │
│  │ Detect if 3rd party service is mentioned in request                  │    │
│  │ Check: integrations/{service}/manifest.yaml exists?                  │    │
│  │ If not: Bootstrap new integration                                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: TOOL DISCOVERY                                              │    │
│  │ 1. Check for connected MCP server (mcp__{service}__*)               │    │
│  │ 2. Inventory all available tools                                     │    │
│  │ 3. Document capabilities in manifest                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: KNOWLEDGE AGGREGATION                                       │    │
│  │ 1. Official docs via ref-tools/context7                              │    │
│  │ 2. YouTube tutorials (local + Exa)                                   │    │
│  │ 3. Discord/Reddit community Q&A                                      │    │
│  │ 4. GitHub examples and repos                                         │    │
│  │ 5. Store findings in knowledge-index.json                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: CREDENTIAL MANAGEMENT                                       │    │
│  │ 1. Check memory for existing credentials                             │    │
│  │ 2. Store new credentials in memory + env files                       │    │
│  │ 3. Create n8n credential if needed                                   │    │
│  │ 4. Document in credential-store.yaml                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: PATTERN EXTRACTION                                          │    │
│  │ 1. Search for n8n templates using this service                       │    │
│  │ 2. Analyze existing workflows in our repository                      │    │
│  │ 3. Document common patterns in patterns/                             │    │
│  │ 4. Create failure mode analysis                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│       │                                                                      │
│       ▼                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ PHASE 5: BUILD                                                       │    │
│  │ Integration is ready - proceed with n8n workflow development         │    │
│  │ All tools, docs, patterns, credentials are accessible                │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

For each integrated service:

```
.claude/directives/integrations/{service}/
├── manifest.yaml           # Service metadata and capabilities
├── mcp-tools.md           # Inventory of MCP tools
├── knowledge-index.json   # Aggregated knowledge references
├── credential-store.yaml  # Credential information (no secrets)
├── patterns/              # Reusable workflow patterns
│   ├── basic-integration.json
│   └── error-handling.json
├── failure-modes.md       # Known issues and resolutions
└── api-reference.md       # Quick API reference
```

## manifest.yaml Template

```yaml
service:
  name: "{ServiceName}"
  description: "Short description"
  website: "https://example.com"
  docs_url: "https://docs.example.com"
  
mcp_server:
  connected: true|false
  server_name: "{mcp-server-name}"
  tool_prefix: "mcp__{server}__"
  tool_count: N
  
capabilities:
  - category: "Category Name"
    tools:
      - name: "tool_name"
        purpose: "What it does"
        
documentation_sources:
  - type: "ref-tools"
    module_id: "{service}"
  - type: "context7"
    library_id: "/{org}/{project}"
  - type: "youtube"
    query: "{service} n8n tutorial"
    indexed_count: N
    
credentials:
  stored: true|false
  type: "httpHeaderAuth|oauth2|apiKey"
  header_name: "X-API-Key"
  n8n_credential_id: "{id}"
  
known_issues:
  - id: "ISSUE-001"
    description: "Brief description"
    resolution: "How to fix"
    
patterns:
  - name: "basic_request"
    file: "patterns/basic-integration.json"
    
last_updated: "YYYY-MM-DD"
research_depth: "comprehensive|moderate|minimal"
```

## Integration Bootstrap Protocol

When a new service is detected:

### Step 1: Check Existing Integration
```javascript
// Check if integration exists
const manifestPath = `.claude/directives/integrations/${service}/manifest.yaml`;
if (!exists(manifestPath)) {
  // Bootstrap new integration
}
```

### Step 2: Tool Discovery
```javascript
// Check for MCP server
const mcpTools = listToolsWithPrefix(`mcp__${service}__`);
if (mcpTools.length > 0) {
  // Document all tools
}
```

### Step 3: Knowledge Aggregation
```javascript
// Research priority order
1. mcp__ref-tools__ref_search_documentation({ query: `${service} API` })
2. mcp__context7__resolve-library-id({ libraryName: service })
3. mcp__exa__web_search_exa({ query: `${service} n8n integration tutorial` })
4. mcp__plugin_n8n-methodology__search_knowledge({ query: service })
5. WebSearch({ query: `site:reddit.com ${service} n8n` })
```

### Step 4: Credential Check
```javascript
// Check memory first
mcp__memory__search_nodes({ query: `${service} credentials` });
// Check env files
Grep({ pattern: service, path: "workflows/**/env/" });
```

## Incremental Update Protocol

**CRITICAL**: Never reinvent the wheel. When updating an existing integration:

1. **READ existing manifest.yaml first**
2. **MERGE new findings** with existing data
3. **PRESERVE** all working patterns and credentials
4. **ADD** new knowledge without replacing
5. **UPDATE** last_updated timestamp

```yaml
# Example incremental update
manifest.yaml:
  last_updated: "2025-01-15" → "2025-12-27"
  research_depth: "moderate" → "comprehensive"
  
knowledge-index.json:
  sources: [existing...] + [new_sources...]
```

## Usage In Workflow Development

When building a workflow that uses an integrated service:

```markdown
## Pre-Build Checklist

1. [ ] Read `.claude/directives/integrations/{service}/manifest.yaml`
2. [ ] Check `knowledge-index.json` for relevant examples
3. [ ] Review `failure-modes.md` for known issues
4. [ ] Verify credentials in `credential-store.yaml`
5. [ ] Use patterns from `patterns/` as starting points
```

## Services Inventory

| Service | Status | MCP Server | Docs Coverage | Patterns |
|---------|--------|------------|---------------|----------|
| elevenlabs | ✅ Complete | ✅ Connected | Comprehensive | 5+ |
| twilio | 🔄 Partial | ❌ None | Moderate | 3 |
| openai | 📋 Planned | ❌ None | - | - |
| anthropic | 📋 Planned | ❌ None | - | - |
| pipedrive | 📋 Planned | ❌ None | - | - |

---

*Philosophy: "A blindfolded mechanic reaching for his tool in the pitch black garage."*
*Every tool has its place. Every service has its integration.*
