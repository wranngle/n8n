# Run All Workflow Evaluations
# Executes test cases against each DEV workflow and records results

$baseUrl = "https://n8n.wranngle.com/webhook"
$results = @()
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  N8N WORKFLOW EVALUATION SUITE" -ForegroundColor Cyan
Write-Host "  Started: $timestamp" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define workflows with their webhook paths and test payloads
$evaluations = @(
    @{
        id = "D4GGMXFGC1PLOUT0"
        name = "Get ElevenLabs Agent"
        complexity = "minimal"
        webhook = "eval-get-agent"
        tests = @(
            @{
                name = "Valid Agent Retrieval"
                payload = @{ agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g" }
                expected_fields = @("success", "agent")
                weight = 40
            },
            @{
                name = "Default Agent (no ID)"
                payload = @{}
                expected_fields = @("success")
                weight = 30
            }
        )
    },
    @{
        id = "NBvO92RVDa8pCK0d"
        name = "Client Data Lookup (Test)"
        complexity = "minimal"
        webhook = "client-data-lookup-test"
        tests = @(
            @{
                name = "Valid Lookup"
                payload = @{ phone = "+15551234567"; caller_id = "test-001" }
                expected_fields = @("client", "success")
                weight = 50
            }
        )
    },
    @{
        id = "Ar2lX0cprjeWB4Kd"
        name = "Execution Logger (Test)"
        complexity = "minimal"
        webhook = "execution-logger-test"
        tests = @(
            @{
                name = "Log Entry"
                payload = @{ workflow_id = "test-wf"; status = "success"; duration_ms = 1500 }
                expected_fields = @("logged", "success")
                weight = 50
            }
        )
    },
    @{
        id = "ITUFwZq7ixgjTZMJ"
        name = "Slack Notifier (Test)"
        complexity = "minimal"
        webhook = "slack-notifier-test"
        tests = @(
            @{
                name = "Format Message"
                payload = @{ channel = "#test"; message = "Test notification"; severity = "info" }
                expected_fields = @("formatted", "success")
                weight = 50
            }
        )
    }
)

function Test-Workflow {
    param(
        [hashtable]$eval
    )

    Write-Host "`n[$($eval.complexity.ToUpper())] $($eval.name)" -ForegroundColor Yellow
    Write-Host "  Webhook: $($eval.webhook)" -ForegroundColor Gray

    $totalScore = 0
    $totalWeight = 0
    $testResults = @()

    foreach ($test in $eval.tests) {
        $totalWeight += $test.weight
        Write-Host "  Running: $($test.name)..." -NoNewline

        try {
            $body = $test.payload | ConvertTo-Json -Compress
            $response = Invoke-RestMethod -Uri "$baseUrl/$($eval.webhook)" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 30
            $responseStr = $response | ConvertTo-Json -Compress

            # Check for expected fields
            $fieldsFound = 0
            foreach ($field in $test.expected_fields) {
                if ($responseStr -match $field) {
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
            } else {
                Write-Host " PARTIAL ($fieldScore/$($test.weight))" -ForegroundColor Yellow
            }

            $testResults += @{
                name = $test.name
                score = $fieldScore
                max_score = $test.weight
                status = if ($fieldScore -ge ($test.weight * 0.7)) { "pass" } else { "partial" }
            }
        }
        catch {
            Write-Host " FAIL (0/$($test.weight))" -ForegroundColor Red
            Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
            $testResults += @{
                name = $test.name
                score = 0
                max_score = $test.weight
                status = "fail"
                error = $_.Exception.Message
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
    $result = Test-Workflow -eval $eval
    $results += $result
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  EVALUATION SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$passed = ($results | Where-Object { $_.passed }).Count
$total = $results.Count
$avgScore = [math]::Round(($results | Measure-Object -Property score -Average).Average)

Write-Host "Workflows Evaluated: $total"
Write-Host "Passed: $passed / $total"
Write-Host "Average Score: $avgScore%"
Write-Host ""

# Output results as JSON
$outputPath = "C:\Users\root\Documents\dev\n8n\workflows\dev\evaluations\results_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "Results saved to: $outputPath" -ForegroundColor Green

# Return results
$results | ConvertTo-Json -Depth 5
