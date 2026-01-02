$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$response = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/agents/agent_8001kdgp7qbyf4wvhs540be78vew' -Headers $headers
$prompt = $response.conversation_config.agent.prompt.prompt

$outPath = "D:\Things\Work\Wranngle\n8n_workflow_development\workflows\voice_ai_agents\sarah-final-prompt-100pct.md"
[System.IO.File]::WriteAllText($outPath, $prompt, [System.Text.Encoding]::UTF8)

Write-Host "Saved to: $outPath"
Write-Host "Length: $($prompt.Length) chars"
