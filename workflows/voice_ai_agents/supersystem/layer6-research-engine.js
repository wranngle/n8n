/**
 * Layer 6: Deep Research Engine
 * 
 * Triggers after 2 occurrences of the same failure pattern.
 * Searches across:
 * - n8n methodology MCP (YouTube: 10,279 / Discord: 2,930)
 * - Context7 real-time documentation
 * - Web search for edge cases
 */

const https = require('https');

const CONFIG = {
  // MCP endpoints would normally be called through the MCP protocol
  // For standalone operation, we use direct API calls
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
  EXA_API_KEY: process.env.EXA_API_KEY,
  TRIGGER_THRESHOLD: 2  // Trigger after 2 occurrences
};

/**
 * Search n8n methodology knowledge base
 * In production, this would call mcp__n8n-methodology__search_knowledge
 */
async function searchN8nKnowledge(query, sources = ['youtube', 'discord'], limit = 10) {
  console.log(`[Layer6] Searching n8n knowledge: "${query}" in ${sources.join(', ')}`);
  
  // This would normally call the MCP tool
  // For now, return placeholder structure
  return {
    youtube: [],
    discord: [],
    query,
    sources,
    note: 'MCP call required - run from Claude Code context'
  };
}

/**
 * Search with Exa API
 */
async function searchExa(query, numResults = 5) {
  if (!CONFIG.EXA_API_KEY) {
    console.log('[Layer6] EXA_API_KEY not set, skipping Exa search');
    return { results: [], error: 'API key not configured' };
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      query,
      numResults,
      useAutoprompt: true,
      type: 'neural'
    });

    const options = {
      hostname: 'api.exa.ai',
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.EXA_API_KEY
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve({ results: [], error: 'Failed to parse response' });
        }
      });
    });

    req.on('error', e => resolve({ results: [], error: e.message }));
    req.write(postData);
    req.end();
  });
}

/**
 * Search Google Custom Search (for official docs)
 */
async function searchGoogle(query, site = null) {
  // Would use Google Custom Search API
  console.log(`[Layer6] Google search: "${query}"${site ? ` site:${site}` : ''}`);
  return { results: [], note: 'Google CSE API required' };
}

/**
 * Build research query from failure context
 */
function buildResearchQuery(failureContext) {
  const { scenario, category, missingTools, errorMessage } = failureContext;
  
  const parts = [];
  
  // Add core topic
  if (missingTools?.length > 0) {
    parts.push(`ElevenLabs voice agent ${missingTools[0]} tool`);
  } else if (errorMessage) {
    parts.push(`n8n ${errorMessage.split(':')[0]}`);
  } else if (category) {
    parts.push(`voice agent ${category}`);
  }
  
  // Add context
  parts.push('best practices');
  
  return parts.join(' ');
}

/**
 * Synthesize research findings into actionable insights
 */
function synthesizeFindings(n8nResults, exaResults, googleResults) {
  const insights = [];
  
  // Extract from n8n knowledge
  if (n8nResults.youtube?.length > 0) {
    insights.push({
      source: 'youtube',
      type: 'tutorial',
      items: n8nResults.youtube.slice(0, 3).map(v => ({
        title: v.title,
        url: v.url,
        relevance: v.score || 0.8
      }))
    });
  }

  if (n8nResults.discord?.length > 0) {
    insights.push({
      source: 'discord',
      type: 'community_qa',
      items: n8nResults.discord.slice(0, 3).map(q => ({
        question: q.question,
        answer: q.answer,
        relevance: q.score || 0.7
      }))
    });
  }

  // Extract from Exa
  if (exaResults.results?.length > 0) {
    insights.push({
      source: 'web',
      type: 'documentation',
      items: exaResults.results.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
        snippet: r.text?.slice(0, 200),
        relevance: r.score || 0.6
      }))
    });
  }

  // Generate recommendation
  const recommendation = generateRecommendation(insights);
  
  return {
    insights,
    recommendation,
    totalSources: insights.reduce((sum, i) => sum + i.items.length, 0),
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate actionable recommendation from insights
 */
function generateRecommendation(insights) {
  if (insights.length === 0) {
    return {
      action: 'manual_investigation',
      confidence: 0.2,
      message: 'No relevant resources found. Manual investigation required.'
    };
  }

  // Check for high-confidence tutorials
  const tutorials = insights.find(i => i.source === 'youtube');
  if (tutorials?.items.length > 0) {
    return {
      action: 'follow_tutorial',
      confidence: 0.8,
      message: `Found ${tutorials.items.length} relevant tutorials. Recommend reviewing: ${tutorials.items[0].title}`,
      resources: tutorials.items
    };
  }

  // Check for community solutions
  const community = insights.find(i => i.source === 'discord');
  if (community?.items.length > 0) {
    return {
      action: 'apply_community_solution',
      confidence: 0.7,
      message: `Found ${community.items.length} community discussions with potential solutions.`,
      resources: community.items
    };
  }

  // Fall back to documentation
  const docs = insights.find(i => i.source === 'web');
  if (docs?.items.length > 0) {
    return {
      action: 'review_documentation',
      confidence: 0.6,
      message: `Found ${docs.items.length} documentation resources.`,
      resources: docs.items
    };
  }

  return {
    action: 'manual_investigation',
    confidence: 0.3,
    message: 'Limited resources found. Consider manual investigation.'
  };
}

/**
 * Main research function
 * Called by Layer 4 Gemini when trigger_deep_research function is invoked
 */
async function research(query, failureContext = '', sources = ['youtube', 'discord', 'docs', 'web']) {
  console.log(`\n[Layer6] Deep Research Triggered`);
  console.log(`[Layer6] Query: "${query}"`);
  console.log(`[Layer6] Sources: ${sources.join(', ')}`);

  const results = {
    query,
    sources: {},
    timestamp: new Date().toISOString()
  };

  // Search n8n methodology knowledge (YouTube + Discord)
  if (sources.includes('youtube') || sources.includes('discord')) {
    const n8nSources = sources.filter(s => ['youtube', 'discord'].includes(s));
    results.sources.n8nKnowledge = await searchN8nKnowledge(query, n8nSources);
  }

  // Search web with Exa
  if (sources.includes('web') || sources.includes('docs')) {
    results.sources.exa = await searchExa(`${query} ElevenLabs n8n voice agent`, 5);
  }

  // Synthesize findings
  const synthesis = synthesizeFindings(
    results.sources.n8nKnowledge || {},
    results.sources.exa || {},
    {}
  );

  return {
    success: true,
    ...results,
    synthesis,
    recommendation: synthesis.recommendation
  };
}

/**
 * Check if research should be triggered
 */
function shouldTriggerResearch(occurrenceCount) {
  return occurrenceCount >= CONFIG.TRIGGER_THRESHOLD;
}

/**
 * Format research results for logging
 */
function formatResearchResults(results) {
  let output = `## Deep Research Results\n\n`;
  output += `**Query**: ${results.query}\n`;
  output += `**Timestamp**: ${results.timestamp}\n\n`;

  if (results.synthesis?.insights) {
    output += `### Insights Found: ${results.synthesis.totalSources}\n\n`;
    
    for (const insight of results.synthesis.insights) {
      output += `#### ${insight.source} (${insight.type})\n`;
      for (const item of insight.items) {
        output += `- ${item.title || item.question}\n`;
        if (item.url) output += `  ${item.url}\n`;
      }
      output += '\n';
    }
  }

  if (results.recommendation) {
    output += `### Recommendation\n`;
    output += `**Action**: ${results.recommendation.action}\n`;
    output += `**Confidence**: ${(results.recommendation.confidence * 100).toFixed(0)}%\n`;
    output += `**Message**: ${results.recommendation.message}\n`;
  }

  return output;
}

module.exports = {
  research,
  searchN8nKnowledge,
  searchExa,
  buildResearchQuery,
  synthesizeFindings,
  shouldTriggerResearch,
  formatResearchResults,
  CONFIG
};
