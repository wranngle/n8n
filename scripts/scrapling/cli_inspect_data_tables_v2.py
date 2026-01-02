#!/usr/bin/env python3
"""Inspect Data Tables page - full content"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'

def inspect_action(page):
    # Login first
    print('[1/3] Logging in...')
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[class*="_primary_"][class*="_large_"]')
    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')
    print(f'  Logged in: {page.url}')

    # Navigate to Data Tables
    print('[2/3] Navigating to Data Tables...')
    page.goto(f'{N8N_URL}/data-tables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(3000)
    print(f'  URL: {page.url}')

    # Get full page text content
    print('[3/3] Page text content:')
    print('-' * 50)
    try:
        # Get main content area
        body_text = page.locator('body').inner_text()
        # Filter and print meaningful lines
        lines = [l.strip() for l in body_text.split('\n') if l.strip() and len(l.strip()) > 2]
        for line in lines[:50]:
            print(f'  {line}')
    except Exception as e:
        print(f'Error getting text: {e}')

    print('\n--- ALL VISIBLE TEXT ON PAGE ---')
    try:
        all_text = page.evaluate('() => document.body.innerText')
        print(all_text[:2000])
    except:
        pass

    # Check if there's any "data table" related content
    print('\n--- SEARCHING FOR "data" TEXT ---')
    elements = page.locator('*:has-text("data")').all()[:10]
    for el in elements:
        try:
            text = el.inner_text()[:100]
            if 'data' in text.lower():
                print(f'  Found: {text}')
        except:
            pass

# Run
print('Full inspection of n8n Data Tables page...')
DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=inspect_action)
