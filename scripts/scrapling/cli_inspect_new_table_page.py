#!/usr/bin/env python3
"""Inspect the Data Table creation page to understand what fields are needed"""
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

    # Navigate to Data Tables
    print('[2/4] Navigating to Data Tables...')
    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Click Create to open the form
    print('[3/4] Opening Create form...')
    page.click('button:has-text("Create")')
    page.wait_for_timeout(2000)

    # Wait for drawer
    page.wait_for_selector('[role="dialog"]', timeout=5000)

    print('[4/4] Inspecting Create form...')
    print('\n=== DRAWER CONTENT ===')

    # Get all form elements in the drawer
    print('\n--- INPUT FIELDS ---')
    inputs = page.locator('[role="dialog"] input').all()
    for i, inp in enumerate(inputs):
        try:
            placeholder = inp.get_attribute('placeholder') or ''
            name = inp.get_attribute('name') or ''
            input_type = inp.get_attribute('type') or 'text'
            value = inp.input_value() or ''
            print(f'  {i}: type={input_type}, name="{name}", placeholder="{placeholder}", value="{value}"')
        except Exception as e:
            print(f'  {i}: Error - {e}')

    print('\n--- BUTTONS ---')
    buttons = page.locator('[role="dialog"] button').all()
    for i, btn in enumerate(buttons):
        try:
            text = btn.inner_text()[:30] if btn.inner_text() else '[no text]'
            classes = btn.get_attribute('class') or ''
            disabled = btn.get_attribute('disabled')
            print(f'  {i}: "{text}" | disabled={disabled} | class={classes[:50]}')
        except:
            pass

    print('\n--- SELECT/DROPDOWN FIELDS ---')
    selects = page.locator('[role="dialog"] select, [role="dialog"] .el-select').all()
    for i, sel in enumerate(selects):
        try:
            text = sel.inner_text()[:50] if sel.inner_text() else '[no text]'
            print(f'  {i}: {text}')
        except:
            pass

    print('\n--- ALL TEXT CONTENT ---')
    try:
        dialog_text = page.locator('[role="dialog"]').inner_text()
        lines = [l.strip() for l in dialog_text.split('\n') if l.strip()]
        for line in lines[:30]:
            print(f'  {line}')
    except:
        pass

    print('\n--- ERROR MESSAGES ---')
    errors = page.locator('[role="dialog"] .el-form-item__error, [role="dialog"] .error, [role="dialog"] [class*="error"]').all()
    for err in errors:
        try:
            print(f'  ERROR: {err.inner_text()}')
        except:
            pass

# Run
print('Inspecting Data Table Creation Form...')
DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=inspect_action)
