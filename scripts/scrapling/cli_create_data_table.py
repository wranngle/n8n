#!/usr/bin/env python3
"""
n8n Data Table Creator via Scrapling CLI
Run: scrapling shell -c "exec(open('scripts/scrapling/cli_create_data_table.py').read())"
"""
from scrapling import DynamicFetcher
import os

# Configuration
N8N_URL = 'https://n8n.wranngle.com'
EMAIL = 'n8n@wranngle.com'
PASSWORD = 'UuwBG5CtXnQ1vi'
TABLE_NAME = os.getenv('TABLE_NAME', 'supersystem-evaluation-dataset')

result_data = {}

def create_data_table_action(page):
    global result_data

    # Step 1: Wait for login page
    print('[1/6] Waiting for login form...')
    page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)

    # Step 2: Login
    print('[2/6] Logging in...')
    page.fill('input[name="emailOrLdapLoginId"]', EMAIL)
    page.fill('input[name="password"]', PASSWORD)
    page.click('button[class*="_primary_"][class*="_large_"]')
    page.wait_for_timeout(2000)
    page.wait_for_load_state('networkidle')

    if '/signin' in page.url:
        result_data['error'] = 'Login failed'
        return
    print(f'  Logged in! URL: {page.url}')

    # Dismiss version updates panel if present
    try:
        version_panel = page.locator('[data-test-id="version-updates-panel"]')
        if version_panel.count() > 0:
            print('  Dismissing version updates panel...')
            # Try to close it - look for close button or click outside
            close_btn = page.locator('[data-test-id="version-updates-panel"] button[class*="close"], .el-drawer__close-btn').first
            if close_btn.count() > 0:
                close_btn.click()
            else:
                # Press Escape to close
                page.keyboard.press('Escape')
            page.wait_for_timeout(500)
    except:
        pass

    # Step 3: Navigate to Data Tables (correct path is /home/datatables)
    print('[3/6] Navigating to Data Tables...')
    page.goto(f'{N8N_URL}/home/datatables')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(2000)
    print(f'  URL: {page.url}')

    # Step 4: Click Create button
    print('[4/6] Looking for Create button...')
    # Take snapshot to find the button
    create_selectors = [
        'button:has-text("Create")',
        'button:has-text("New")',
        'button:has-text("Add")',
        '[data-test-id*="create"]',
        'button[class*="_primary_"]'
    ]

    clicked = False
    for selector in create_selectors:
        try:
            if page.locator(selector).count() > 0:
                page.click(selector, timeout=5000)
                clicked = True
                print(f'  Clicked: {selector}')
                break
        except Exception as e:
            continue

    if not clicked:
        # Maybe we need to look at the actual page content
        print('  No create button found, checking page content...')
        result_data['note'] = 'Create button not found - may need manual inspection'
        result_data['current_url'] = page.url
        return

    page.wait_for_timeout(1500)

    # Check if we navigated to a full page or opened a modal
    current_url = page.url
    is_full_page = '/datatables/new' in current_url
    print(f'  Current URL: {current_url}')
    print(f'  Form type: {"Full page" if is_full_page else "Modal/Drawer"}')

    # Dismiss any version updates panel that might be open
    try:
        version_panel = page.locator('[data-test-id="version-updates-panel"]')
        if version_panel.count() > 0:
            print('  Dismissing version updates panel...')
            page.keyboard.press('Escape')
            page.wait_for_timeout(500)
    except:
        pass

    # Step 5: Fill table name
    print(f'[5/6] Entering table name: {TABLE_NAME}')

    if is_full_page:
        # Full page form - look for inputs on the main page
        name_selectors = [
            'input[placeholder*="name" i]',
            'input[placeholder*="Name" i]',
            'main input[type="text"]',
            '.el-input input',
            'input[type="text"]'
        ]
    else:
        # Modal form - look for inputs inside the drawer (excluding version panel)
        name_selectors = [
            '.el-drawer:not([data-test-id="version-updates-panel"]) input[type="text"]',
            '[role="dialog"]:not([data-test-id="version-updates-panel"]) input[type="text"]',
            'input[placeholder*="name" i]',
            'input[placeholder*="Name" i]',
            '.el-input input'
        ]

    filled = False
    for selector in name_selectors:
        try:
            inputs = page.locator(selector)
            if inputs.count() > 0:
                # Clear first, then fill
                inputs.first.clear()
                inputs.first.fill(TABLE_NAME)
                filled = True
                print(f'  Filled: {selector}')
                break
        except Exception as e:
            continue

    if not filled:
        result_data['note'] = 'Name input not found'
        result_data['url'] = page.url
        return

    page.wait_for_timeout(500)

    # Step 6: Submit
    print('[6/6] Submitting...')

    if is_full_page:
        # Full page - look for submit button on main page
        submit_selectors = [
            'main button:has-text("Create")',
            'main button:has-text("Save")',
            'button[class*="_primary_"]:has-text("Create")',
            'button[class*="_primary_"]:has-text("Save")',
            'form button[type="submit"]',
            'button:has-text("Create")'
        ]
    else:
        # Modal - look for submit in drawer (excluding version panel)
        submit_selectors = [
            '.el-drawer:not([data-test-id="version-updates-panel"]) button:has-text("Create")',
            '.el-drawer:not([data-test-id="version-updates-panel"]) button[class*="_primary_"]',
            '[role="dialog"]:not([data-test-id="version-updates-panel"]) button:has-text("Create")',
            'button:has-text("Create")'
        ]

    submitted = False
    for selector in submit_selectors:
        try:
            btn = page.locator(selector)
            if btn.count() > 0:
                btn.first.click(timeout=5000)
                submitted = True
                print(f'  Clicked submit: {selector}')
                break
        except Exception as e:
            print(f'  Failed: {selector} - {e}')
            continue

    if not submitted:
        # Last resort: try keyboard submit
        print('  Trying keyboard submit (Enter)...')
        try:
            page.keyboard.press('Enter')
            submitted = True
        except:
            pass

    if not submitted:
        result_data['note'] = 'Could not click submit button'
        result_data['url'] = page.url
        return

    page.wait_for_timeout(3000)
    page.wait_for_load_state('networkidle')

    # Extract table ID from URL
    final_url = page.url
    print(f'  Final URL: {final_url}')

    # Check various URL patterns for success
    if '/datatables/' in final_url and '/new' not in final_url:
        # Pattern: /datatables/{id} or /datatables/{id}/...
        table_id = final_url.split('/datatables/')[-1].split('/')[0].split('?')[0]
        result_data['table_id'] = table_id
        result_data['url'] = final_url
        result_data['status'] = 'success'
        print(f'  SUCCESS! Table ID: {table_id}')
    elif '/data-tables/' in final_url:
        # Alternative pattern
        table_id = final_url.split('/data-tables/')[-1].split('/')[0].split('?')[0]
        result_data['table_id'] = table_id
        result_data['url'] = final_url
        result_data['status'] = 'success'
        print(f'  SUCCESS! Table ID: {table_id}')
    elif '/new' in final_url:
        # Still on creation page - maybe there was an error
        result_data['status'] = 'form_error'
        result_data['url'] = final_url
        # Check for error messages
        try:
            errors = page.locator('.el-form-item__error, .error, [class*="error"]').all_text_contents()
            if errors:
                result_data['errors'] = errors
                print(f'  Form errors: {errors}')
        except:
            pass
    else:
        result_data['status'] = 'unknown'
        result_data['url'] = final_url

# Run the automation
print(f'Creating Data Table: {TABLE_NAME}')
print(f'n8n URL: {N8N_URL}')
print('='*50)

try:
    page = DynamicFetcher.fetch(
        N8N_URL,
        headless=False,
        network_idle=True,
        page_action=create_data_table_action
    )

    print('\n' + '='*50)
    print('RESULT')
    print('='*50)
    for k, v in result_data.items():
        print(f'  {k}: {v}')

except Exception as e:
    print(f'ERROR: {e}')
