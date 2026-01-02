/**
 * Layer 1: ElevenLabs Agent Auto-Modifier
 *
 * Automatically modifies ElevenLabs agent configuration based on failure analysis.
 * Uses PATCH /v1/convai/agents/{agent_id} API.
 *
 * TRACKS ALL MODIFICATIONS in data/agent-modifications.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  BASE_URL: 'api.elevenlabs.io',
  DEFAULT_AGENT_ID: 'agent_8001kdgp7qbyf4wvhs540be78vew',
  MODIFICATIONS_LOG: path.join(__dirname, 'data', 'agent-modifications.json')
};

/**
 * Log a modification to the persistent log
 */
function logModification(agentId, pattern, before, after, success) {
  try {
    const logPath = CONFIG.MODIFICATIONS_LOG;
    const dir = path.dirname(logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let log = { modifications: [] };
    if (fs.existsSync(logPath)) {
      log = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }

    log.modifications.push({
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      pattern: pattern,
      before_prompt_length: before?.length || 0,
      after_prompt_length: after?.length || 0,
      prompt_diff: after && before ? after.length - before.length : 0,
      success: success,
      before_snippet: before ? before.slice(-200) : null,
      after_snippet: after ? after.slice(-200) : null
    });

    log.last_updated = new Date().toISOString();
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2));

    console.log(`[Layer1] MODIFICATION LOGGED: ${pattern} (success: ${success})`);
    return true;
  } catch (e) {
    console.error(`[Layer1] Failed to log modification: ${e.message}`);
    return false;
  }
}

/**
 * Make HTTPS request to ElevenLabs API
 */
function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: CONFIG.BASE_URL,
      path: path,
      method: method,
      headers: {
        'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Get current agent configuration
 */
async function getAgent(agentId = CONFIG.DEFAULT_AGENT_ID) {
  const result = await apiRequest('GET', `/v1/convai/agents/${agentId}`);
  if (result.status !== 200) {
    throw new Error(`Failed to get agent: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

/**
 * Update agent configuration
 */
async function updateAgent(agentId, updates) {
  const result = await apiRequest('PATCH', `/v1/convai/agents/${agentId}`, updates);
  if (result.status !== 200) {
    throw new Error(`Failed to update agent: ${JSON.stringify(result.data)}`);
  }
  return result.data;
}

/**
 * Auto-fix patterns based on failure analysis
 */
const AUTO_FIX_PATTERNS = {
  // Tool not being called when expected
  TOOL_NOT_CALLED: async (agentId, context) => {
    const agent = await getAgent(agentId);
    const currentPrompt = agent.conversation_config?.agent?.prompt?.prompt || '';
    const toolName = context.missingTool || 'send_sms';

    // Build reinforcement instruction with timestamp to ensure uniqueness
    const timestamp = new Date().toISOString().slice(0, 16);
    const promptAddition = `\n\n[SUPERSYSTEM-FIX ${timestamp}] CRITICAL: When caller provides phone and agrees to receive SMS, IMMEDIATELY call ${toolName}. Do NOT wait or confirm.`;

    // ALWAYS apply the fix (removed skip condition - we want to reinforce)
    const newPrompt = currentPrompt + promptAddition;

    console.log(`[Layer1] Applying TOOL_NOT_CALLED fix for ${toolName}`);
    console.log(`[Layer1] Current prompt length: ${currentPrompt.length}`);
    console.log(`[Layer1] New prompt length: ${newPrompt.length}`);

    try {
      const result = await updateAgent(agentId, {
        conversation_config: {
          agent: {
            prompt: {
              prompt: newPrompt
            }
          }
        }
      });

      // Log the modification
      logModification(agentId, 'TOOL_NOT_CALLED', currentPrompt, newPrompt, true);

      return { applied: true, tool: toolName, promptDelta: promptAddition.length, result };
    } catch (error) {
      logModification(agentId, 'TOOL_NOT_CALLED', currentPrompt, null, false);
      throw error;
    }
  },

  // Temperature too high causing inconsistent behavior
  INCONSISTENT_BEHAVIOR: async (agentId, context) => {
    const agent = await getAgent(agentId);
    const currentTemp = agent.conversation_config?.agent?.prompt?.temperature || 0.8;
    
    if (currentTemp > 0.5) {
      return await updateAgent(agentId, {
        conversation_config: {
          agent: {
            prompt: {
              temperature: currentTemp - 0.1
            }
          }
        }
      });
    }
    return { skipped: true, reason: 'Temperature already low' };
  },

  // Context lost during conversation
  CONTEXT_LOST: async (agentId, context) => {
    const agent = await getAgent(agentId);
    const currentMaxTokens = agent.conversation_config?.agent?.prompt?.max_tokens || 500;
    
    return await updateAgent(agentId, {
      conversation_config: {
        agent: {
          prompt: {
            max_tokens: Math.min(currentMaxTokens + 200, 2000)
          }
        }
      }
    });
  },

  // Add knowledge to agent
  ADD_KNOWLEDGE: async (agentId, context) => {
    // This would add to knowledge base - requires doc upload first
    console.log(`[Layer1] Knowledge addition requested for: ${context.topic}`);
    return { skipped: true, reason: 'Knowledge base updates require document upload' };
  },

  // Adjust first message
  IMPROVE_GREETING: async (agentId, context) => {
    return await updateAgent(agentId, {
      conversation_config: {
        agent: {
          first_message: context.newGreeting || "Hi! Thanks for calling Wranngle. I'm Sarah, your AI assistant. How can I help you today?"
        }
      }
    });
  }
};

/**
 * Apply auto-fix based on failure pattern
 */
async function applyFix(pattern, agentId, context = {}) {
  const fixFn = AUTO_FIX_PATTERNS[pattern];
  if (!fixFn) {
    return { success: false, error: `Unknown pattern: ${pattern}` };
  }

  try {
    const result = await fixFn(agentId, context);
    return { 
      success: true, 
      pattern, 
      result,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { 
      success: false, 
      pattern, 
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Diagnose failure and suggest fix pattern
 */
function diagnoseFailure(failureContext) {
  const { missingTools, turnCount, category, analysis } = failureContext;

  // Tool not called
  if (missingTools && missingTools.length > 0) {
    return {
      pattern: 'TOOL_NOT_CALLED',
      context: { missingTool: missingTools[0] },
      confidence: 0.9
    };
  }

  // Short conversation might indicate context issues
  if (turnCount < 4) {
    return {
      pattern: 'CONTEXT_LOST',
      context: {},
      confidence: 0.6
    };
  }

  // Category-specific diagnosis
  if (category === 'error_recovery') {
    return {
      pattern: 'INCONSISTENT_BEHAVIOR',
      context: {},
      confidence: 0.7
    };
  }

  return {
    pattern: null,
    context: {},
    confidence: 0
  };
}

module.exports = {
  getAgent,
  updateAgent,
  applyFix,
  diagnoseFailure,
  AUTO_FIX_PATTERNS: Object.keys(AUTO_FIX_PATTERNS)
};
