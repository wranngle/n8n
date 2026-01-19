# Run MCP-Based Workflow Evaluations
# Executes workflows via n8n Instance MCP Server (bypasses webhook registration)

$mcpUrl = "https://n8n.wranngle.com/mcp-server/http"
$mcpApiKey = $null

# Load API key from .env
$envPath = "C:\Users\root\.claude\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match "^N8N_MCP_API_KEY=(.+)$") {
            $mcpApiKey = $matches[1]
        }
    }
}

if (-not $mcpApiKey) {
    Write-Host "ERROR: N8N_MCP_API_KEY not found in $envPath" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $mcpApiKey"
    "Content-Type" = "application/json"
    "Accept" = "application/json, text/event-stream"
}

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  N8N MCP-BASED EVALUATION SUITE" -ForegroundColor Cyan
Write-Host "  Started: $timestamp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define evaluations with workflow IDs and test data
$evaluations = @(
    @{
        id = "D4GGMXFGC1PLOUT0"
        name = "Get ElevenLabs Agent"
        complexity = "minimal"
        tests = @(
            @{
                name = "Valid Agent Retrieval"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g" }
                    }
                }
                expected_fields = @("success", "agent")
                weight = 40
            },
            @{
                name = "Default Agent (no ID)"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{}
                    }
                }
                expected_fields = @("success")
                weight = 30
            }
        )
    },
    @{
        id = "NBvO92RVDa8pCK0d"
        name = "Client Data Lookup (Test)"
        complexity = "minimal"
        tests = @(
            @{
                name = "Valid Lookup"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ phone = "+15551234567"; caller_id = "test-001" }
                    }
                }
                expected_fields = @("client", "success")
                weight = 50
            }
        )
    },
    @{
        id = "Ar2lX0cprjeWB4Kd"
        name = "Execution Logger (Test)"
        complexity = "minimal"
        tests = @(
            @{
                name = "Log Entry"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ workflow_id = "test-wf"; status = "success"; duration_ms = 1500 }
                    }
                }
                expected_fields = @("logged", "success")
                weight = 50
            }
        )
    },
    @{
        id = "ITUFwZq7ixgjTZMJ"
        name = "Slack Notifier (Test)"
        complexity = "minimal"
        tests = @(
            @{
                name = "Format Message"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ channel = "#test"; message = "Test notification"; severity = "info" }
                    }
                }
                expected_fields = @("formatted", "success")
                weight = 50
            }
        )
    },
    @{
        id = "paneUFRzPscNvih2"
        name = "Pipeline Test - Webhook Processor"
        complexity = "minimal"
        tests = @(
            @{
                name = "Process Webhook Data"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ event = "test"; data = @{ key = "value" } }
                    }
                }
                expected_fields = @("processed", "success")
                weight = 50
            }
        )
    },
    @{
        id = "oik6SebewNAh1cV5"
        name = "Client Data Lookup (Eval-Ready)"
        complexity = "minimal"
        tests = @(
            @{
                name = "Valid Lookup"
                input = @{
                    type = "webhook"
                    webhookData = @{
                        method = "POST"
                        body = @{ phone = "+15551234567" }
                    }
                }
                expected_fields = @("client", "success")
                weight = 50
            }
        )
    }
)

function Execute-WorkflowViaMCP {
    param(
        [string]$workflowId,
        [hashtable]$inputData
    )

    $mcpRequest = @{
        jsonrpc = "2.0"
        method = "tools/call"
        params = @{
            name = "execute_workflow"
            arguments = @{
                workflowId = $workflowId
                inputs = $inputData
            }
        }
        id = [int](Get-Date -UFormat %s)
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $mcpUrl -Method POST -Headers $headers -Body $mcpRequest -TimeoutSec 120

        # Parse the SSE response
        if ($response -match 'data: (.+)') {
            $jsonData = $matches[1] | ConvertFrom-Json
            if ($jsonData.result.structuredContent) {
                return $jsonData.result.structuredContent
            } elseif ($jsonData.result.content) {
                $textContent = $jsonData.result.content | Where-Object { $_.type -eq "text" } | Select-Object -First 1
                if ($textContent) {
                    return $textContent.text | ConvertFrom-Json
                }
            }
            return $jsonData.result
        }

        return @{ success = $false; error = "Invalid response format" }
    }
    catch {
        return @{ success = $false; error = $_.Exception.Message }
    }
}

function Test-WorkflowViaMCP {
    param(
        [hashtable]$eval
    )

    Write-Host "`n[$($eval.complexity.ToUpper())] $($eval.name)" -ForegroundColor Yellow
    Write-Host "  Workflow ID: $($eval.id)" -ForegroundColor Gray

    $totalScore = 0
    $totalWeight = 0
    $testResults = @()

    foreach ($test in $eval.tests) {
        $totalWeight += $test.weight
        Write-Host "  Running: $($test.name)..." -NoNewline

        $result = Execute-WorkflowViaMCP -workflowId $eval.id -inputData $test.input

        if ($result.success -eq $true) {
            # Execution succeeded - check for expected fields
            $resultJson = $result | ConvertTo-Json -Compress -Depth 10
            $fieldsFound = 0

            foreach ($field in $test.expected_fields) {
                if ($resultJson -match $field) {
                    $fieldsFound++
                }
            }

            $fieldScore = if ($test.expected_fields.Count -gt 0) {
                [math]::Round(($fieldsFound / $test.expected_fields.Count) * $test.weight)
            } else {
                $test.weight
            }

            $totalScore += $fieldScore

            if ($fieldScore -ge ($test.weight * 0.7)) {
                Write-Host " PASS ($fieldScore/$($test.weight))" -ForegroundColor Green
                $testResults += @{
                    name = $test.name
                    score = $fieldScore
                    max_score = $test.weight
                    status = "pass"
                }
            } else {
                Write-Host " PARTIAL ($fieldScore/$($test.weight))" -ForegroundColor Yellow
                $testResults += @{
                    name = $test.name
                    score = $fieldScore
                    max_score = $test.weight
                    status = "partial"
                    details = "Fields found: $fieldsFound / $($test.expected_fields.Count)"
                }
            }
        } elseif ($result.success -eq $false -and $result.error) {
            Write-Host " FAIL" -ForegroundColor Red
            Write-Host "    Error: $($result.error)" -ForegroundColor Red
            $testResults += @{
                name = $test.name
                score = 0
                max_score = $test.weight
                status = "fail"
                error = $result.error
            }
        } else {
            # Execution returned data but no explicit success flag - check result
            $resultJson = $result | ConvertTo-Json -Compress -Depth 10
            $fieldsFound = 0

            foreach ($field in $test.expected_fields) {
                if ($resultJson -match $field) {
                    $fieldsFound++
                }
            }

            $fieldScore = if ($test.expected_fields.Count -gt 0) {
                [math]::Round(($fieldsFound / $test.expected_fields.Count) * $test.weight)
            } else {
                $test.weight
            }

            $totalScore += $fieldScore

            if ($fieldScore -ge ($test.weight * 0.7)) {
                Write-Host " PASS ($fieldScore/$($test.weight))" -ForegroundColor Green
                $testResults += @{
                    name = $test.name
                    score = $fieldScore
                    max_score = $test.weight
                    status = "pass"
                }
            } else {
                Write-Host " PARTIAL ($fieldScore/$($test.weight))" -ForegroundColor Yellow
                $testResults += @{
                    name = $test.name
                    score = $fieldScore
                    max_score = $test.weight
                    status = "partial"
                }
            }
        }
    }

    $finalScore = if ($totalWeight -gt 0) { [math]::Round(($totalScore / $totalWeight) * 100) } else { 0 }
    $passed = $finalScore -ge 70

    Write-Host "  ---------------------------------" -ForegroundColor Gray
    Write-Host "  SCORE: $finalScore% " -NoNewline
    if ($passed) {
        Write-Host "[PASS]" -ForegroundColor Green
    } else {
        Write-Host "[NEEDS IMPROVEMENT]" -ForegroundColor Red
    }

    return @{
        workflow_id = $eval.id
        workflow_name = $eval.name
        complexity = $eval.complexity
        score = $finalScore
        passed = $passed
        test_results = $testResults
        evaluated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    }
}

# Run evaluations
foreach ($eval in $evaluations) {
    $result = Test-WorkflowViaMCP -eval $eval
    $results += $result
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  EVALUATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passedCount = ($results | Where-Object { $_.passed }).Count
$total = $results.Count
$scores = $results | ForEach-Object { $_.score }
$avgScore = if ($scores.Count -gt 0) { [math]::Round(($scores | Measure-Object -Sum).Sum / $scores.Count) } else { 0 }

Write-Host "Workflows Evaluated: $total"
Write-Host "Passed: $passedCount / $total"
Write-Host "Average Score: $avgScore%"
Write-Host ""

# Output results as JSON
$outputPath = "C:\Users\root\Documents\dev\n8n\workflows\dev\evaluations\results_mcp_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "Results saved to: $outputPath" -ForegroundColor Green

# Return results
$results | ConvertTo-Json -Depth 5
