#!/usr/bin/env node
/**
 * detect-workflow-intent.js
 * Hook: UserPromptSubmit
 *
 * CRITICAL: This hook FORCES deterministic skill invocation for ALL workflow requests.
 * Without this hook, Claude may ignore CLAUDE.md instructions and build workflows ad-hoc.
 *
 * Architecture v2.1:
 * - Detects workflow-related keywords
 * - Detects integrations/apps mentioned in the request (4 categories)
 * - Outputs MANDATORY instruction to invoke Skill("n8n-workflow-dev")
 * - Includes session context AND detected integrations
 * - Fires once per session to avoid repetition
 */

const fs = require('fs');
const path = require('path');
const { logHook, readStdinJson, outputResult, getProjectRoot } = require('./hook-utils');

const projectDir = getProjectRoot();
const stateFile = path.join(projectDir, '.claude', 'logs', 'session-state.json');
const intentFile = path.join(projectDir, '.claude', 'logs', 'intent-fired.json');
const integrationsFile = path.join(projectDir, '.claude', 'logs', 'detected-integrations.json');

// Known apps/integrations database (subset - full detection via n8n-mcp in skill)
const KNOWN_APPS = {
  // CRM
  crm: ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'monday', 'airtable', 'notion', 'close', 'freshsales'],
  // Communication
  communication: ['slack', 'discord', 'telegram', 'twilio', 'sendgrid', 'mailchimp', 'teams', 'ringcentral', 'vonage', 'zoom'],
  // Storage
  storage: ['google drive', 'dropbox', 's3', 'aws', 'azure', 'onedrive', 'box'],
  // Database
  database: ['postgres', 'postgresql', 'mysql', 'mongodb', 'supabase', 'firebase', 'redis'],
  // AI
  ai: ['openai', 'chatgpt', 'gpt', 'anthropic', 'claude', 'gemini', 'huggingface', 'replicate'],
  // Payment
  payment: ['stripe', 'paypal', 'square', 'shopify', 'woocommerce'],
  // Social
  social: ['twitter', 'x.com', 'linkedin', 'facebook', 'instagram', 'youtube', 'tiktok'],
  // Productivity
  productivity: ['google sheets', 'excel', 'asana', 'trello', 'jira', 'clickup', 'basecamp'],
  // Weather/Data
  data: ['openweathermap', 'weather', 'api', 'rest', 'graphql']
};

// Flatten for quick lookup
const ALL_KNOWN_APPS = Object.values(KNOWN_APPS).flat();

// Keyword categories for detection
const WORKFLOW_KEYWORDS = {
  // Strong indicators - definitely workflow related
  strong: [
    'workflow', 'n8n', 'automation', 'automate', 'webhook', 'trigger',
    'cron', 'schedule', 'scheduled', 'api call', 'http request', 'integration',
    // Twilio-specific strong indicators
    'twilio', 'send sms', 'send text', 'text message', 'voice call', 'phone call',
    'whatsapp message', 'mms', 'twiml'
  ],
  // Weak indicators - need multiple or combined with action
  weak: [
    'integrate', 'connect', 'sync', 'pipeline', 'process', 'fetch', 'pull',
    'push', 'notify', 'alert', 'send to slack', 'send email', 'every day',
    'daily', 'hourly', 'whenever', 'automatically', 'agent', 'ai agent',
    'save', 'store', 'log', 'record', 'transfer', 'move', 'copy', 'export',
    'import', 'backup', 'mirror', 'replicate', 'forward', 'route'
  ],
  // Integration patterns - "X to Y" style requests
  integrationPatterns: [
    /from\s+\w+\s+to\s+\w+/i,
    /\w+\s+to\s+\w+/i,
    /\w+\s+into\s+\w+/i,
    /\w+\s+with\s+\w+/i
  ],
  // Action verbs that strengthen weak keywords
  actions: [
    'create', 'build', 'make', 'set up', 'configure', 'design', 'implement',
    'deploy', 'develop', 'construct'
  ],
  // Screenshot/visual indicators
  visual: [
    'screenshot', 'image', 'picture', 'recreate', 'looks like', 'convert this'
  ],
  // Pipeline/middleware indicators - triggers middleware skill
  pipeline: [
    'process audit', 'proposal generation', 'audit report', 'sales engineering',
    'multimodal', 'raw data', 'normalize', 'middleware', 'downstream',
    'upstream', 'ingest', 'context passing', 'data pipeline'
  ]
};

/**
 * Detect if prompt is workflow-related
 */
function detectWorkflowIntent(prompt) {
  const lower = prompt.toLowerCase();

  const strong = WORKFLOW_KEYWORDS.strong.filter(k => lower.includes(k));
  const weak = WORKFLOW_KEYWORDS.weak.filter(k => lower.includes(k));
  const actions = WORKFLOW_KEYWORDS.actions.filter(k => lower.includes(k));
  const visual = WORKFLOW_KEYWORDS.visual.filter(k => lower.includes(k));
  const pipeline = WORKFLOW_KEYWORDS.pipeline.filter(k => lower.includes(k));

  // Check for integration patterns (X to Y, from X to Y)
  const hasIntegrationPattern = WORKFLOW_KEYWORDS.integrationPatterns.some(p => p.test(lower));

  // Count known apps mentioned - if 2+ apps, likely a workflow request
  const appsFound = ALL_KNOWN_APPS.filter(app => lower.includes(app));
  const multipleApps = appsFound.length >= 2;

  // Detection logic:
  // 1. Any pipeline keyword = middleware mode
  // 2. Any strong keyword = workflow
  // 3. 2+ weak keywords = likely workflow
  // 4. 1 weak + 1 action = likely workflow
  // 5. Any visual keyword = screenshot conversion
  // 6. NEW: Integration pattern (X to Y) + 1 weak = workflow
  // 7. NEW: 2+ known apps mentioned = workflow
  const isPipeline = pipeline.length > 0;
  const isWorkflow =
    isPipeline ||
    strong.length > 0 ||
    weak.length >= 2 ||
    (weak.length >= 1 && actions.length >= 1) ||
    visual.length > 0 ||
    (hasIntegrationPattern && weak.length >= 1) ||
    (multipleApps && weak.length >= 1) ||
    multipleApps;  // Two apps mentioned is strong signal

  // Determine which skill to invoke
  const skillToInvoke = isPipeline ? 'n8n-pipeline-middleware' : 'n8n-workflow-dev';

  return {
    isWorkflow,
    isPipeline,
    skillToInvoke,
    confidence: isPipeline ? 'high' : (strong.length > 0 || multipleApps ? 'high' : 'medium'),
    detected: { strong, weak, actions, visual, pipeline, appsFound, hasIntegrationPattern }
  };
}

/**
 * Detect integrations/apps mentioned in the prompt
 * Returns 4 categories per the integration detection system
 */
function detectIntegrations(prompt) {
  const lower = prompt.toLowerCase();
  const words = lower.split(/[\s,.\-_/]+/);

  const detected = {
    definitive: [],   // Explicitly named, matched against known apps
    possible: [],     // Inferred from context keywords
    comparative: [],  // Alternatives in same category
    repos: []         // GitHub/npm packages
  };

  // Step 1: Exact match against known apps (definitive)
  for (const app of ALL_KNOWN_APPS) {
    if (lower.includes(app)) {
      // Find which category this app belongs to
      let category = 'unknown';
      for (const [cat, apps] of Object.entries(KNOWN_APPS)) {
        if (apps.includes(app)) {
          category = cat;
          break;
        }
      }
      detected.definitive.push({
        name: app,
        category,
        confidence: 'high',
        source: 'known-apps-match'
      });
    }
  }

  // Step 2: GitHub/npm pattern matching (repos)
  const repoPatterns = [
    /github\.com\/[\w-]+\/[\w-]+/g,
    /npm:[\w-]+/g,
    /[@][\w-]+\/[\w-]+/g  // Scoped npm packages
  ];
  for (const pattern of repoPatterns) {
    const matches = lower.match(pattern);
    if (matches) {
      detected.repos.push(...matches.map(m => ({
        name: m,
        confidence: 'high',
        source: 'pattern-match'
      })));
    }
  }

  // Step 3: Infer from context keywords (possible)
  const contextInferences = {
    'customer data': ['crm'],
    'send notification': ['communication'],
    'store file': ['storage'],
    'database': ['database'],
    'ai agent': ['ai'],
    'payment': ['payment'],
    'social media': ['social'],
    'spreadsheet': ['productivity']
  };
  for (const [phrase, categories] of Object.entries(contextInferences)) {
    if (lower.includes(phrase)) {
      detected.possible.push({
        trigger: phrase,
        suggestedCategories: categories,
        confidence: 'medium',
        source: 'context-inference'
      });
    }
  }

  // Step 4: Add comparative alternatives for definitive apps
  for (const app of detected.definitive) {
    const categoryApps = KNOWN_APPS[app.category] || [];
    const alternatives = categoryApps.filter(a => a !== app.name).slice(0, 3);
    if (alternatives.length > 0) {
      detected.comparative.push({
        forApp: app.name,
        alternatives,
        category: app.category
      });
    }
  }

  return detected;
}

/**
 * Build the mandatory instruction message
 */
function buildMandatoryMessage(detection, sessionState, integrations) {
  const { confidence, detected, isPipeline, skillToInvoke } = detection;
  const { n8nUp, workflowCount } = sessionState;

  // Build keyword summary
  const pipelineKeywords = detected.pipeline?.map(k => `{${k}}`).join(' ') || '';
  const keywordSummary = [
    pipelineKeywords,
    ...detected.strong.map(k => `[${k}]`),
    ...detected.weak.slice(0, 2).map(k => `(${k})`)
  ].filter(Boolean).join(' ');

  // Pipeline middleware mode
  if (isPipeline) {
    return `
PIPELINE MIDDLEWARE REQUEST DETECTED (${confidence} confidence)
Keywords: ${keywordSummary}

MANDATORY: Invoke Skill("n8n-pipeline-middleware") NOW

This request involves the AI pipeline:
Raw Data → LLM → [n8n Middleware] → Audit Agent → Proposal Agent

The middleware skill handles:
- Ingesting raw/multimodal LLM output
- Normalizing to industry-agnostic schema
- Outputting workflow_context + n8n_node_config
- Error routing for failed transformations

DO NOT:
- Use industry-specific terminology
- Skip the normalization step
- Output without the required schema

NEXT ACTION: Skill("n8n-pipeline-middleware")
`.trim();
  }

  // Build integration summary if detected
  let integrationSummary = '';
  if (integrations) {
    const parts = [];
    if (integrations.definitive.length > 0) {
      parts.push(`Definitive: ${integrations.definitive.map(i => i.name).join(', ')}`);
    }
    if (integrations.possible.length > 0) {
      parts.push(`Possible: ${integrations.possible.map(i => i.trigger || i.suggestedCategories?.join('/')).join(', ')}`);
    }
    if (integrations.repos.length > 0) {
      parts.push(`Repos: ${integrations.repos.map(i => i.name).join(', ')}`);
    }
    if (parts.length > 0) {
      integrationSummary = `\nIntegrations Detected:\n${parts.map(p => `- ${p}`).join('\n')}`;
    }
  }

  // Standard workflow mode
  return `
WORKFLOW REQUEST DETECTED (${confidence} confidence)
Keywords: ${keywordSummary || 'contextual match'}
${integrationSummary}

MANDATORY: Invoke Skill("n8n-workflow-dev") NOW

DO NOT:
- Skip this instruction
- Build workflows manually
- Call MCP tools directly without the skill
- Proceed without invoking the skill

The skill contains the complete protocol:
PHASE 0: INTAKE - Integration detection + registry check + doc retrieval
PHASE 1: CALIBRATE - Search 6 knowledge bases
PHASE 2: DESIGN - Pattern + template analysis
PHASE 3: BUILD - Node config + JSON assembly
PHASE 4: VALIDATE - Iterative validation loop
PHASE 5: TEST - Dev deployment + testing
PHASE 6: DEPLOY - Stage, Production, Git

Session Context:
- n8n Instance: ${n8nUp ? 'Online' : 'Offline (workflows saved locally)'}
- Local Workflows: ${workflowCount}
- Knowledge: YouTube (10,279) | Discord (2,930) | Templates (2,709)
- Detected Integrations File: .claude/logs/detected-integrations.json

NEXT ACTION: Skill("n8n-workflow-dev")
`.trim();
}

async function main() {
  try {
    const data = await readStdinJson();

    // DEBUG: Log the actual data structure received
    logHook('detect-workflow-intent', 'Raw input received', {
      keys: Object.keys(data),
      dataPreview: JSON.stringify(data).slice(0, 500)
    });

    // Try multiple possible field names
    const prompt = (data.user_prompt || data.prompt || data.message || data.content || '').trim();

    // Skip if prompt is too short
    if (!prompt || prompt.length < 10) {
      logHook('detect-workflow-intent', 'Skipped', { reason: 'prompt too short', promptLength: prompt.length });
      process.exit(0);
    }

    // Check if already fired this session
    let alreadyFired = false;
    try {
      const intent = JSON.parse(fs.readFileSync(intentFile, 'utf8'));
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      if (intent.timestamp > state.timestamp) {
        alreadyFired = true;
      }
    } catch {
      // No state yet - first message in session
    }

    // Detect workflow intent
    const detection = detectWorkflowIntent(prompt);

    logHook('detect-workflow-intent', 'Analysis', {
      isWorkflow: detection.isWorkflow,
      confidence: detection.confidence,
      detected: detection.detected,
      alreadyFired,
      promptLength: prompt.length
    });

    // If workflow detected and not already fired
    if (detection.isWorkflow && !alreadyFired) {
      // Read session state for context
      let sessionState = { n8nUp: false, workflowCount: 0 };
      try {
        sessionState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      } catch {
        // Use defaults
      }

      // Detect integrations mentioned in the prompt
      const integrations = detectIntegrations(prompt);

      // Mark as fired for this session
      fs.writeFileSync(intentFile, JSON.stringify({
        timestamp: Date.now(),
        detected: detection.detected,
        confidence: detection.confidence
      }));

      // Save detected integrations for the skill to read
      fs.writeFileSync(integrationsFile, JSON.stringify({
        timestamp: Date.now(),
        prompt_hash: prompt.slice(0, 50),
        integrations
      }, null, 2));

      logHook('detect-workflow-intent', 'Integrations Detected', {
        definitive: integrations.definitive.length,
        possible: integrations.possible.length,
        comparative: integrations.comparative.length,
        repos: integrations.repos.length
      });

      // Output mandatory instruction
      const message = buildMandatoryMessage(detection, sessionState, integrations);

      outputResult({
        continue: true,
        systemMessage: message
      });

      logHook('detect-workflow-intent', 'Triggered', {
        messageLength: message.length,
        confidence: detection.confidence
      });
    }

    process.exit(0);
  } catch (e) {
    logHook('detect-workflow-intent', 'Error', { error: e.message, stack: e.stack });
    // Don't block on errors
    process.exit(0);
  }
}

main();
