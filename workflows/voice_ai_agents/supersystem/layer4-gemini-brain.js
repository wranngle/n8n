/**
 * Layer 4: Gemini LLM Brain
 * 
 * Uses Gemini 2.0 Flash for intelligent failure analysis and fix generation.
 * Supports function calling for automated remediation.
 */

const https = require('https');

const CONFIG = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
  MODEL: 'gemini-2.0-flash-exp',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.3  // Lower for more deterministic fixes
};

/**
 * Available tools for Gemini to call
 */
const TOOLS = [
  {
    name: 'update_elevenlabs_agent',
    description: 'Update ElevenLabs voice agent configuration (prompt, temperature, tools)',
    parameters: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'The agent ID to update' },
        fix_type: { 
          type: 'string', 
          enum: ['TOOL_NOT_CALLED', 'INCONSISTENT_BEHAVIOR', 'CONTEXT_LOST', 'IMPROVE_GREETING'],
          description: 'Type of fix to apply'
        },
        context: { 
          type: 'object', 
          description: 'Additional context for the fix (e.g., missingTool name)'
        }
      },
      required: ['agent_id', 'fix_type']
    }
  },
  {
    name: 'update_n8n_workflow',
    description: 'Update n8n workflow with partial diff operations',
    parameters: {
      type: 'object',
      properties: {
        workflow_id: { type: 'string', description: 'The workflow ID to update' },
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['updateNode', 'addNode', 'removeNode', 'addConnection'] },
              nodeName: { type: 'string' },
              changes: { type: 'object' }
            }
          },
          description: 'Array of diff operations to apply'
        }
      },
      required: ['workflow_id', 'operations']
    }
  },
  {
    name: 'trigger_deep_research',
    description: 'Trigger Layer 6 deep research for unknown or complex issues',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Research query' },
        failure_context: { type: 'string', description: 'Full failure context for research' },
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['youtube', 'discord', 'docs', 'web'] },
          description: 'Which sources to search'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'update_test_data',
    description: 'Update test scenarios or seed data in Layer 3',
    parameters: {
      type: 'object',
      properties: {
        data_type: { type: 'string', enum: ['scenario', 'persona', 'seed_data'] },
        action: { type: 'string', enum: ['add', 'modify', 'remove'] },
        data: { type: 'object', description: 'The data to add/modify' }
      },
      required: ['data_type', 'action', 'data']
    }
  },
  {
    name: 'commit_learning',
    description: 'Commit a learning to the repository via Layer 5',
    parameters: {
      type: 'object',
      properties: {
        learning_type: { 
          type: 'string', 
          enum: ['known_bug', 'pattern', 'skill_update', 'claude_md'],
          description: 'Type of learning to commit'
        },
        title: { type: 'string', description: 'Brief title of the learning' },
        content: { type: 'string', description: 'Full content to commit' },
        file_path: { type: 'string', description: 'Optional specific file path' }
      },
      required: ['learning_type', 'title', 'content']
    }
  }
];

/**
 * Build the analysis prompt
 */
function buildAnalysisPrompt(failureContext) {
  const { 
    scenario, 
    category, 
    expectedTools, 
    actualTools, 
    missingTools,
    unwantedTools,
    turnCount,
    transcript,
    occurrenceCount,
    previousFixes
  } = failureContext;

  return `You are an autonomous AI system analyzer for a voice agent testing framework.

## Failure Details
- Scenario: ${scenario?.name || 'Unknown'}
- Category: ${category || 'Unknown'}
- Expected Tools: ${JSON.stringify(expectedTools || [])}
- Actual Tools Called: ${JSON.stringify(actualTools || [])}
- Missing Tools: ${JSON.stringify(missingTools || [])}
- Unwanted Tools: ${JSON.stringify(unwantedTools || [])}
- Turn Count: ${turnCount || 0}

## Conversation Excerpt (Last 5 Turns)
${formatTranscript(transcript)}

## Historical Context
- This failure has occurred ${occurrenceCount || 1} time(s)
- Previous fixes attempted: ${JSON.stringify(previousFixes || [])}

## Available Layers
1. ElevenLabs Agent (prompt, temperature, tools, knowledge)
2. n8n Workflows (webhook handlers, data processing)
3. Data Layer (test scenarios, personas, seed data)
4. This LLM layer (prompts, analysis)
5. Repository (CLAUDE.md, skills, known-bugs)
6. Deep Research (YouTube, Discord, docs)

## Task
1. Diagnose the root cause of this failure
2. Determine which layer(s) need to be fixed
3. Call the appropriate function(s) to fix the issue
4. If the issue is unknown or complex, trigger deep research

IMPORTANT: Always call at least one function. If uncertain, call trigger_deep_research.`;
}

/**
 * Format transcript for prompt
 */
function formatTranscript(transcript) {
  if (!transcript || !Array.isArray(transcript)) {
    return 'No transcript available';
  }

  const lastTurns = transcript.slice(-10);  // Last 10 messages (5 exchanges)
  return lastTurns.map(t => {
    const role = t.role === 'agent' ? 'Agent' : 'User';
    const content = t.message || t.content || '';
    const toolCall = t.tool_call ? ` [TOOL: ${t.tool_call.tool_name}]` : '';
    return `${role}: ${content}${toolCall}`;
  }).join('\n');
}

/**
 * Call Gemini API with function calling
 */
async function callGemini(prompt) {
  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    tools: [{
      functionDeclarations: TOOLS
    }],
    generationConfig: {
      temperature: CONFIG.TEMPERATURE,
      maxOutputTokens: CONFIG.MAX_TOKENS
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${CONFIG.MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse Gemini response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Extract function calls from Gemini response
 */
function extractFunctionCalls(response) {
  const functionCalls = [];
  
  if (!response.candidates || response.candidates.length === 0) {
    return functionCalls;
  }

  const content = response.candidates[0].content;
  if (!content || !content.parts) {
    return functionCalls;
  }

  for (const part of content.parts) {
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args
      });
    }
  }

  return functionCalls;
}

/**
 * Analyze failure and get remediation strategy
 */
async function analyzeFailure(failureContext) {
  const prompt = buildAnalysisPrompt(failureContext);
  
  try {
    const response = await callGemini(prompt);
    const functionCalls = extractFunctionCalls(response);

    // Also extract any text response
    let textResponse = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          textResponse += part.text;
        }
      }
    }

    return {
      success: true,
      functionCalls,
      textResponse,
      raw: response,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Execute a function call result from Gemini
 * (Delegates to appropriate layer)
 */
async function executeFunctionCall(functionCall, layers) {
  const { name, args } = functionCall;

  switch (name) {
    case 'update_elevenlabs_agent':
      if (layers.layer1) {
        return await layers.layer1.applyFix(args.fix_type, args.agent_id, args.context);
      }
      break;

    case 'update_n8n_workflow':
      if (layers.layer2) {
        return await layers.layer2.applyWorkflowFixes(args.workflow_id, args.operations);
      }
      break;

    case 'trigger_deep_research':
      if (layers.layer6) {
        return await layers.layer6.research(args.query, args.failure_context, args.sources);
      }
      break;

    case 'update_test_data':
      if (layers.layer3) {
        return await layers.layer3.updateData(args.data_type, args.action, args.data);
      }
      break;

    case 'commit_learning':
      if (layers.layer5) {
        return await layers.layer5.commitLearning(args.learning_type, args.title, args.content, args.file_path);
      }
      break;

    default:
      return { success: false, error: `Unknown function: ${name}` };
  }

  return { success: false, error: `Layer not available for function: ${name}` };
}

module.exports = {
  analyzeFailure,
  executeFunctionCall,
  extractFunctionCalls,
  buildAnalysisPrompt,
  TOOLS
};
