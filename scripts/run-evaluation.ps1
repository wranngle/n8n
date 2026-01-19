$baseUrl = "https://n8n.wranngle.com/webhook"

# Test payload for Universal Evaluation Runner
$evalPayload = @{
    workflow_id = "D4GGMXFGC1PLOUT0"
    webhook_path = "eval-get-agent"
    test_cases = @(
        @{
            id = "TC001"
            name = "Valid Agent Retrieval"
            input = @{
                agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g"
            }
            expected = @{
                status = 200
                response_contains = @("agent_id", "name")
            }
            weight = 40
        },
        @{
            id = "TC002"
            name = "Response Contains Config"
            input = @{
                agent_id = "agent_5701kdgf9s4vfe9rhe68ntjrms9g"
            }
            expected = @{
                status = 200
                response_contains = @("conversation_config", "first_message")
            }
            weight = 30
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Running evaluation against Get ElevenLabs Agent workflow..."
Write-Host "Payload: $evalPayload"
Write-Host ""

try {
    $result = Invoke-RestMethod -Uri "$baseUrl/universal-eval-runner" -Method POST -Body $evalPayload -ContentType "application/json"
    Write-Host "=== EVALUATION RESULTS ===" -ForegroundColor Cyan
    $result | ConvertTo-Json -Depth 10
} catch {
    $response = $_.Exception.Response
    if ($response) {
        $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
        $reader.BaseStream.Position = 0
        Write-Host "ERROR: $($reader.ReadToEnd())" -ForegroundColor Red
    } else {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}
