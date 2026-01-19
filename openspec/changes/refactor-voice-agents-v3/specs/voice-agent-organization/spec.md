# Capability: Voice Agent Organization

## ADDED Requirements

### Requirement: Agent Directory Structure

The voice agent organization SHALL maintain consistent per-agent directory structure.

#### Scenario: Agent directory contents
- **WHEN** a voice agent is created
- **THEN** agent SHALL have dedicated directory under `agents/<agent-name>/`
- **AND** directory SHALL contain: config.json, system-prompt.md, tech-spec.md
- **AND** directory SHALL contain: SETUP.md, tests/scenarios.yaml

#### Scenario: Config file format
- **WHEN** agent config.json is created
- **THEN** file SHALL contain ElevenLabs agent configuration
- **AND** file SHALL include: agent_id, voice_id, model_id, tools array
- **AND** file SHALL NOT embed full system prompt (reference system-prompt.md instead)

#### Scenario: System prompt extraction
- **WHEN** agent is configured
- **THEN** system prompt SHALL be maintained in system-prompt.md
- **AND** prompt SHALL be in markdown format for easy editing
- **AND** config.json SHALL reference the prompt file location

---

### Requirement: Pipeline File Organization

The voice agent organization SHALL centralize n8n workflow files in dedicated directory.

#### Scenario: Pipeline directory structure
- **WHEN** n8n workflow is added
- **THEN** workflow JSON SHALL be placed in `pipelines/` directory
- **AND** workflow SHALL follow naming convention: `kebab-case-descriptive-name.json`

#### Scenario: Pipeline categorization
- **WHEN** workflows are organized
- **THEN** post-call workflows SHALL be prefixed with `elevenlabs-`
- **AND** integration workflows SHALL indicate target system (e.g., `pipedrive-`)
- **AND** utility workflows SHALL have descriptive names

#### Scenario: Pipeline registry
- **WHEN** pipeline is added
- **THEN** agent-registry.yaml SHALL be updated with workflow reference
- **AND** registry SHALL include workflow n8n ID and webhook URL if applicable

---

### Requirement: Template Management

The voice agent organization SHALL maintain reusable templates for new agent creation.

#### Scenario: Template directory
- **WHEN** templates are stored
- **THEN** templates SHALL be in `templates/` directory
- **AND** templates SHALL include: SMS tool template, test scenarios template

#### Scenario: Template usage
- **WHEN** new agent is created
- **THEN** developer SHALL copy relevant templates to agent directory
- **AND** developer SHALL customize templates for specific agent needs

#### Scenario: Template versioning
- **WHEN** templates are updated
- **THEN** existing agents SHALL NOT be affected
- **AND** changes SHALL be documented in template file header

---

### Requirement: Legacy File Archival

The voice agent organization SHALL archive superseded files rather than delete them.

#### Scenario: Archive directory
- **WHEN** files are superseded
- **THEN** files SHALL be moved to `old/` directory
- **AND** original filename SHALL be preserved
- **AND** git history SHALL track the move

#### Scenario: Archive candidates
- **WHEN** file is superseded
- **THEN** candidate types include: old prompt versions, deprecated configs, replaced tools
- **AND** archival reason SHALL be documented in git commit message

#### Scenario: Archive cleanup
- **WHEN** archive grows large
- **THEN** files older than 6 months MAY be permanently deleted
- **AND** deletion SHALL require explicit approval
- **AND** git history SHALL preserve record of deleted files

---

### Requirement: Registry Management

The voice agent organization SHALL maintain agent-registry.yaml as the master index.

#### Scenario: Registry contents
- **WHEN** registry is maintained
- **THEN** registry SHALL include all voice agents with their IDs
- **AND** registry SHALL include agent status (production/development/archived)
- **AND** registry SHALL include phone numbers assigned to each agent

#### Scenario: Registry updates
- **WHEN** agent configuration changes
- **THEN** registry SHALL be updated in same commit
- **AND** registry SHALL reflect current state of all agents

#### Scenario: Registry validation
- **WHEN** registry is modified
- **THEN** all referenced file paths SHALL be verified to exist
- **AND** all agent IDs SHALL be unique
- **AND** all phone numbers SHALL be unique across agents

#### Scenario: Registry search
- **WHEN** developer needs agent information
- **THEN** registry SHALL provide quick reference without reading individual configs
- **AND** registry SHALL include test suite references for each agent
