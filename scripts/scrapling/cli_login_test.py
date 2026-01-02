#!/usr/bin/env python3
"""CLI-compatible login test for scrapling shell -c"""
from scrapling import DynamicFetcher

def login_action(page):
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
    print('Filling email...')
    page.fill('input[name="emailOrLdapLoginId"]', 'n8n@wranngle.com')
    print('Filling password...')
    page.fill('input[name="password"]', 'UuwBG5CtXnQ1vi')
    # Login button has class with _primary_ and _large_ parts (hashed CSS modules)
    print('Clicking login button...')
    page.click('button[class*="_primary_"][class*="_large_"]')
    print('Waiting for navigation...')
    # Wait longer for any redirect
    page.wait_for_timeout(3000)
    page.wait_for_load_state('networkidle')
    print('URL after login:', page.url)
    # Check for any error messages
    errors = page.locator('.el-message--error, .error, [class*="error"]').all()
    if errors:
        print(f'Found {len(errors)} error elements')
    return '/signin' not in page.url

result = DynamicFetcher.fetch('https://n8n.wranngle.com', headless=False, network_idle=True, page_action=login_action)
print('Final status:', result.status)
print('Login successful!' if '/signin' not in str(result.url) else 'Login failed')
