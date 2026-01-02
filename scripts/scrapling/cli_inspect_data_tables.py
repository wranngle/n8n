#!/usr/bin/env python3
"""Inspect Data Tables page elements after login"""
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
    page.wait_for_timeout(2000)
    print(f'  URL: {page.url}')

    # Inspect all buttons and clickable elements
    print('[3/3] Inspecting elements...')
    print('\n--- BUTTONS ---')
    buttons = page.locator('button').all()
    for i, btn in enumerate(buttons[:20]):
        try:
            text = btn.inner_text()[:50] if btn.inner_text() else '[no text]'
            classes = btn.get_attribute('class') or '[no class]'
            print(f'  {i}: "{text}" | {classes[:80]}')
        except:
            pass

    print('\n--- LINKS ---')
    links = page.locator('a').all()
    for i, link in enumerate(links[:15]):
        try:
            text = link.inner_text()[:30] if link.inner_text() else '[no text]'
            href = link.get_attribute('href') or '[no href]'
            print(f'  {i}: "{text}" -> {href}')
        except:
            pass

    print('\n--- DATA-TEST-IDs ---')
    test_els = page.locator('[data-test-id]').all()
    for el in test_els[:20]:
        try:
            test_id = el.get_attribute('data-test-id')
            tag = el.evaluate('el => el.tagName')
            print(f'  {tag}: {test_id}')
        except:
            pass

# Run
print('Inspecting n8n Data Tables page...')
DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=inspect_action)
