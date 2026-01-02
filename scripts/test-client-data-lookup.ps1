$baseUrl = 'https://n8n.wranngle.com/webhook/client-lookup-test'

$testCases = @(
    @{
        name = "Known Client - John Smith"
        payload = @{ phone = '+15551234567' }
        expected = @{ success = $true; client = @{ first_name = 'John' } }
    },
    @{
        name = "Known Client - Jane Doe"
        payload = @{ phone = '+15559876543' }
        expected = @{ success = $true; client = @{ first_name = 'Jane' } }
    },
    @{
        name = "Unknown Phone Number"
        payload = @{ phone = '+15550000000' }
        expected = @{ success = $true; client = $null }
    },
    @{
        name = "Empty Phone"
        payload = @{ phone = '' }
        expected = @{ success = $true; client = $null }
    },
    @{
        name = "Email Lookup (not implemented)"
        payload = @{ email = 'john@acme.com' }
        expected = @{ success = $true; client = $null }
    },
    @{
        name = "Both Phone and Email"
        payload = @{ phone = '+15551234567'; email = 'john@acme.com' }
        expected = @{ success = $true; client = @{ first_name = 'John' } }
    }
)

$results = @()
$passed = 0
$failed = 0

Write-Host "=== CLIENT DATA LOOKUP TEST SUITE ===" -ForegroundColor Cyan
Write-Host "Endpoint: $baseUrl"
Write-Host ""

foreach ($test in $testCases) {
    Write-Host "Test: $($test.name)" -ForegroundColor Yellow
    
    try {
        $body = $test.payload | ConvertTo-Json -Compress
        $response = Invoke-RestMethod -Uri $baseUrl -Method POST -Body $body -ContentType 'application/json'
        
        # Check if response matches expected
        $testPassed = $true
        
        if ($response.success -ne $test.expected.success) {
            $testPassed = $false
            Write-Host "  FAIL: success mismatch" -ForegroundColor Red
        }
        
        if ($null -eq $test.expected.client) {
            if ($null -ne $response.client) {
                $testPassed = $false
                Write-Host "  FAIL: expected null client" -ForegroundColor Red
            }
        } else {
            if ($null -eq $response.client) {
                $testPassed = $false
                Write-Host "  FAIL: expected non-null client" -ForegroundColor Red
            } elseif ($response.client.first_name -ne $test.expected.client.first_name) {
                $testPassed = $false
                Write-Host "  FAIL: first_name mismatch" -ForegroundColor Red
            }
        }
        
        if ($testPassed) {
            Write-Host "  PASS" -ForegroundColor Green
            $passed++
        } else {
            $failed++
        }
        
        $results += @{
            test = $test.name
            status = if ($testPassed) { 'PASS' } else { 'FAIL' }
            response = $response
        }
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
        $results += @{
            test = $test.name
            status = 'ERROR'
            error = $_.Exception.Message
        }
    }
    
    Write-Host ""
}

Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Passed: $passed / $($testCases.Count)" -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { 'Red' } else { 'Green' })

# Return exit code based on failures
if ($failed -gt 0) {
    exit 1
}
