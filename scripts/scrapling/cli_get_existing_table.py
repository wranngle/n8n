#!/usr/bin/env python3
"""Get the ID of an existing data table by clicking on it"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'
TABLE_NAME = 'supersystem-evaluation-dataset'

result_data = {}

def get_table_action(page):
    global result_data

    # Login
    print('[1/3] Logging in...')
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[class*="_primary_"][class*="_large_"]')
    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')
    print(f'  URL: {page.url}')

    # Dismiss any panels
    try:
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    except:
        pass

    # Navigate to Data Tables
    print('[2/3] Navigating to Data Tables...')
    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    print(f'  URL: {page.url}')

    # Dismiss any panels again
    try:
        page.keyboard.press('Escape')
        page.wait_for_timeout(300)
    except:
        pass

    # Find and click on the existing table
    print(f'[3/3] Looking for table: {TABLE_NAME}')

    # Try to find the table row/link
    table_selectors = [
        f'a:has-text("{TABLE_NAME}")',
        f'[data-test-id*="data-table"]:has-text("{TABLE_NAME}")',
        f'tr:has-text("{TABLE_NAME}")',
        f'div:has-text("{TABLE_NAME}")'
    ]

    clicked = False
    for selector in table_selectors:
        try:
            el = page.locator(selector)
            if el.count() > 0:
                el.first.click(timeout=5000)
                clicked = True
                print(f'  Clicked: {selector}')
                break
        except Exception as e:
            print(f'  Failed: {selector} - {e}')
            continue

    if not clicked:
        print('  Could not find table to click')
        result_data['status'] = 'not_found'
        return

    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')

    # Extract table ID from URL
    current_url = page.url
    print(f'  Final URL: {current_url}')

    # URL patterns: /datatables/{id} or /data-tables/{id}
    if '/datatables/' in current_url:
        table_id = current_url.split('/datatables/')[-1].split('/')[0].split('?')[0]
        result_data['table_id'] = table_id
        result_data['url'] = current_url
        result_data['status'] = 'found'
        print(f'  TABLE ID: {table_id}')
    elif '/data-tables/' in current_url:
        table_id = current_url.split('/data-tables/')[-1].split('/')[0].split('?')[0]
        result_data['table_id'] = table_id
        result_data['url'] = current_url
        result_data['status'] = 'found'
        print(f'  TABLE ID: {table_id}')
    else:
        result_data['status'] = 'unknown_url'
        result_data['url'] = current_url

# Run
print(f'Getting Data Table ID for: {TABLE_NAME}')
print('='*50)

try:
    DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=get_table_action)

    print('\n' + '='*50)
    print('RESULT')
    print('='*50)
    for k, v in result_data.items():
        print(f'  {k}: {v}')

except Exception as e:
    print(f'ERROR: {e}')
