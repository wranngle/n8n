# n8n Workflow Development Skill Definition

## Skill Metadata
```yaml
name: n8n-workflow-developer
version: 1.0.0
description: Comprehensive skill for developing, validating, and deploying n8n workflows
triggers:
  - "create workflow"
  - "build automation"
  - "n8n"
  - "workflow"
  - "automation"
```

## Skill Capabilities

### Core Competencies
1. **Workflow Design** - Translate requirements into n8n workflow architecture
2. **Node Configuration** - Correctly configure any of 528 n8n nodes
3. **Validation** - Ensure workflows are error-free before deployment
4. **Integration** - Connect to any API/service with proper authentication
5. **Error Handling** - Build resilient workflows with proper error paths

### Tool Proficiency

#### Primary Tools (Expert Level)
| Tool | Proficiency | Usage |
|------|-------------|-------|
| n8n-MCP search_nodes | Expert | Find nodes for any capability |
| n8n-MCP get_node_essentials | Expert | Get node configurations |
| n8n-MCP validate_workflow | Expert | Pre-deployment validation |
| n8n-MCP search_templates | Expert | Find existing solutions |
| Zie619 API | Expert | Search 4,343 community workflows |

#### Supporting Tools (Proficient)
| Tool | Proficiency | Usage |
|------|-------------|-------|
| Context7 | Proficient | SDK/library documentation |
| Exa | Proficient | Deep API research |
| Ref | Proficient | Documentation search |
| Scrapling | Competent | Web scraping (774x faster, anti-bot bypass) |

### Knowledge Domains

#### n8n Platform
- Node types and versions
- Connection patterns
- Expression syntax `{{ }}`
- Credential management
- Error handling patterns
- Workflow settings

#### Integration Patterns
- REST API consumption
- Webhook handling
- OAuth2 flows
- Database connections
- Message queues
- File processing

#### Best Practices
- Idempotent operations
- Rate limiting
- Retry logic
- Logging and monitoring
- Security considerations

## Skill Execution Protocol

### On Workflow Request

```
1. UNDERSTAND
   - Parse requirements
   - Identify trigger type
   - List required integrations
   - Note error handling needs

2. SEARCH (MANDATORY)
   - Search own instance
   - Search Zie619 library
   - Search MCP templates
   - Document findings

3. DESIGN
   - Select nodes
   - Map data flow
   - Plan error paths
   - Identify credentials

4. BUILD
   - Configure nodes
   - Set connections
   - Add error handling
   - Write expressions

5. VALIDATE
   - Node validation
   - Workflow validation
   - Expression validation
   - Security check

6. DEPLOY
   - Save to dev
   - Test execution
   - Move to staging
   - Production deploy
```

### Quality Standards

Every workflow MUST have:
- [ ] Descriptive name
- [ ] Error handling
- [ ] Validated nodes
- [ ] Proper credentials references
- [ ] No hardcoded secrets
- [ ] Documentation (notes)

### Output Artifacts

For each workflow development:
1. `workflows/dev/{name}.json` - Workflow file
2. Validation report
3. Deployment instructions
4. Credential requirements list

## Continuous Improvement

### After Each Workflow
- Cache new patterns to `context/workflow-patterns/`
- Save API docs to `context/api-docs/`
- Update knowledge graph with learnings
- Git commit changes

### Periodic Tasks
- Review and update common patterns
- Clean outdated documentation
- Update node version references
- Archive unused workflows
