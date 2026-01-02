#!/usr/bin/env python3
"""Find Data Tables navigation in n8n"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'

def inspect_action(page):
    # Login first
    print('[1/4] Logging in...')
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[class*="_primary_"][class*="_large_"]')
    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')
    print(f'  Logged in: {page.url}')

    # Check sidebar/navigation for Data Tables
    print('[2/4] Looking for sidebar navigation...')

    # Get all navigation links
    print('\n--- ALL LINKS ON PAGE ---')
    links = page.locator('a').all()
    for link in links[:30]:
        try:
            href = link.get_attribute('href') or ''
            text = link.inner_text()[:40] if link.inner_text() else ''
            if href and text:
                print(f'  {text} -> {href}')
        except:
            pass

    # Look for sidebar or nav elements
    print('\n--- NAVIGATION ELEMENTS ---')
    nav_selectors = [
        'nav', '.sidebar', '[class*="sidebar"]', '[class*="menu"]',
        '[class*="navigation"]', '[role="navigation"]'
    ]
    for selector in nav_selectors:
        try:
            els = page.locator(selector).all()
            if els:
                print(f'  Found {len(els)} elements matching: {selector}')
                for el in els[:3]:
                    text = el.inner_text()[:100]
                    print(f'    Content: {text}')
        except:
            pass

    # Try different URL paths
    print('\n[3/4] Testing different URLs...')
    test_urls = [
        '/home/data-tables',
        '/home/tables',
        '/tables',
        '/settings/data-tables',
        '/admin/data-tables'
    ]

    for url_path in test_urls:
        try:
            full_url = f'{N8N_URL}{url_path}'
            page.goto(full_url)
            page.wait_for_timeout(1000)

            # Check if it's a 404
            text = page.locator('body').inner_text()
            is_404 = '404' in text or 'not found' in text.lower()
            print(f'  {url_path}: {"404" if is_404 else "OK - " + page.url}')
        except Exception as e:
            print(f'  {url_path}: Error - {e}')

    # Check Settings menu
    print('\n[4/4] Checking Settings page...')
    page.goto(f'{N8N_URL}/settings')
    page.wait_for_timeout(2000)

    text = page.locator('body').inner_text()[:1000]
    print(f'Settings page content:\n{text}')

# Run
print('Finding Data Tables in n8n...')
DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=inspect_action)
