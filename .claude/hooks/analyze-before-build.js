#!/usr/bin/env node
/**
 * analyze-before-build.js
 * 
 * This module provides workflow content analysis utilities
 * that can be called from hooks or commands.
 * 
 * Key capability: Analyze actual workflow JSON structure,
 * not just filename matching.
 */

/**
 * Extract analysis from a workflow JSON object
 */
function analyzeWorkflow(workflowJson) {
  const analysis = {
    name: workflowJson.name || 'Unnamed',
    nodeCount: 0,
    nodes: [],
    nodeTypes: new Set(),
    triggerType: null,
    hasErrorHandling: false,
    credentials: [],
    dataFlow: [],
    patterns: []
  };
  
  if (!workflowJson.nodes) {
    analysis.nodeTypes = []; // Convert Set to Array for JSON serialization
    return analysis;
  }
  
  const nodes = workflowJson.nodes;
  analysis.nodeCount = nodes.length;
  
  nodes.forEach(node => {
    // Extract node info
    const nodeInfo = {
      id: node.id,
      name: node.name,
      type: node.type,
      hasErrorHandling: !!node.onError || !!node.continueOnFail
    };
    analysis.nodes.push(nodeInfo);
    analysis.nodeTypes.add(node.type);
    
    // Identify trigger
    if (node.type.includes('Trigger') || node.type.includes('webhook')) {
      analysis.triggerType = node.type;
    }
    
    // Check for error handling
    if (node.type.includes('errorTrigger') || node.onError) {
      analysis.hasErrorHandling = true;
    }
    
    // Extract credentials
    if (node.credentials) {
      Object.keys(node.credentials).forEach(credType => {
        analysis.credentials.push({
          nodeId: node.id,
          type: credType,
          name: node.credentials[credType].name
        });
      });
    }
  });
  
  // Analyze connections for data flow
  if (workflowJson.connections) {
    Object.entries(workflowJson.connections).forEach(([fromNode, outputs]) => {
      if (outputs.main) {
        outputs.main.forEach((connections, outputIndex) => {
          connections.forEach(conn => {
            analysis.dataFlow.push({
              from: fromNode,
              to: conn.node,
              outputIndex
            });
          });
        });
      }
    });
  }
  
  // Convert Set to Array for JSON serialization (must do before identifyPatterns)
  analysis.nodeTypes = Array.from(analysis.nodeTypes);

  // Identify patterns
  analysis.patterns = identifyPatterns(analysis);
  
  return analysis;
}

/**
 * Identify common patterns in workflow
 */
function identifyPatterns(analysis) {
  const patterns = [];
  
  // Webhook → Process → Notify pattern
  if (analysis.triggerType?.includes('webhook')) {
    const hasSlack = analysis.nodeTypes.some(t => t.includes('slack'));
    const hasEmail = analysis.nodeTypes.some(t => t.includes('email') || t.includes('gmail'));
    if (hasSlack || hasEmail) {
      patterns.push('webhook-to-notification');
    }
  }
  
  // Scheduled data sync pattern
  if (analysis.triggerType?.includes('schedule') || analysis.triggerType?.includes('cron')) {
    const hasHttp = analysis.nodeTypes.some(t => t.includes('httpRequest'));
    const hasDb = analysis.nodeTypes.some(t => 
      t.includes('postgres') || t.includes('mysql') || t.includes('mongo')
    );
    if (hasHttp || hasDb) {
      patterns.push('scheduled-data-sync');
    }
  }
  
  // Error handling pattern
  if (analysis.hasErrorHandling) {
    patterns.push('error-handling');
  }
  
  // Batch processing pattern
  if (analysis.nodeTypes.some(t => t.includes('splitInBatches'))) {
    patterns.push('batch-processing');
  }
  
  // Conditional branching pattern
  if (analysis.nodeTypes.some(t => t.includes('.if') || t.includes('.switch'))) {
    patterns.push('conditional-branching');
  }
  
  // AI/LLM pattern (case-insensitive)
  if (analysis.nodeTypes.some(t => {
    const lower = t.toLowerCase();
    return lower.includes('openai') || lower.includes('langchain') || lower.includes('anthropic');
  })) {
    patterns.push('ai-integration');
  }
  
  return patterns;
}

/**
 * Compare workflow to requirements
 */
function matchScore(analysis, requirements) {
  let score = 0;
  let maxScore = 0;
  
  // Check trigger match
  if (requirements.triggerType) {
    maxScore += 30;
    if (analysis.triggerType?.toLowerCase().includes(requirements.triggerType.toLowerCase())) {
      score += 30;
    }
  }
  
  // Check required services
  if (requirements.services) {
    requirements.services.forEach(service => {
      maxScore += 20;
      if (analysis.nodeTypes.some(t => t.toLowerCase().includes(service.toLowerCase()))) {
        score += 20;
      }
    });
  }
  
  // Check patterns
  if (requirements.patterns) {
    requirements.patterns.forEach(pattern => {
      maxScore += 15;
      if (analysis.patterns.includes(pattern)) {
        score += 15;
      }
    });
  }
  
  // Bonus for error handling
  if (analysis.hasErrorHandling) {
    score += 10;
  }
  
  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
}

// Export for use in other scripts
module.exports = {
  analyzeWorkflow,
  identifyPatterns,
  matchScore
};

// CLI usage
if (require.main === module) {
  let input = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', chunk => {
    input += chunk;
  });
  
  process.stdin.on('end', () => {
    try {
      const workflow = JSON.parse(input);
      const analysis = analyzeWorkflow(workflow);
      console.log(JSON.stringify(analysis, null, 2));
    } catch (e) {
      console.error('Error analyzing workflow:', e.message);
      process.exit(1);
    }
  });
}
