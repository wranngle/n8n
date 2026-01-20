# Client Initiation Data - Tools Directory

**Purpose:** Operational utilities for deployment, monitoring, and rollback of the client initiation data webhook.

---

## Available Tools

### 🚀 deploy-client-initiation.js

**Purpose:** Automated deployment of the client initiation data webhook system.

**What It Does:**
- Deploys n8n workflow to production
- Configures ElevenLabs agent with dynamic variables
- Verifies credentials and configuration
- Runs validation tests
- Provides deployment summary

**Usage:**
```bash
# Standard deployment
bun run supersystem/tools/deploy-client-initiation.js

# Dry run (see what would happen)
bun run supersystem/tools/deploy-client-initiation.js --dry-run

# Skip n8n deployment
bun run supersystem/tools/deploy-client-initiation.js --skip-n8n

# Skip ElevenLabs configuration
bun run supersystem/tools/deploy-client-initiation.js --skip-elevenlabs

# Force (skip confirmation prompts)
bun run supersystem/tools/deploy-client-initiation.js --force
```

**Prerequisites:**
- `N8N_API_KEY` environment variable
- `ELEVENLABS_API_KEY` environment variable
- n8n instance accessible
- Pipedrive and Google Sheets credentials configured in n8n

**Time:** 2-3 hours (first deployment)

**Documentation:** [Deployment Guide](../../docs/client-initiation-deployment-guide.md)

---

### 🔄 rollback-client-initiation.js

**Purpose:** Automated rollback to pre-enhancement state.

**What It Does:**
- Creates backup of current state
- Deactivates n8n workflow
- Optionally removes ElevenLabs webhook configuration
- Optionally removes dynamic variables
- Verifies rollback success

**Usage:**
```bash
# Partial rollback (workflow only, recommended)
bun run supersystem/tools/rollback-client-initiation.js

# Full rollback (remove all configuration)
bun run supersystem/tools/rollback-client-initiation.js --full

# Dry run
bun run supersystem/tools/rollback-client-initiation.js --dry-run

# Force (skip prompts)
bun run supersystem/tools/rollback-client-initiation.js --force

# Keep data but deactivate
bun run supersystem/tools/rollback-client-initiation.js --keep-data
```

**Rollback Levels:**
- **Level 1 (Default):** Deactivate n8n workflow only (instant, reversible)
- **Level 2 (--full):** Deactivate + remove ElevenLabs webhook config
- **Level 3 (--full):** Level 2 + remove dynamic variables

**Time:** <1 minute

**Recovery:** Re-run deployment script to restore

---

### 🏥 webhook-health-check.js

**Purpose:** Quick diagnostic tool for webhook validation and performance testing.

**What It Does:**
- Tests webhook connectivity
- Verifies response format
- Checks data quality
- Measures performance (P95 latency)
- Tests error handling
- Validates graceful degradation

**Usage:**
```bash
# Standard health check
bun run supersystem/tools/webhook-health-check.js

# Quick check (skip performance tests)
bun run supersystem/tools/webhook-health-check.js --quick

# Verbose output (show detailed request/response)
bun run supersystem/tools/webhook-health-check.js --verbose

# Test specific phone number
bun run supersystem/tools/webhook-health-check.js --phone=+15551234567
```

**Test Suite:**
1. ✅ Connectivity (200 OK)
2. ✅ Response Format (correct structure)
3. ✅ Data Quality (correct types)
4. ✅ Invalid Agent Rejection (400 error)
5. ✅ Enrichment Fallback (unknown caller)
6. ✅ Performance (10 requests, P95 latency)
7. ✅ Concurrency (5 parallel requests)

**Time:** 30 seconds (quick), 2 minutes (full)

**Exit Codes:**
- `0` = All tests passed
- `1` = One or more tests failed

---

## Environment Variables

All tools require:

```bash
export N8N_API_KEY="your-n8n-api-key"
export ELEVENLABS_API_KEY="your-elevenlabs-api-key"

# Optional
export N8N_BASE_URL="https://n8n.wranngle.com"  # Default
export WEBHOOK_URL="https://n8n.wranngle.com/webhook/client-initiation-data"  # Default
```

---

## Common Workflows

### First-Time Deployment
```bash
# 1. Review prerequisites
cat ../../docs/client-initiation-deployment-guide.md

# 2. Deploy (dry run first)
bun run deploy-client-initiation.js --dry-run

# 3. Deploy for real
bun run deploy-client-initiation.js

# 4. Validate
bun run webhook-health-check.js

# 5. Monitor
bun run ../monitoring/client-initiation-dashboard.js
```

### Daily Health Check
```bash
# Quick validation
bun run webhook-health-check.js --quick

# If issues found
bun run ../monitoring/client-initiation-dashboard.js
```

### Emergency Rollback
```bash
# 1. Rollback (dry run first)
bun run rollback-client-initiation.js --dry-run

# 2. Rollback for real
bun run rollback-client-initiation.js

# 3. Verify
curl -X POST https://n8n.wranngle.com/webhook/client-initiation-data
# Should return 404 or error

# 4. Agent should use generic greetings immediately
```

### Recovery After Rollback
```bash
# Re-deploy
bun run deploy-client-initiation.js

# Verify
bun run webhook-health-check.js
```

---

## Tool Development

### Adding a New Tool

**File Structure:**
```javascript
#!/usr/bin/env bun

/**
 * Tool Name - Brief Description
 *
 * Detailed description of what this tool does.
 *
 * Usage:
 *   bun run supersystem/tools/tool-name.js
 *   bun run supersystem/tools/tool-name.js --option
 *
 * Options:
 *   --option  Description
 */

// Parse args
const args = process.argv.slice(2);

// Main logic
async function main() {
  // Implementation
}

// Run
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
```

**Checklist:**
- [ ] Shebang line: `#!/usr/bin/env bun`
- [ ] JSDoc header with usage examples
- [ ] Command-line argument parsing
- [ ] Error handling with exit codes
- [ ] Logging with emoji indicators (✅, ❌, ⚠️)
- [ ] Dry-run mode support
- [ ] Documentation in this README

---

## Related Directories

- `../monitoring/` - Real-time monitoring and analytics
- `../tests/` - Test suites and test data generators
- `../../docs/` - User documentation
- `../../temp/` - Temporary files and backups

---

## Troubleshooting

### Tool Fails with "N8N_API_KEY not set"
```bash
# Set environment variable
export N8N_API_KEY="your-api-key"

# Or create .env file in project root
echo "N8N_API_KEY=your-api-key" >> .env
```

### Tool Fails with "ELEVENLABS_API_KEY not set"
```bash
export ELEVENLABS_API_KEY="your-api-key"
```

### Health Check Shows High Latency
```bash
# Check monitoring dashboard
bun run ../monitoring/client-initiation-dashboard.js

# Consider optimization
cat ../../docs/client-initiation-performance-optimization.md
```

### Deployment Fails
```bash
# Check n8n credentials
# Check workflow file exists
ls ../client-initiation-data-prod.json

# Try dry-run mode
bun run deploy-client-initiation.js --dry-run
```

---

## Support

**Documentation:** [Master Index](../../CLIENT-INITIATION-INDEX.md)

**Guides:**
- [Deployment Guide](../../docs/client-initiation-deployment-guide.md)
- [Performance Optimization](../../docs/client-initiation-performance-optimization.md)

**Quick Reference:** [QUICK-REFERENCE.md](../../QUICK-REFERENCE.md)

---

**Last Updated:** 2026-01-19 | **Version:** 1.0.0
