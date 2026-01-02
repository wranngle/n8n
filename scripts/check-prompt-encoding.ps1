$headers = @{
    'xi-api-key' = $env:ELEVENLABS_API_KEY
}

$response = Invoke-RestMethod -Uri 'https://api.elevenlabs.io/v1/convai/agents/agent_8001kdgp7qbyf4wvhs540be78vew' -Headers $headers
$prompt = $response.conversation_config.agent.prompt.prompt

Write-Host "Prompt length: $($prompt.Length) chars"
Write-Host ""

# Save for inspection
$prompt | Out-File -FilePath "D:\Things\Work\Wranngle\n8n_workflow_development\scripts\current-prompt.txt" -Encoding utf8

Write-Host "=== CHECKING FOR MANGLED/NON-ASCII CHARS ===" -ForegroundColor Cyan

# Find non-ASCII characters
$badMatches = [regex]::Matches($prompt, '[^\x00-\x7F]')
Write-Host "Non-ASCII characters found: $($badMatches.Count)"

if ($badMatches.Count -gt 0) {
    Write-Host ""
    Write-Host "First 30 occurrences:" -ForegroundColor Yellow
    $badMatches | Select-Object -First 30 | ForEach-Object {
        $context = ""
        $start = [Math]::Max(0, $_.Index - 15)
        $len = [Math]::Min(40, $prompt.Length - $start)
        $context = $prompt.Substring($start, $len)
        Write-Host "Pos $($_.Index): [$($_.Value)] Context: ...$context..."
    }
}

# Check for common encoding issues
Write-Host ""
Write-Host "=== SPECIFIC PATTERN CHECKS ===" -ForegroundColor Cyan

$patterns = @(
    @{Name="Curly quotes"; Pattern="[\u2018\u2019\u201C\u201D]"},
    @{Name="Em/En dashes"; Pattern="[\u2013\u2014]"},
    @{Name="Ellipsis"; Pattern="\u2026"},
    @{Name="BOM/Zero-width"; Pattern="[\uFEFF\u200B\u200C\u200D]"},
    @{Name="Replacement char"; Pattern="\uFFFD"}
)

foreach ($p in $patterns) {
    $matches = [regex]::Matches($prompt, $p.Pattern)
    if ($matches.Count -gt 0) {
        Write-Host "$($p.Name): $($matches.Count) found" -ForegroundColor Red
    }
}
