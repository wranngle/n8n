# Client Initiation Data - Monitoring Directory

**Purpose:** Real-time monitoring, analytics, and performance tracking for the client initiation data webhook.

---

## Available Tools

### 📊 client-initiation-dashboard.js

**Purpose:** Real-time monitoring and analytics dashboard for webhook performance.

**What It Displays:**
- **Performance Metrics:** Latency percentiles (P50, P95, P99, Min, Max, Mean)
- **Reliability Metrics:** Success rate, error rate, error count
- **Enrichment Metrics:** Enrichment rate, enriched vs. fallback calls
- **Data Source Distribution:** Pipedrive, Sheets, Cache, None (with percentages)
- **Threshold Alerts:** Automated warnings for metrics outside acceptable ranges

**Usage:**
```bash
# Default: Last 24 hours, console output
bun run supersystem/monitoring/client-initiation-dashboard.js

# Custom time range (last 7 days)
bun run supersystem/monitoring/client-initiation-dashboard.js --hours=168

# JSON output (for programmatic access)
bun run supersystem/monitoring/client-initiation-dashboard.js --json

# Alert mode (exit code 1 if thresholds exceeded)
bun run supersystem/monitoring/client-initiation-dashboard.js --alert

# Combined example
bun run supersystem/monitoring/client-initiation-dashboard.js --hours=48 --json > metrics.json
```

**Sample Output:**
```
================================================================================
CLIENT INITIATION DATA - MONITORING DASHBOARD
================================================================================

Time Range: Last 24 hours
Total Executions: 1,247

PERFORMANCE METRICS
────────────────────────────────────────────────────────────────────────────────
  Latency (ms):
    Min:  120ms
    Mean: 345ms
    P50:  298ms
    P95:  421ms ✅
    P99:  567ms
    Max:  689ms

RELIABILITY METRICS
────────────────────────────────────────────────────────────────────────────────
  Success Rate: 99.8% ✅
  Error Rate:   0.2% ✅
  Errors:       3 failures

ENRICHMENT METRICS
────────────────────────────────────────────────────────────────────────────────
  Enrichment Rate: 94.3% ✅
  Enriched Calls:  1,176
  Fallback Calls:  71

DATA SOURCE DISTRIBUTION
────────────────────────────────────────────────────────────────────────────────
  Pipedrive:     856 calls (68.6%)
  Google Sheets: 320 calls (25.7%)
  Cache:         0 calls (0.0%)
  None/Fallback: 71 calls (5.7%)

OVERALL HEALTH
────────────────────────────────────────────────────────────────────────────────
  ✅ All metrics within acceptable thresholds
```

---

## Performance Thresholds

**Defined in Dashboard:**

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| **P95 Latency** | <500ms | Critical | Add Redis caching |
| **Enrichment Rate** | >90% | Warning | Improve CRM data quality |
| **Error Rate** | <5% | Critical | Investigate workflow errors |
| **Min Executions** | >10 | Warning | Need more data for stats |

**Threshold Violations:**
- Dashboard shows warnings inline (⚠️)
- Alert mode returns exit code 1
- Recommended actions provided in output

---

## Data Sources

### n8n API

**Endpoint:** `GET /api/v1/executions`

**What It Fetches:**
- Workflow execution history
- Execution status (success/error)
- Execution metadata (latency, enrichment success, data source)
- Custom metrics from workflow nodes

**Authentication:**
```bash
export N8N_API_KEY="your-n8n-api-key"
export N8N_BASE_URL="https://n8n.wranngle.com"  # Default
```

**Note:** If n8n API is unavailable, dashboard falls back to mock data for demonstration purposes.

---

## Monitoring Workflows

### Daily Health Check

**Morning:**
```bash
# Quick check
bun run client-initiation-dashboard.js --hours=24

# Look for:
# - P95 latency trending upward
# - Error rate spikes
# - Enrichment rate drops
```

### Weekly Performance Review

**Monday morning:**
```bash
# Export last week's metrics
bun run client-initiation-dashboard.js --hours=168 --json > weekly-metrics.json

# Analyze trends
cat weekly-metrics.json | jq '.metrics.performance.latency_ms'

# Compare to baseline
# - Is P95 increasing? (Consider caching)
# - Is enrichment rate dropping? (CRM data quality issue)
# - Is error rate increasing? (API issues)
```

### Continuous Monitoring (CI/CD)

**In CI/CD pipeline:**
```bash
# Run in alert mode
bun run client-initiation-dashboard.js --alert --hours=1

# Exit codes:
# 0 = healthy (metrics within thresholds)
# 1 = unhealthy (one or more thresholds exceeded)

# Example GitHub Actions workflow:
if ! bun run client-initiation-dashboard.js --alert; then
  echo "❌ Metrics outside acceptable ranges!"
  # Send Slack notification
  # Create incident
  exit 1
fi
```

### Post-Deployment Validation

**After deployment:**
```bash
# Wait 1 hour for data
sleep 3600

# Check new deployment health
bun run client-initiation-dashboard.js --hours=1

# Compare to baseline (before deployment)
bun run client-initiation-dashboard.js --hours=25 --json > post-deploy.json
```

---

## Metrics Definitions

### Latency Metrics

**Definition:** Time from webhook trigger to response returned (in milliseconds)

**Calculations:**
- **Min:** Fastest execution in time range
- **Max:** Slowest execution in time range
- **Mean:** Average latency across all executions
- **P50 (Median):** 50% of requests faster than this
- **P95:** 95% of requests faster than this (primary SLA metric)
- **P99:** 99% of requests faster than this

**Why P95 Matters:**
- Captures outliers without being skewed by extreme values
- ElevenLabs recommendation: <500ms for optimal UX
- P99 can be higher due to cold starts, network issues

### Enrichment Metrics

**Enrichment Rate:**
```
enrichment_rate = enriched_count / total_executions
```

**When Enriched:**
- `lookup_success = true` in webhook response
- Caller found in Pipedrive OR Google Sheets
- CRM data successfully merged and returned

**When Fallback:**
- `lookup_success = false`
- Caller not found in either data source
- Generic greeting variables returned

**Target:** >90% enrichment rate

### Data Source Distribution

**Categories:**
- **Pipedrive:** Data found in Pipedrive CRM (highest quality)
- **Sheets:** Data found in Google Sheets (backup source)
- **Cache:** Data served from Redis cache (if enabled)
- **None:** No data found, fallback greeting used

**Healthy Distribution:**
- Pipedrive: 60-80% (primary source)
- Sheets: 10-30% (backup)
- Cache: 0-80% (if Redis enabled)
- None: 5-15% (unknown callers)

---

## Analyzing Trends

### Latency Trending Up

**Symptoms:**
- P95 increasing week-over-week
- P99 consistently >800ms

**Possible Causes:**
1. Pipedrive API slowdown
2. Google Sheets API throttling
3. Increased concurrent requests
4. Network latency

**Actions:**
1. Check Pipedrive/Sheets API status
2. Review n8n execution logs for slow API calls
3. Consider Redis caching
4. See: [Performance Optimization Guide](../../docs/client-initiation-performance-optimization.md)

### Enrichment Rate Dropping

**Symptoms:**
- Enrichment rate <90%
- Increasing "None/Fallback" in data source distribution

**Possible Causes:**
1. Phone numbers not in CRM
2. Phone number format mismatch
3. CRM data quality issues
4. API credential expiration

**Actions:**
1. Verify API credentials in n8n
2. Check phone number format (E.164: +15551234567)
3. Review recent CRM changes
4. Improve CRM data entry processes

### Error Rate Increasing

**Symptoms:**
- Error rate >5%
- Increasing error count

**Possible Causes:**
1. n8n workflow errors
2. API timeouts
3. Invalid webhook requests
4. Network issues

**Actions:**
1. Review n8n execution logs
2. Check API status (Pipedrive, Sheets)
3. Validate webhook contract
4. Increase timeout thresholds (if appropriate)

---

## JSON Export Format

**Schema:**
```json
{
  "metrics": {
    "time_range": {
      "lookback_hours": 24,
      "start": "2026-01-18T12:00:00.000Z",
      "end": "2026-01-19T12:00:00.000Z"
    },
    "total_executions": 1247,
    "performance": {
      "latency_ms": {
        "min": 120,
        "max": 689,
        "mean": 345,
        "p50": 298,
        "p95": 421,
        "p99": 567
      }
    },
    "reliability": {
      "success_rate": 0.998,
      "error_rate": 0.002,
      "error_count": 3
    },
    "enrichment": {
      "enrichment_rate": 0.943,
      "enriched_count": 1176,
      "fallback_count": 71
    },
    "data_sources": {
      "pipedrive": 856,
      "sheets": 320,
      "cache": 0,
      "none": 71,
      "distribution": {
        "pipedrive_pct": "68.6",
        "sheets_pct": "25.7",
        "cache_pct": "0.0",
        "none_pct": "5.7"
      }
    }
  },
  "thresholds": {
    "healthy": true,
    "alerts": []
  }
}
```

**Programmatic Access:**
```bash
# Export to JSON
bun run client-initiation-dashboard.js --json > metrics.json

# Extract specific metrics with jq
cat metrics.json | jq '.metrics.performance.latency_ms.p95'
# Output: 421

# Check if healthy
cat metrics.json | jq '.thresholds.healthy'
# Output: true

# Get all alerts
cat metrics.json | jq '.thresholds.alerts[]'
```

---

## Integration Examples

### Slack Notifications

```bash
#!/bin/bash
# slack-metrics-alert.sh

METRICS=$(bun run client-initiation-dashboard.js --json)
HEALTHY=$(echo "$METRICS" | jq '.thresholds.healthy')

if [ "$HEALTHY" = "false" ]; then
  P95=$(echo "$METRICS" | jq '.metrics.performance.latency_ms.p95')
  ALERTS=$(echo "$METRICS" | jq -r '.thresholds.alerts[] | .message')

  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"⚠️ Client Initiation Webhook Alert\",
      \"attachments\": [{
        \"color\": \"danger\",
        \"fields\": [
          {\"title\": \"P95 Latency\", \"value\": \"${P95}ms\", \"short\": true},
          {\"title\": \"Alerts\", \"value\": \"${ALERTS}\", \"short\": false}
        ]
      }]
    }"
fi
```

### Grafana Dashboard

```bash
# Scheduled export to Grafana
# Cron: */5 * * * * (every 5 minutes)

#!/bin/bash
METRICS=$(bun run client-initiation-dashboard.js --json)

# Send to Grafana via Prometheus pushgateway
echo "$METRICS" | jq -r '
  "client_initiation_p95_latency \(.metrics.performance.latency_ms.p95)",
  "client_initiation_enrichment_rate \(.metrics.enrichment.enrichment_rate)",
  "client_initiation_error_rate \(.metrics.reliability.error_rate)"
' | curl --data-binary @- http://pushgateway:9091/metrics/job/client_initiation
```

---

## Troubleshooting

### Dashboard Shows "No executions found"

**Cause:** No workflow executions in time range or n8n API error

**Fix:**
1. Check if workflow is active in n8n
2. Verify `N8N_API_KEY` is correct
3. Try increasing time range: `--hours=168`
4. Check n8n API endpoint: `${N8N_BASE_URL}/api/v1/executions`

### Dashboard Shows Mock Data

**Cause:** n8n API unreachable or authentication failed

**Fix:**
1. Verify n8n instance is running
2. Check `N8N_API_KEY` environment variable
3. Verify `N8N_BASE_URL` is correct
4. Test API manually:
   ```bash
   curl -H "X-N8N-API-KEY: $N8N_API_KEY" ${N8N_BASE_URL}/api/v1/workflows
   ```

### Metrics Don't Match n8n Logs

**Cause:** Dashboard extracts metrics from specific node output

**Fix:**
1. Ensure "Merge & Transform Data" node includes metadata:
   ```javascript
   metadata: {
     execution_time_ms: latency,
     enrichment_success: enriched,
     data_source: source
   }
   ```
2. Verify workflow structure matches expected format
3. Check n8n API version compatibility

---

## Related Tools

- `../tools/webhook-health-check.js` - Diagnostic testing
- `../tools/deploy-client-initiation.js` - Deployment automation
- `../tools/rollback-client-initiation.js` - Rollback automation

---

## Support

**Documentation:**
- [Master Index](../../CLIENT-INITIATION-INDEX.md)
- [Performance Optimization Guide](../../docs/client-initiation-performance-optimization.md)
- [Quick Reference](../../QUICK-REFERENCE.md)

**Troubleshooting:**
- [Feature Guide - Monitoring Section](../../docs/client-initiation-data-README.md#monitoring)
- [Deployment Guide - Validation](../../docs/client-initiation-deployment-guide.md#phase-4-testing)

---

**Last Updated:** 2026-01-19 | **Version:** 1.0.0
