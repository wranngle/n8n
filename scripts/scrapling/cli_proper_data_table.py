#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data Table Manager using Playwright Best Practices
Based on: https://playwright.dev/python/docs/locators

Key insight: Use semantic locators (get_by_role, get_by_label, get_by_text)
instead of CSS selectors for resilient automation.
"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'
TARGET_TABLE = 'supersystem-evaluation-dataset'

result = {}

def proper_action(page):
    global result

    # === PHASE 1: Login using semantic locators ===
    print('=' * 60)
    print('PHASE 1: LOGIN (using get_by_role/get_by_label)')
    print('=' * 60)

    # Wait for page to load
    page.wait_for_load_state('networkidle')

    # Use get_by_label for form fields (Playwright best practice)
    print('[1] Filling email by label/placeholder...')
    email_input = page.get_by_placeholder('Enter your email or LDAP login')
    if email_input.count() == 0:
        # Fallback: try by role
        email_input = page.get_by_role('textbox').first
    email_input.fill(EMAIL)

    print('[2] Filling password by placeholder...')
    password_input = page.get_by_placeholder('Enter your password')
    if password_input.count() == 0:
        password_input = page.locator('input[type="password"]')
    password_input.fill(PASSWORD)

    # Use get_by_role for buttons (Playwright best practice)
    print('[3] Clicking Sign in button by role...')
    sign_in_btn = page.get_by_role('button', name='Sign in')
    sign_in_btn.click()

    page.wait_for_timeout(3000)
    page.wait_for_load_state('networkidle')

    # Dismiss overlays using Escape
    for _ in range(3):
        try:
            if page.locator('[role="dialog"]:visible').count() > 0:
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)
        except:
            break

    print(f'[OK] Logged in: {page.url}')
    result['logged_in'] = True

    # === PHASE 2: Navigate to Data Tables ===
    print('\n' + '=' * 60)
    print('PHASE 2: DATA TABLES')
    print('=' * 60)

    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Dismiss overlays
    for _ in range(3):
        try:
            if page.locator('[role="dialog"]:visible').count() > 0:
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)
        except:
            break

    print(f'[OK] At Data Tables: {page.url}')

    # === PHASE 3: Find or Create Table ===
    print('\n' + '=' * 60)
    print('PHASE 3: FIND OR CREATE TABLE')
    print('=' * 60)

    # Use get_by_text to find the target table
    target_locator = page.get_by_text(TARGET_TABLE, exact=True)
    table_exists = target_locator.count() > 0

    print(f'[SEARCH] "{TARGET_TABLE}": {"FOUND" if table_exists else "NOT FOUND"}')

    if table_exists:
        # Click on the table using text locator
        print(f'[ACTION] Opening existing table...')
        target_locator.first.click()

        page.wait_for_timeout(2000)
        page.wait_for_load_state('networkidle')

        # Dismiss overlays
        for _ in range(2):
            try:
                if page.locator('[role="dialog"]:visible').count() > 0:
                    page.keyboard.press('Escape')
                    page.wait_for_timeout(300)
            except:
                break

        # Extract ID from URL
        current_url = page.url
        if '/datatables/' in current_url and '/new' not in current_url:
            table_id = current_url.split('/datatables/')[-1].split('/')[0].split('?')[0]
            result['table_id'] = table_id
            result['table_name'] = TARGET_TABLE
            result['status'] = 'existing'
            print(f'[SUCCESS] TABLE ID: {table_id}')
        else:
            result['status'] = 'opened_unknown_url'
            result['url'] = current_url

    else:
        # Create new table using get_by_role for the button
        print(f'[ACTION] Creating new table...')

        # Best practice: use role-based locator for button
        create_btn = page.get_by_role('button', name='Create data table')
        if create_btn.count() == 0:
            create_btn = page.get_by_role('button', name='Create')

        create_btn.click()

        page.wait_for_timeout(2000)
        page.wait_for_load_state('networkidle')

        # Dismiss overlays
        for _ in range(2):
            if page.locator('[role="dialog"]:visible').count() > 0:
                page.keyboard.press('Escape')
                page.wait_for_timeout(300)

        # Fill the name using semantic locators
        print(f'[ACTION] Filling table name: {TARGET_TABLE}')

        # Try by placeholder first, then by label, then by role
        name_input = page.get_by_placeholder('Enter data table name')
        if name_input.count() == 0:
            name_input = page.get_by_label('Name')
        if name_input.count() == 0:
            name_input = page.get_by_role('textbox').first

        name_input.fill(TARGET_TABLE)
        page.wait_for_timeout(500)

        # Submit using role-based button
        print('[ACTION] Submitting...')
        submit_btn = page.get_by_role('button', name='Create')
        submit_btn.click()

        page.wait_for_timeout(3000)
        page.wait_for_load_state('networkidle')

        current_url = page.url
        if '/datatables/' in current_url and '/new' not in current_url:
            table_id = current_url.split('/datatables/')[-1].split('/')[0]
            result['table_id'] = table_id
            result['status'] = 'created'
            print(f'[SUCCESS] CREATED! TABLE ID: {table_id}')
        else:
            result['status'] = 'create_incomplete'
            result['url'] = current_url

    print('\n' + '=' * 60)
    print('COMPLETE')
    print('=' * 60)

# Run
print('Data Table Manager (Playwright Best Practices)')
print(f'   Target: {TARGET_TABLE}')
print(f'   URL: {N8N_URL}')
print('')

try:
    DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=proper_action)

    print('\n' + '=' * 60)
    print('RESULT')
    print('=' * 60)
    for k, v in result.items():
        print(f'   {k}: {v}')

except Exception as e:
    print(f'\nERROR: {e}')
    import traceback
    traceback.print_exc()
