#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Data Table Manager - Dynamic, self-mapping approach
Reads the page first, then decides what to do
"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'
TARGET_TABLE = 'supersystem-evaluation-dataset'

result = {}

def smart_action(page):
    global result

    def dismiss_overlays():
        """Dismiss any blocking overlays/modals"""
        for _ in range(3):
            try:
                dialogs = page.locator('[role="dialog"]:visible')
                if dialogs.count() > 0:
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(300)
            except:
                break

    def read_page_state():
        """Read and report current page state"""
        url = page.url
        print(f'\n[URL] {url}')

        # Get all visible buttons with text
        buttons = []
        for btn in page.locator('button:visible').all()[:10]:
            try:
                text = btn.inner_text().strip()[:40]
                if text and len(text) > 1:
                    buttons.append(text)
            except:
                pass
        if buttons:
            print(f'[BUTTONS] {buttons}')

        # Get all visible inputs
        inputs = []
        for inp in page.locator('input:visible').all()[:5]:
            try:
                ph = inp.get_attribute('placeholder') or ''
                val = inp.input_value()[:20] or ''
                inputs.append(f'{ph or "input"}={val}')
            except:
                pass
        if inputs:
            print(f'[INPUTS] {inputs}')

        # Get main text content (first few lines)
        try:
            text_lines = page.locator('main').inner_text().split('\n')[:10]
            meaningful = [l.strip() for l in text_lines if l.strip() and len(l.strip()) > 2]
            if meaningful:
                print(f'[CONTENT] {meaningful[:5]}')
        except:
            pass

        return url

    # === PHASE 1: Login ===
    print('=' * 60)
    print('PHASE 1: LOGIN')
    print('=' * 60)

    page.wait_for_selector('input', timeout=10000)
    read_page_state()

    # Fill login form
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)

    # Find and click the login button (largest primary button)
    login_btn = page.locator('button[class*="_primary_"]').first
    print('[ACTION] Clicking login button...')
    login_btn.click()

    page.wait_for_timeout(3000)
    page.wait_for_load_state('networkidle')
    dismiss_overlays()

    current_url = read_page_state()
    if '/signin' in current_url:
        result['error'] = 'Login failed'
        return

    result['logged_in'] = True

    # === PHASE 2: Navigate to Data Tables ===
    print('\n' + '=' * 60)
    print('PHASE 2: DATA TABLES')
    print('=' * 60)

    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    dismiss_overlays()

    current_url = read_page_state()

    # Check if target table exists
    target_visible = page.locator(f'text="{TARGET_TABLE}"').count() > 0
    print(f'\n[SEARCH] Looking for "{TARGET_TABLE}": {"FOUND" if target_visible else "NOT FOUND"}')

    if target_visible:
        # === PHASE 3A: Open existing table ===
        print('\n' + '=' * 60)
        print('PHASE 3A: OPENING EXISTING TABLE')
        print('=' * 60)

        # Click on the table name
        print(f'[ACTION] Clicking on "{TARGET_TABLE}"...')
        page.locator(f'text="{TARGET_TABLE}"').first.click()

        page.wait_for_timeout(2000)
        page.wait_for_load_state('networkidle')
        dismiss_overlays()

        current_url = read_page_state()

        # Extract table ID from URL
        if '/datatables/' in current_url or '/data-tables/' in current_url:
            parts = current_url.split('/datatables/')[-1].split('/data-tables/')[-1]
            table_id = parts.split('/')[0].split('?')[0]
            result['table_id'] = table_id
            result['table_name'] = TARGET_TABLE
            result['status'] = 'existing_table_opened'
            print(f'\n[SUCCESS] TABLE ID: {table_id}')
        else:
            result['status'] = 'opened_but_no_id'
            result['url'] = current_url

    else:
        # === PHASE 3B: Create new table ===
        print('\n' + '=' * 60)
        print('PHASE 3B: CREATING NEW TABLE')
        print('=' * 60)

        # Find create button
        create_btn = page.locator('button:has-text("Create")').first
        if create_btn.count() > 0:
            print('[ACTION] Clicking Create button...')
            create_btn.click()

            page.wait_for_timeout(2000)
            page.wait_for_load_state('networkidle')
            dismiss_overlays()

            current_url = read_page_state()

            # Look for name input
            name_input = page.locator('input:visible').first
            if name_input.count() > 0:
                print(f'[ACTION] Filling name: {TARGET_TABLE}')
                name_input.fill(TARGET_TABLE)
                page.wait_for_timeout(500)

                # Find submit button
                submit_btn = page.locator('button:has-text("Create"):visible, button[class*="_primary_"]:visible').first
                if submit_btn.count() > 0:
                    print('[ACTION] Submitting...')
                    submit_btn.click()

                    page.wait_for_timeout(3000)
                    page.wait_for_load_state('networkidle')
                    dismiss_overlays()

                    current_url = read_page_state()

                    if '/datatables/' in current_url and '/new' not in current_url:
                        table_id = current_url.split('/datatables/')[-1].split('/')[0]
                        result['table_id'] = table_id
                        result['status'] = 'created'
                        print(f'\n[SUCCESS] CREATED! TABLE ID: {table_id}')
                    else:
                        result['status'] = 'create_incomplete'
                        result['url'] = current_url
            else:
                result['status'] = 'no_input_found'
        else:
            result['status'] = 'no_create_button'

    print('\n' + '=' * 60)
    print('COMPLETE')
    print('=' * 60)

# Run
print('Smart Data Table Manager')
print(f'   Target: {TARGET_TABLE}')
print(f'   URL: {N8N_URL}')

try:
    DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=smart_action)

    print('\n' + '=' * 60)
    print('RESULT')
    print('=' * 60)
    for k, v in result.items():
        print(f'   {k}: {v}')

except Exception as e:
    print(f'\nERROR: {e}')
