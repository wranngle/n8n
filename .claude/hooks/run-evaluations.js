/**
 * Evaluation Pipeline Hook
 * 
 * Detects evaluation-related requests and provides guidance
 * for running the parallel evaluation pipeline.
 * 
 * Workflow: [DEV] Supersystem - Parallel Evaluation Runner v6
 * ID: M7ZmLGCxyVOn5QJ6
 * 
 * Performance benchmarks:
 * - 100 tests: ~7 seconds (72ms avg)
 * - 1000 tests: ~59 seconds (59ms avg)
 * - Throughput: ~17 tests/second
 */

const EVAL_TRIGGERS = [
  /run\s*(the\s+)?eval/i,
  /test\s*pipeline/i,
  /evaluation\s*run/i,
  /run\s*(the\s+)?tests/i,
  /execute\s*(the\s+)?evaluations/i,
  /trigger\s*(the\s+)?eval/i,
  /start\s*(the\s+)?evaluation/i
];

function matchesEvalRequest(userMessage) {
  return EVAL_TRIGGERS.some(pattern => pattern.test(userMessage));
}

module.exports = async function(context) {
  const { hook_type, user_prompt } = context;
  
  // Only process on UserPromptSubmit
  if (hook_type !== 'UserPromptSubmit') {
    return { decision: 'allow' };
  }
  
  if (!matchesEvalRequest(user_prompt || '')) {
    return { decision: 'allow' };
  }
  
  // User is requesting evaluations - provide structured guidance
  return {
    decision: 'allow',
    systemMessage: `
## EVALUATION PIPELINE DETECTED

Use MCP tool to trigger evaluations:

\`\`\`
mcp__n8n-mcp__n8n_trigger_webhook_workflow({
  webhookUrl: "https://n8n.wranngle.com/webhook/parallel-eval-runner-v6",
  httpMethod: "POST",
  data: { limit: 1000, batch_size: 50 },
  waitForResponse: true
})
\`\`\`

### Expected Performance
| Tests | Time | Batch Size |
|-------|------|------------|
| 100 | ~7s | 10 |
| 1000 | ~60s | 50 |
| 10000 | ~10m | 100 |

### Response Format
\`\`\`json
{
  "summary": {
    "total_tests": 1000,
    "passed": N,
    "failed": N,
    "pass_rate": "X.X%",
    "avg_latency_ms": N
  },
  "needs_autocorrection": boolean
}
\`\`\`
`
  };
};
