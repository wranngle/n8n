# Run ALL MCP-Based Workflow Evaluations
# Comprehensive stress test across all complexity levels

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
    Write-Host "ERROR: N8N_MCP_API_KEY not found" -ForegroundColor Red
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
Write-Host "  COMPREHENSIVE WORKFLOW STRESS TEST" -ForegroundColor Cyan
Write-Host "  Started: $timestamp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ALL Evaluations by Complexity
$evaluations = @(
    # === LOW COMPLEXITY ===
    @{
        id = "wZryG5tdRBFZUNMF"
        name = "SEWY Garage Doors SMS Tool"
        complexity = "low"
        tests = @(
            @{
                name = "SMS Format Check"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ phone = "+13075551234"; message = "Test SMS" } } }
                expected_fields = @("success", "formatted")
                weight = 50
            }
        )
    },
    @{
        id = "qQmGqBM1pe4QUI05"
        name = "Pipedrive Lead Auto-Caller"
        complexity = "low"
        tests = @(
            @{
                name = "Lead Processing"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ lead_id = "test-123"; phone = "+15551234567" } } }
                expected_fields = @("success", "processed")
                weight = 50
            }
        )
    },
    @{
        id = "M7ZmLGCxyVOn5QJ6"
        name = "Parallel Evaluation Runner v6"
        complexity = "low"
        tests = @(
            @{
                name = "Parallel Execution"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ workflow_ids = @("test-1"); max_parallel = 2 } } }
                expected_fields = @("success", "results")
                weight = 50
            }
        )
    },
    # === MEDIUM COMPLEXITY ===
    @{
        id = "dKJYSCGIORtUsTSM"
        name = "Autorefinement Orchestrator"
        complexity = "medium"
        tests = @(
            @{
                name = "Orchestration Init"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ agent_id = "test"; mode = "analyze" } } }
                expected_fields = @("success", "status")
                weight = 50
            }
        )
    },
    @{
        id = "mwepwjfX27x4uTMu"
        name = "Native Evaluation Runner"
        complexity = "medium"
        tests = @(
            @{
                name = "Evaluation Run"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ workflow_id = "test"; test_data = @{} } } }
                expected_fields = @("success", "score")
                weight = 50
            }
        )
    },
    @{
        id = "8qlDREZy5qtEGkNK"
        name = "Post-Call Orchestrator (Test)"
        complexity = "medium"
        tests = @(
            @{
                name = "Post-Call Processing"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ conversation_id = "conv-test"; status = "completed" } } }
                expected_fields = @("success", "processed")
                weight = 50
            }
        )
    },
    @{
        id = "zeQNX4g5mQlE4EQ0"
        name = "Autorefinement Orchestrator v2"
        complexity = "medium"
        tests = @(
            @{
                name = "V2 Orchestration"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ agent_id = "test"; action = "refine" } } }
                expected_fields = @("success", "refinement")
                weight = 50
            }
        )
    },
    @{
        id = "5eowJIoZFZOSG85m"
        name = "ElevenLabs Twilio Outbound with Client Data"
        complexity = "medium"
        tests = @(
            @{
                name = "Outbound Call Init"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ to_number = "+15551234567"; client_id = "test-client" } } }
                expected_fields = @("success", "call")
                weight = 50
            }
        )
    },
    # === HIGH COMPLEXITY ===
    @{
        id = "5hvmE72qa4VYyPOK"
        name = "Transcript Field Extractor - AI Agent"
        complexity = "high"
        tests = @(
            @{
                name = "Transcript Extraction"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ transcript = "Hello, my name is John. I need help with my order."; fields = @("name", "intent") } } }
                expected_fields = @("success", "extracted")
                weight = 50
            }
        )
    },
    @{
        id = "54sXqqJVSctlSF6V"
        name = "Transcript Field Extractor v2"
        complexity = "high"
        tests = @(
            @{
                name = "V2 Extraction"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ transcript = "Test transcript content"; extraction_mode = "comprehensive" } } }
                expected_fields = @("success", "fields")
                weight = 50
            }
        )
    },
    @{
        id = "c9dFlI51VhvANoEj"
        name = "Autorefinement Orchestrator v2 (LangChain)"
        complexity = "high"
        tests = @(
            @{
                name = "LangChain Refinement"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ agent_id = "test"; chain_mode = "refine" } } }
                expected_fields = @("success", "chain")
                weight = 50
            }
        )
    },
    @{
        id = "KoQChBtjUa5F9bZg"
        name = "SRIS - Verification Loop"
        complexity = "high"
        tests = @(
            @{
                name = "Verification Cycle"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ workflow_id = "test"; iteration = 1 } } }
                expected_fields = @("success", "verified")
                weight = 50
            }
        )
    },
    @{
        id = "RjLiUAiuUs5XPvBj"
        name = "SRIS - ElevenLabs Conversation Evaluator"
        complexity = "high"
        tests = @(
            @{
                name = "Conversation Evaluation"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ conversation_id = "conv-test"; criteria = @("quality", "accuracy") } } }
                expected_fields = @("success", "evaluation")
                weight = 50
            }
        )
    },
    @{
        id = "4TqaQ6kORDzZVwVP"
        name = "SRIS - Master Orchestrator"
        complexity = "high"
        tests = @(
            @{
                name = "Master Orchestration"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ command = "status"; scope = "all" } } }
                expected_fields = @("success", "status")
                weight = 50
            }
        )
    },
    @{
        id = "cEORduJCqCVDOKce"
        name = "ElevenLabs Call Completed - Update Pipedrive"
        complexity = "high"
        tests = @(
            @{
                name = "Pipedrive Update"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ conversation_id = "conv-test"; outcome = "qualified" } } }
                expected_fields = @("success", "updated")
                weight = 50
            }
        )
    },
    @{
        id = "NcP4oEeS3xolYXzC"
        name = "ElevenLabs Twilio Outbound - Bulletproof"
        complexity = "high"
        tests = @(
            @{
                name = "Bulletproof Call"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ to_number = "+15551234567"; agent_id = "test" } } }
                expected_fields = @("success", "call_id")
                weight = 50
            }
        )
    },
    @{
        id = "SjItj6uzYSr9rotM"
        name = "Autonomous Sleep Loop"
        complexity = "high"
        tests = @(
            @{
                name = "Sleep Loop Init"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ max_cycles = 1; simulate_perfect = $true } } }
                expected_fields = @("success", "cycles")
                weight = 50
            }
        )
    },
    @{
        id = "KrqpJuyN8pjTouAo"
        name = "Voice Agent Tester v2.0"
        complexity = "high"
        tests = @(
            @{
                name = "Voice Test Suite"
                input = @{ type = "webhook"; webhookData = @{ method = "POST"; body = @{ agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g"; scenario_filter = "greeting"; max_scenarios = 1 } } }
                expected_fields = @("success", "test")
                weight = 50
            }
        )
    }
)

function Execute-WorkflowViaMCP {
    param([string]$workflowId, [hashtable]$inputData)

    $mcpRequest = @{
        jsonrpc = "2.0"
        method = "tools/call"
        params = @{
            name = "execute_workflow"
            arguments = @{ workflowId = $workflowId; inputs = $inputData }
        }
        id = [int](Get-Date -UFormat %s)
    } | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Uri $mcpUrl -Method POST -Headers $headers -Body $mcpRequest -TimeoutSec 120
        if ($response -match 'data: (.+)') {
            $jsonData = $matches[1] | ConvertFrom-Json
            if ($jsonData.result.structuredContent) { return $jsonData.result.structuredContent }
            elseif ($jsonData.result.content) {
                $textContent = $jsonData.result.content | Where-Object { $_.type -eq "text" } | Select-Object -First 1
                if ($textContent) { return $textContent.text | ConvertFrom-Json }
            }
            return $jsonData.result
        }
        return @{ success = $false; error = "Invalid response" }
    }
    catch { return @{ success = $false; error = $_.Exception.Message } }
}

function Test-Workflow {
    param([hashtable]$eval)

    Write-Host "`n[$($eval.complexity.ToUpper())] $($eval.name)" -ForegroundColor Yellow
    Write-Host "  ID: $($eval.id)" -ForegroundColor Gray

    $totalScore = 0; $totalWeight = 0; $testResults = @()

    foreach ($test in $eval.tests) {
        $totalWeight += $test.weight
        Write-Host "  Running: $($test.name)..." -NoNewline

        $result = Execute-WorkflowViaMCP -workflowId $eval.id -inputData $test.input
        $resultJson = $result | ConvertTo-Json -Compress -Depth 10

        if ($result.success -eq $false -and $result.error) {
            Write-Host " FAIL" -ForegroundColor Red
            $shortError = if ($result.error.Length -gt 80) { $result.error.Substring(0, 80) + "..." } else { $result.error }
            Write-Host "    $shortError" -ForegroundColor DarkGray
            $testResults += @{ name = $test.name; score = 0; max_score = $test.weight; status = "fail"; error = $result.error }
        }
        else {
            $fieldsFound = 0
            foreach ($field in $test.expected_fields) { if ($resultJson -match $field) { $fieldsFound++ } }
            $fieldScore = if ($test.expected_fields.Count -gt 0) { [math]::Round(($fieldsFound / $test.expected_fields.Count) * $test.weight) } else { $test.weight }
            $totalScore += $fieldScore

            if ($fieldScore -ge ($test.weight * 0.7)) {
                Write-Host " PASS ($fieldScore/$($test.weight))" -ForegroundColor Green
                $testResults += @{ name = $test.name; score = $fieldScore; max_score = $test.weight; status = "pass" }
            } else {
                Write-Host " PARTIAL ($fieldScore/$($test.weight))" -ForegroundColor Yellow
                $testResults += @{ name = $test.name; score = $fieldScore; max_score = $test.weight; status = "partial" }
            }
        }
    }

    $finalScore = if ($totalWeight -gt 0) { [math]::Round(($totalScore / $totalWeight) * 100) } else { 0 }
    $passed = $finalScore -ge 70

    Write-Host "  SCORE: $finalScore% " -NoNewline
    if ($passed) { Write-Host "[PASS]" -ForegroundColor Green } else { Write-Host "[NEEDS WORK]" -ForegroundColor Red }

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

# Group by complexity
$byComplexity = @{ low = @(); medium = @(); high = @() }

foreach ($eval in $evaluations) {
    $result = Test-Workflow -eval $eval
    $results += $result
    $byComplexity[$eval.complexity] += $result
}

# Summary by complexity
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  RESULTS BY COMPLEXITY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

foreach ($level in @("low", "medium", "high")) {
    $levelResults = $byComplexity[$level]
    if ($levelResults.Count -gt 0) {
        $passedCount = ($levelResults | Where-Object { $_.passed }).Count
        $avgScore = [math]::Round(($levelResults | Measure-Object -Property score -Average).Average)
        Write-Host "`n$($level.ToUpper()) COMPLEXITY:" -ForegroundColor Magenta
        Write-Host "  Passed: $passedCount / $($levelResults.Count)"
        Write-Host "  Average Score: $avgScore%"
    }
}

# Overall summary
$totalPassed = ($results | Where-Object { $_.passed }).Count
$overallAvg = [math]::Round(($results | Measure-Object -Property score -Average).Average)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  OVERALL SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Workflows: $($results.Count)"
Write-Host "Passed: $totalPassed / $($results.Count)"
Write-Host "Average Score: $overallAvg%"

# Save results
$outputPath = "C:\Users\root\Documents\dev\n8n\workflows\dev\evaluations\results_full_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "`nResults saved to: $outputPath" -ForegroundColor Green
