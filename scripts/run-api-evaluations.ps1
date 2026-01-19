# Run API-Based Workflow Evaluations
# Executes workflows via n8n API instead of webhooks (bypasses webhook registration issue)

$baseUrl = "https://n8n.wranngle.com/api/v1"
$apiKey = $env:N8N_API_KEY

if (-not $apiKey) {
    # Try to load from .env file
    $envPath = "C:\Users\root\.claude\.env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            if ($_ -match "^N8N_API_KEY=(.+)$") {
                $apiKey = $matches[1]
            }
        }
    }
}

if (-not $apiKey) {
    Write-Host "ERROR: N8N_API_KEY not found" -ForegroundColor Red
    exit 1
}

$headers = @{
    "X-N8N-API-KEY" = $apiKey
    "Content-Type" = "application/json"
}

$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  N8N API-BASED EVALUATION SUITE" -ForegroundColor Cyan
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
                input = @{ body = @{ agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g" } }
                expected_fields = @("success", "agent")
                weight = 40
            },
            @{
                name = "Default Agent (no ID)"
                input = @{ body = @{} }
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
                input = @{ body = @{ phone = "+15551234567"; caller_id = "test-001" } }
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
                input = @{ body = @{ workflow_id = "test-wf"; status = "success"; duration_ms = 1500 } }
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
                input = @{ body = @{ channel = "#test"; message = "Test notification"; severity = "info" } }
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
                input = @{ body = @{ event = "test"; data = @{ key = "value" } } }
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
                input = @{ body = @{ phone = "+15551234567" } }
                expected_fields = @("client", "success")
                weight = 50
            }
        )
    }
)

function Execute-Workflow {
    param(
        [string]$workflowId,
        [hashtable]$inputData
    )

    try {
        # Use the workflow execution endpoint
        $execBody = @{
            workflowData = @{
                id = $workflowId
            }
        } | ConvertTo-Json -Depth 10

        # First, get the workflow to understand its structure
        $workflowResponse = Invoke-RestMethod -Uri "$baseUrl/workflows/$workflowId" -Headers $headers -Method GET

        # Try to execute via the executions endpoint with input data
        # n8n expects data in a specific format for the trigger node
        $triggerNode = $workflowResponse.nodes | Where-Object { $_.type -like "*webhook*" -or $_.type -like "*trigger*" } | Select-Object -First 1

        if ($triggerNode) {
            $runData = @{
                $triggerNode.name = @(
                    @(
                        @{
                            json = $inputData
                        }
                    )
                )
            }
        } else {
            $runData = @{}
        }

        $execPayload = @{
            workflowId = $workflowId
            runData = $runData
        } | ConvertTo-Json -Depth 10

        $response = Invoke-RestMethod -Uri "$baseUrl/executions" -Headers $headers -Method POST -Body $execPayload -ContentType "application/json" -TimeoutSec 60

        return @{
            success = $true
            data = $response
            executionId = $response.id
        }
    }
    catch {
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Get-ExecutionResult {
    param(
        [string]$executionId
    )

    try {
        Start-Sleep -Seconds 2  # Wait for execution to complete
        $response = Invoke-RestMethod -Uri "$baseUrl/executions/$executionId" -Headers $headers -Method GET
        return @{
            success = $true
            data = $response
            status = $response.status
            finished = $response.finished
        }
    }
    catch {
        return @{
            success = $false
            error = $_.Exception.Message
        }
    }
}

function Test-WorkflowViaAPI {
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

        $execResult = Execute-Workflow -workflowId $eval.id -inputData $test.input

        if ($execResult.success -and $execResult.executionId) {
            # Wait and get result
            $result = Get-ExecutionResult -executionId $execResult.executionId

            if ($result.success -and $result.status -eq "success") {
                # Check for expected fields in the result data
                $resultJson = $result.data | ConvertTo-Json -Compress
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
            } else {
                Write-Host " FAIL (execution: $($result.status))" -ForegroundColor Red
                $testResults += @{
                    name = $test.name
                    score = 0
                    max_score = $test.weight
                    status = "fail"
                    error = "Execution status: $($result.status)"
                }
            }
        } else {
            Write-Host " FAIL (API error)" -ForegroundColor Red
            Write-Host "    Error: $($execResult.error)" -ForegroundColor Red
            $testResults += @{
                name = $test.name
                score = 0
                max_score = $test.weight
                status = "fail"
                error = $execResult.error
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
    $result = Test-WorkflowViaAPI -eval $eval
    $results += $result
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  EVALUATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.passed }).Count
$total = $results.Count
$avgScore = if ($results.Count -gt 0) { [math]::Round(($results | Measure-Object -Property score -Average).Average) } else { 0 }

Write-Host "Workflows Evaluated: $total"
Write-Host "Passed: $passed / $total"
Write-Host "Average Score: $avgScore%"
Write-Host ""

# Output results as JSON
$outputPath = "C:\Users\root\Documents\dev\n8n\workflows\dev\evaluations\results_api_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "Results saved to: $outputPath" -ForegroundColor Green

# Return results
$results | ConvertTo-Json -Depth 5
