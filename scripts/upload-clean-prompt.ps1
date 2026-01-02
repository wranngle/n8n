$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
    'Content-Type' = 'application/json; charset=utf-8'
}

$agentId = 'agent_8001kdgp7qbyf4wvhs540be78vew'

Write-Host "=== UPLOADING CLEAN PROMPT ===" -ForegroundColor Cyan

# Read clean prompt file with UTF-8 encoding
$promptPath = "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\clean-prompt-with-fixes.md"
$cleanPrompt = [System.IO.File]::ReadAllText($promptPath, [System.Text.Encoding]::UTF8)

Write-Host "Prompt length: $($cleanPrompt.Length) chars"

# Check for non-ASCII
$nonAscii = [regex]::Matches($cleanPrompt, '[^\x00-\x7F]')
Write-Host "Non-ASCII chars in source: $($nonAscii.Count)"

# Build payload
$payload = @{
    conversation_config = @{
        agent = @{
            prompt = @{
                prompt = $cleanPrompt
            }
        }
    }
}

# Convert to JSON with proper depth
$jsonPayload = $payload | ConvertTo-Json -Depth 10 -Compress

# Encode as UTF-8 bytes
$bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonPayload)

Write-Host "JSON payload size: $($bytes.Length) bytes"
Write-Host ""

try {
    $uri = "https://api.elevenlabs.io/v1/convai/agents/$agentId"
    $response = Invoke-WebRequest -Uri $uri -Method PATCH -Headers $headers -Body $bytes
    
    Write-Host "=== UPDATE SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)"
    
    # Verify by fetching back
    Write-Host ""
    Write-Host "=== VERIFYING UPLOAD ===" -ForegroundColor Cyan
    $verifyResponse = Invoke-RestMethod -Uri $uri -Method GET -Headers @{'xi-api-key' = $env:ELEVENLABS_API_KEY}
    $verifiedPrompt = $verifyResponse.conversation_config.agent.prompt.prompt
    
    $verifyNonAscii = [regex]::Matches($verifiedPrompt, '[^\x00-\x7F]')
    Write-Host "Verified prompt length: $($verifiedPrompt.Length) chars"
    Write-Host "Non-ASCII in verified: $($verifyNonAscii.Count)"
    
    # Check for corruption pattern
    if ($verifiedPrompt -match 'A\?A\?' -or $verifiedPrompt -match 'Ã') {
        Write-Host "WARNING: Corruption detected in uploaded prompt!" -ForegroundColor Red
    } else {
        Write-Host "No corruption patterns detected" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        Write-Host "Response: $($reader.ReadToEnd())" -ForegroundColor Red
    }
}
