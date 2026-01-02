#!/usr/bin/env python3
"""Thoroughly inspect the /datatables/new page structure"""
from scrapling import DynamicFetcher

N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'

def inspect_action(page):
    # Login
    print('[1/4] Logging in...')
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[class*="_primary_"][class*="_large_"]')
    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')
    print(f'  URL: {page.url}')

    # Dismiss version panel
    try:
        page.keyboard.press('Escape')
        page.wait_for_timeout(500)
    except:
        pass

    # Navigate directly to new data table page
    print('[2/4] Navigating directly to /datatables/new...')
    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)

    # Click Create
    print('[3/4] Clicking Create...')
    page.click('button:has-text("Create")')
    page.wait_for_timeout(3000)
    page.wait_for_load_state('networkidle')

    # Dismiss version panel again if needed
    try:
        version_panel = page.locator('[data-test-id="version-updates-panel"]')
        if version_panel.count() > 0:
            print('  Dismissing version panel...')
            page.keyboard.press('Escape')
            page.wait_for_timeout(1000)
    except:
        pass

    print(f'\n[4/4] Inspecting page: {page.url}')

    print('\n=== ALL INPUTS ON PAGE ===')
    all_inputs = page.locator('input').all()
    for i, inp in enumerate(all_inputs):
        try:
            inp_type = inp.get_attribute('type') or 'text'
            placeholder = inp.get_attribute('placeholder') or ''
            name = inp.get_attribute('name') or ''
            value = inp.input_value() or ''
            visible = inp.is_visible()
            print(f'  {i}: type={inp_type}, visible={visible}, placeholder="{placeholder}", name="{name}", value="{value[:30]}"')
        except Exception as e:
            print(f'  {i}: Error - {e}')

    print('\n=== ALL BUTTONS ON PAGE ===')
    all_btns = page.locator('button').all()
    for i, btn in enumerate(all_btns[:15]):
        try:
            text = btn.inner_text()[:30] if btn.inner_text() else '[no text]'
            visible = btn.is_visible()
            disabled = btn.get_attribute('disabled')
            print(f'  {i}: "{text}" | visible={visible} | disabled={disabled}')
        except:
            pass

    print('\n=== PAGE STRUCTURE ===')
    try:
        # Check for main content areas
        main = page.locator('main')
        if main.count() > 0:
            print(f'  main: {main.count()} elements')

        # Check for form
        forms = page.locator('form')
        if forms.count() > 0:
            print(f'  forms: {forms.count()} elements')
            for i, form in enumerate(forms.all()[:3]):
                inputs_in_form = form.locator('input').count()
                print(f'    form[{i}] has {inputs_in_form} inputs')

        # Check for dialogs
        dialogs = page.locator('[role="dialog"]')
        if dialogs.count() > 0:
            print(f'  dialogs: {dialogs.count()} elements')
            for i, dlg in enumerate(dialogs.all()[:3]):
                test_id = dlg.get_attribute('data-test-id') or ''
                print(f'    dialog[{i}]: data-test-id="{test_id}"')

    except Exception as e:
        print(f'  Error: {e}')

    print('\n=== VISIBLE TEXT CONTENT (first 50 lines) ===')
    try:
        text = page.locator('body').inner_text()
        lines = [l.strip() for l in text.split('\n') if l.strip() and len(l.strip()) > 2]
        for line in lines[:50]:
            print(f'  {line}')
    except:
        pass

    print('\n=== URL HISTORY ===')
    print(f'  Current URL: {page.url}')

# Run
print('Inspecting Data Table creation page...')
DynamicFetcher.fetch(N8N_URL, headless=False, network_idle=True, page_action=inspect_action)
