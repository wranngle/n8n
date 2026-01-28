# run-hook-tests.ps1
# Test runner script for governance hook tests

param(
    [Parameter()]
    [ValidateSet('all', 'unit', 'integration', 'watch')]
    [string]$Mode = 'all',

    [Parameter()]
    [switch]$Coverage,

    [Parameter()]
    [switch]$Verbose
)

$ErrorActionPreference = 'Stop'
$TestDir = Join-Path $PSScriptRoot '..' '.claude' 'tests'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GOVERNANCE HOOK TEST RUNNER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Validate test directory exists
if (-not (Test-Path $TestDir)) {
    Write-Error "Test directory not found: $TestDir"
    exit 1
}

# Build test command
$TestFiles = @()
switch ($Mode) {
    'unit' {
        $TestFiles = Get-ChildItem -Path $TestDir -Filter '*.test.js' -File |
            Where-Object { $_.Name -notmatch 'integration|e2e' }
    }
    'integration' {
        $TestFiles = Get-ChildItem -Path $TestDir -Filter '*integration*.test.js' -File -Recurse
    }
    'all' {
        $TestFiles = Get-ChildItem -Path $TestDir -Filter '*.test.js' -File -Recurse
    }
    'watch' {
        Write-Host "Starting watch mode..." -ForegroundColor Yellow
        # Node.js test runner doesn't have native watch, use nodemon if available
        if (Get-Command nodemon -ErrorAction SilentlyContinue) {
            nodemon --watch $TestDir --ext js --exec "node --test $TestDir/*.test.js"
        } else {
            Write-Host "nodemon not found. Install with: npm install -g nodemon" -ForegroundColor Red
            Write-Host "Running single test pass instead..." -ForegroundColor Yellow
            $TestFiles = Get-ChildItem -Path $TestDir -Filter '*.test.js' -File -Recurse
        }
    }
}

if ($TestFiles.Count -eq 0 -and $Mode -ne 'watch') {
    Write-Host "No test files found for mode: $Mode" -ForegroundColor Yellow
    exit 0
}

Write-Host "Mode: $Mode" -ForegroundColor Green
Write-Host "Test files: $($TestFiles.Count)" -ForegroundColor Green
Write-Host ""

$TestPaths = $TestFiles | ForEach-Object { $_.FullName }

# Build node test command
$NodeArgs = @('--test')

if ($Verbose) {
    $NodeArgs += '--test-reporter=spec'
}

# Add coverage if requested
if ($Coverage) {
    Write-Host "Coverage reporting enabled" -ForegroundColor Yellow
    # Node.js experimental coverage
    $NodeArgs = @('--experimental-test-coverage') + $NodeArgs
}

$NodeArgs += $TestPaths

Write-Host "Running: node $($NodeArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

# Execute tests
$StartTime = Get-Date
try {
    & node $NodeArgs
    $ExitCode = $LASTEXITCODE
} catch {
    Write-Error "Test execution failed: $_"
    exit 1
}

$Duration = (Get-Date) - $StartTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TEST RUN COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Duration: $($Duration.TotalSeconds.ToString('F2'))s" -ForegroundColor Gray

if ($ExitCode -eq 0) {
    Write-Host "Status: PASSED" -ForegroundColor Green
} else {
    Write-Host "Status: FAILED" -ForegroundColor Red
}

exit $ExitCode
