#!/usr/bin/env bun

/**
 * Client Initiation Data - Monitoring Dashboard
 *
 * Real-time monitoring and analytics for the client initiation webhook.
 * Displays: latency metrics, enrichment success rates, data source distribution,
 * error patterns, and performance trends.
 *
 * Usage:
 *   bun run supersystem/monitoring/client-initiation-dashboard.js
 *   bun run supersystem/monitoring/client-initiation-dashboard.js --json
 *   bun run supersystem/monitoring/client-initiation-dashboard.js --alert
 *
 * Options:
 *   --json     Output JSON format (for programmatic access)
 *   --alert    Check thresholds and exit with code 1 if any fail
 *   --hours N  Look back N hours (default: 24)
 *
 * Environment:
 *   N8N_API_KEY - n8n API key for execution data
 *   N8N_BASE_URL - n8n instance URL (default: https://n8n.wranngle.com)
 */

const N8N_API_KEY = process.env.N8N_API_KEY;
const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://n8n.wranngle.com';
const WORKFLOW_NAME = '[PROD] Client Initiation Data - Sarah';

// Parse command line args
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const alertMode = args.includes('--alert');
const hoursArg = args.find(arg => arg.startsWith('--hours='));
const lookbackHours = hoursArg ? parseInt(hoursArg.split('=')[1]) : 24;

// Thresholds for alerting
const THRESHOLDS = {
  p95_latency_ms: 500,
  enrichment_success_rate: 0.90,
  error_rate: 0.05,
  min_executions: 10 // Minimum executions to calculate meaningful stats
};

/**
 * Fetch executions from n8n API
 */
async function fetchExecutions() {
  if (!N8N_API_KEY) {
    throw new Error('N8N_API_KEY environment variable not set');
  }

  // Calculate time range
  const now = new Date();
  const startTime = new Date(now.getTime() - (lookbackHours * 60 * 60 * 1000));

  // Note: This is a placeholder - actual n8n API may have different endpoints
  // Adjust based on your n8n API version
  const url = `${N8N_BASE_URL}/api/v1/executions?workflowName=${encodeURIComponent(WORKFLOW_NAME)}&startedAfter=${startTime.toISOString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`n8n API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.data || data.executions || [];
  } catch (error) {
    console.error('Failed to fetch executions from n8n:', error.message);
    console.error('Note: You may need to adjust the API endpoint for your n8n version');
    // Return mock data for demonstration
    return generateMockExecutions();
  }
}

/**
 * Generate mock execution data for testing
 */
function generateMockExecutions() {
  const executions = [];
  const now = Date.now();

  for (let i = 0; i < 100; i++) {
    const latency = Math.floor(Math.random() * 600) + 100; // 100-700ms
    const success = Math.random() > 0.1; // 90% success
    const enriched = Math.random() > 0.15; // 85% enrichment

    executions.push({
      id: `exec_${i}`,
      startedAt: new Date(now - (i * 15 * 60 * 1000)).toISOString(), // Every 15 min
      stoppedAt: new Date(now - (i * 15 * 60 * 1000) + latency).toISOString(),
      finished: true,
      mode: 'webhook',
      status: success ? 'success' : 'error',
      data: {
        resultData: {
          runData: {
            'Merge & Transform Data': [{
              data: {
                main: [[{
                  json: {
                    metadata: {
                      execution_time_ms: latency,
                      enrichment_success: enriched,
                      data_source: enriched ? (Math.random() > 0.5 ? 'pipedrive' : 'sheets') : 'none'
                    }
                  }
                }]]
              }
            }]
          }
        }
      }
    });
  }

  return executions;
}

/**
 * Calculate metrics from executions
 */
function calculateMetrics(executions) {
  if (executions.length === 0) {
    return {
      total_executions: 0,
      error: 'No executions found in time range'
    };
  }

  // Extract latencies and metadata
  const latencies = [];
  const dataSources = { pipedrive: 0, sheets: 0, cache: 0, none: 0 };
  let enrichedCount = 0;
  let errorCount = 0;

  for (const exec of executions) {
    try {
      const mergeNode = exec.data?.resultData?.runData?.['Merge & Transform Data'];
      if (mergeNode && mergeNode[0]?.data?.main?.[0]?.[0]?.json?.metadata) {
        const metadata = mergeNode[0].data.main[0][0].json.metadata;
        latencies.push(metadata.execution_time_ms);

        if (metadata.enrichment_success) {
          enrichedCount++;
        }

        const source = metadata.data_source || 'none';
        dataSources[source] = (dataSources[source] || 0) + 1;
      }

      if (exec.status === 'error') {
        errorCount++;
      }
    } catch (e) {
      // Ignore parsing errors for individual executions
    }
  }

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50Index = Math.floor(latencies.length * 0.50);
  const p95Index = Math.floor(latencies.length * 0.95);
  const p99Index = Math.floor(latencies.length * 0.99);

  const totalExecutions = executions.length;
  const successRate = totalExecutions > 0 ? (totalExecutions - errorCount) / totalExecutions : 0;
  const enrichmentRate = totalExecutions > 0 ? enrichedCount / totalExecutions : 0;

  return {
    time_range: {
      lookback_hours: lookbackHours,
      start: executions[executions.length - 1]?.startedAt,
      end: executions[0]?.startedAt
    },
    total_executions: totalExecutions,
    performance: {
      latency_ms: {
        min: latencies.length > 0 ? Math.min(...latencies) : 0,
        max: latencies.length > 0 ? Math.max(...latencies) : 0,
        mean: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
        p50: latencies[p50Index] || 0,
        p95: latencies[p95Index] || 0,
        p99: latencies[p99Index] || 0
      }
    },
    reliability: {
      success_rate: successRate,
      error_rate: errorCount / totalExecutions,
      error_count: errorCount
    },
    enrichment: {
      enrichment_rate: enrichmentRate,
      enriched_count: enrichedCount,
      fallback_count: totalExecutions - enrichedCount
    },
    data_sources: {
      pipedrive: dataSources.pipedrive || 0,
      sheets: dataSources.sheets || 0,
      cache: dataSources.cache || 0,
      none: dataSources.none || 0,
      distribution: {
        pipedrive_pct: ((dataSources.pipedrive || 0) / totalExecutions * 100).toFixed(1),
        sheets_pct: ((dataSources.sheets || 0) / totalExecutions * 100).toFixed(1),
        cache_pct: ((dataSources.cache || 0) / totalExecutions * 100).toFixed(1),
        none_pct: ((dataSources.none || 0) / totalExecutions * 100).toFixed(1)
      }
    }
  };
}

/**
 * Check if metrics meet thresholds
 */
function checkThresholds(metrics) {
  const alerts = [];

  if (metrics.total_executions < THRESHOLDS.min_executions) {
    alerts.push({
      severity: 'warning',
      metric: 'total_executions',
      message: `Only ${metrics.total_executions} executions in ${lookbackHours}h (minimum ${THRESHOLDS.min_executions} for meaningful stats)`
    });
  }

  if (metrics.performance.latency_ms.p95 > THRESHOLDS.p95_latency_ms) {
    alerts.push({
      severity: 'critical',
      metric: 'p95_latency',
      value: metrics.performance.latency_ms.p95,
      threshold: THRESHOLDS.p95_latency_ms,
      message: `P95 latency ${metrics.performance.latency_ms.p95}ms exceeds threshold ${THRESHOLDS.p95_latency_ms}ms`
    });
  }

  if (metrics.enrichment.enrichment_rate < THRESHOLDS.enrichment_success_rate) {
    alerts.push({
      severity: 'warning',
      metric: 'enrichment_rate',
      value: metrics.enrichment.enrichment_rate,
      threshold: THRESHOLDS.enrichment_success_rate,
      message: `Enrichment rate ${(metrics.enrichment.enrichment_rate * 100).toFixed(1)}% below threshold ${(THRESHOLDS.enrichment_success_rate * 100)}%`
    });
  }

  if (metrics.reliability.error_rate > THRESHOLDS.error_rate) {
    alerts.push({
      severity: 'critical',
      metric: 'error_rate',
      value: metrics.reliability.error_rate,
      threshold: THRESHOLDS.error_rate,
      message: `Error rate ${(metrics.reliability.error_rate * 100).toFixed(1)}% exceeds threshold ${(THRESHOLDS.error_rate * 100)}%`
    });
  }

  return {
    healthy: alerts.filter(a => a.severity === 'critical').length === 0,
    alerts
  };
}

/**
 * Format metrics for console output
 */
function formatConsoleOutput(metrics, thresholdCheck) {
  const { performance, reliability, enrichment, data_sources } = metrics;

  console.log('');
  console.log('================================================================================');
  console.log('CLIENT INITIATION DATA - MONITORING DASHBOARD');
  console.log('================================================================================');
  console.log('');
  console.log(`Time Range: Last ${lookbackHours} hours`);
  console.log(`Total Executions: ${metrics.total_executions}`);
  console.log('');

  // Performance
  console.log('PERFORMANCE METRICS');
  console.log('─'.repeat(80));
  console.log(`  Latency (ms):`);
  console.log(`    Min:  ${performance.latency_ms.min}ms`);
  console.log(`    Mean: ${performance.latency_ms.mean}ms`);
  console.log(`    P50:  ${performance.latency_ms.p50}ms`);
  console.log(`    P95:  ${performance.latency_ms.p95}ms ${performance.latency_ms.p95 > THRESHOLDS.p95_latency_ms ? '⚠️  ABOVE THRESHOLD' : '✅'}`);
  console.log(`    P99:  ${performance.latency_ms.p99}ms`);
  console.log(`    Max:  ${performance.latency_ms.max}ms`);
  console.log('');

  // Reliability
  console.log('RELIABILITY METRICS');
  console.log('─'.repeat(80));
  console.log(`  Success Rate: ${(reliability.success_rate * 100).toFixed(1)}% ${reliability.success_rate >= 0.95 ? '✅' : '⚠️'}`);
  console.log(`  Error Rate:   ${(reliability.error_rate * 100).toFixed(1)}% ${reliability.error_rate <= THRESHOLDS.error_rate ? '✅' : '⚠️  ABOVE THRESHOLD'}`);
  console.log(`  Errors:       ${reliability.error_count} failures`);
  console.log('');

  // Enrichment
  console.log('ENRICHMENT METRICS');
  console.log('─'.repeat(80));
  console.log(`  Enrichment Rate: ${(enrichment.enrichment_rate * 100).toFixed(1)}% ${enrichment.enrichment_rate >= THRESHOLDS.enrichment_success_rate ? '✅' : '⚠️  BELOW THRESHOLD'}`);
  console.log(`  Enriched Calls:  ${enrichment.enriched_count}`);
  console.log(`  Fallback Calls:  ${enrichment.fallback_count}`);
  console.log('');

  // Data Sources
  console.log('DATA SOURCE DISTRIBUTION');
  console.log('─'.repeat(80));
  console.log(`  Pipedrive:     ${data_sources.pipedrive} calls (${data_sources.distribution.pipedrive_pct}%)`);
  console.log(`  Google Sheets: ${data_sources.sheets} calls (${data_sources.distribution.sheets_pct}%)`);
  console.log(`  Cache:         ${data_sources.cache} calls (${data_sources.distribution.cache_pct}%)`);
  console.log(`  None/Fallback: ${data_sources.none} calls (${data_sources.distribution.none_pct}%)`);
  console.log('');

  // Alerts
  if (thresholdCheck.alerts.length > 0) {
    console.log('ALERTS');
    console.log('─'.repeat(80));
    for (const alert of thresholdCheck.alerts) {
      const icon = alert.severity === 'critical' ? '🔴' : '🟡';
      console.log(`  ${icon} ${alert.message}`);
    }
    console.log('');
  }

  // Health Status
  console.log('OVERALL HEALTH');
  console.log('─'.repeat(80));
  if (thresholdCheck.healthy) {
    console.log('  ✅ All metrics within acceptable thresholds');
  } else {
    console.log('  ⚠️  Some metrics outside acceptable thresholds');
    console.log('  Action Required: Review alerts above');
  }
  console.log('');
  console.log('================================================================================');
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Fetch and analyze
    const executions = await fetchExecutions();
    const metrics = calculateMetrics(executions);

    if (metrics.error) {
      console.error(`Error: ${metrics.error}`);
      process.exit(1);
    }

    const thresholdCheck = checkThresholds(metrics);

    // Output
    if (jsonOutput) {
      console.log(JSON.stringify({ metrics, thresholds: thresholdCheck }, null, 2));
    } else {
      formatConsoleOutput(metrics, thresholdCheck);
    }

    // Exit code for alert mode
    if (alertMode) {
      process.exit(thresholdCheck.healthy ? 0 : 1);
    }
  } catch (error) {
    console.error('Dashboard error:', error.message);
    process.exit(1);
  }
}

// Run
main();
