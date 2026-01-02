$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$agentId = 'agent_xxxx_demo'

# Get full agent configuration
$uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
Write-Host "Fetching agent config from: $uri" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers
    $agent = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "=== AGENT: $($agent.name) ===" -ForegroundColor Yellow
    
    # Save full config
    $response.Content | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\agent-config.json" -Encoding utf8
    Write-Host "Full config saved to agent-config.json"
    
    # Extract and display system prompt
    Write-Host ""
    Write-Host "=== SYSTEM PROMPT ===" -ForegroundColor Magenta
    
    if ($agent.conversation_config -and $agent.conversation_config.agent -and $agent.conversation_config.agent.prompt) {
        $prompt = $agent.conversation_config.agent.prompt.prompt
        Write-Host $prompt
        
        # Save prompt separately
        $prompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\current-prompt.txt" -Encoding utf8
        Write-Host ""
        Write-Host "Prompt saved to current-prompt.txt" -ForegroundColor Green
    } else {
        Write-Host "Could not find prompt in expected location"
        Write-Host "Agent structure:"
        $agent | ConvertTo-Json -Depth 3
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
