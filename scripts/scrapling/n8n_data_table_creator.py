#!/usr/bin/env python3
"""
n8n Data Table Creator via Scrapling UI Automation

Uses Scrapling's DynamicFetcher with page_action for full browser interaction
to create Data Tables in n8n when no API is available.

Architecture:
- Scrapling DynamicFetcher provides stealth browsing
- page_action parameter receives Playwright Page object
- Full Playwright API available for form filling, clicking, etc.

Usage:
    python n8n_data_table_creator.py --name "table-name" --csv path/to/data.csv
    python n8n_data_table_creator.py --name "test-table" --visible
"""

import sys
import os
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Load environment variables
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

N8N_URL = os.getenv('N8N_API_URL', 'https://n8n.wranngle.com')
N8N_EMAIL = os.getenv('N8N_WEB_EMAIL')
N8N_PASSWORD = os.getenv('N8N_WEB_PASSWORD')

# Store results from page_action (closure workaround)
automation_result = {}


def create_data_table_action(page):
    """
    Playwright page_action function that performs the actual automation.

    This function receives a Playwright Page object and can use:
    - page.fill(selector, value) - Fill form fields
    - page.click(selector) - Click elements
    - page.wait_for_selector(selector) - Wait for elements
    - page.locator(selector) - Get element locators
    - page.url - Get current URL

    Args:
        page: Playwright Page object
    """
    global automation_result

    try:
        print("\n[1/5] Waiting for login page...")
        # Wait for login form
        page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)
        print("  Login form detected")

        print("\n[2/5] Logging in...")
        # Fill email
        page.fill('input[name="emailOrLdapLoginId"]', N8N_EMAIL)
        print(f"  Email entered: {N8N_EMAIL}")

        # Fill password
        page.fill('input[name="password"]', N8N_PASSWORD)
        print("  Password entered: ****")

        # Click login button
        page.click('button[type="submit"]')
        print("  Login submitted")

        # Wait for dashboard/redirect
        page.wait_for_load_state('networkidle')
        print(f"  Current URL: {page.url}")

        # Check if login succeeded
        if '/signin' in page.url or '/login' in page.url:
            automation_result['status'] = 'error'
            automation_result['error'] = 'Login failed - still on login page'
            return

        print("  Login successful!")

        print("\n[3/5] Navigating to Data Tables...")
        page.goto(f"{N8N_URL}/data-tables")
        page.wait_for_load_state('networkidle')
        print(f"  Current URL: {page.url}")

        # Store URL for later reference
        automation_result['final_url'] = page.url
        automation_result['status'] = 'login_success'

    except Exception as e:
        automation_result['status'] = 'error'
        automation_result['error'] = str(e)


def login_only_action(page):
    """
    Simple login action for testing authentication.
    """
    global automation_result

    try:
        print("\n[1/2] Waiting for login page...")
        page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)

        print("\n[2/2] Performing login...")
        page.fill('input[name="emailOrLdapLoginId"]', N8N_EMAIL)
        page.fill('input[name="password"]', N8N_PASSWORD)
        page.click('button[type="submit"]')

        # Wait for navigation
        page.wait_for_load_state('networkidle')

        automation_result['final_url'] = page.url
        automation_result['logged_in'] = '/signin' not in page.url and '/login' not in page.url
        automation_result['status'] = 'success' if automation_result['logged_in'] else 'login_failed'

        print(f"  Final URL: {page.url}")
        print(f"  Login success: {automation_result['logged_in']}")

    except Exception as e:
        automation_result['status'] = 'error'
        automation_result['error'] = str(e)


def test_login(headless: bool = True):
    """
    Test login to n8n via Scrapling DynamicFetcher.

    Returns:
        dict with login status and final URL
    """
    global automation_result
    automation_result = {}

    from scrapling import DynamicFetcher

    print(f"Testing login to: {N8N_URL}")
    print(f"Email: {N8N_EMAIL}")
    print(f"Headless: {headless}")

    try:
        # Fetch with page_action for automation
        page = DynamicFetcher.fetch(
            N8N_URL,
            headless=headless,
            network_idle=True,
            page_action=login_only_action
        )

        print(f"\n[Result] Page status: {page.status}")
        print(f"[Result] Final state: {automation_result}")

        return automation_result

    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


def create_data_table(table_name: str, csv_path: str = None, headless: bool = True):
    """
    Create a Data Table in n8n via browser automation.

    Args:
        table_name: Name for the new Data Table
        csv_path: Optional path to CSV file to import
        headless: Run browser in headless mode

    Returns:
        dict with table_id, status, and any errors
    """
    global automation_result
    automation_result = {'table_name': table_name}

    from scrapling import DynamicFetcher

    print(f"Creating Data Table: {table_name}")
    print(f"n8n URL: {N8N_URL}")
    print(f"Headless: {headless}")

    def full_automation(page):
        """Complete automation: login + create table."""
        global automation_result

        try:
            # Step 1: Login
            print("\n[1/6] Waiting for login page...")
            page.wait_for_selector('input[name="emailOrLdapLoginId"]', timeout=10000)

            print("\n[2/6] Logging in...")
            page.fill('input[name="emailOrLdapLoginId"]', N8N_EMAIL)
            page.fill('input[name="password"]', N8N_PASSWORD)
            page.click('button[type="submit"]')
            page.wait_for_load_state('networkidle')

            if '/signin' in page.url:
                automation_result['error'] = 'Login failed'
                return
            print("  Login successful!")

            # Step 2: Navigate to Data Tables
            print("\n[3/6] Navigating to Data Tables...")
            page.goto(f"{N8N_URL}/data-tables")
            page.wait_for_load_state('networkidle')

            # Step 3: Click Create button
            print("\n[4/6] Creating new Data Table...")
            # Look for create button (n8n UI varies)
            create_selectors = [
                'button:has-text("Create")',
                'button:has-text("New")',
                '[data-test-id="create-data-table"]',
                '.n8n-button--primary'
            ]

            for selector in create_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.click(selector)
                        print(f"  Clicked: {selector}")
                        break
                except:
                    continue

            page.wait_for_timeout(1000)

            # Step 4: Enter table name
            print(f"\n[5/6] Entering table name: {table_name}")
            name_selectors = [
                'input[placeholder*="name"]',
                'input[name="name"]',
                '.n8n-input input',
                'input[type="text"]'
            ]

            for selector in name_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        page.fill(selector, table_name)
                        print(f"  Filled: {selector}")
                        break
                except:
                    continue

            # Step 5: Submit
            page.click('button:has-text("Create")')
            page.wait_for_load_state('networkidle')

            # Step 6: Extract table ID from URL
            print("\n[6/6] Extracting Data Table ID...")
            current_url = page.url

            if '/data-tables/' in current_url:
                parts = current_url.split('/data-tables/')[-1].split('/')[0].split('?')[0]
                automation_result['table_id'] = parts
                automation_result['url'] = current_url
                automation_result['status'] = 'success'
                print(f"  Table ID: {parts}")
            else:
                automation_result['status'] = 'partial'
                automation_result['note'] = 'Table may be created but ID not extracted'

        except Exception as e:
            automation_result['status'] = 'error'
            automation_result['error'] = str(e)

    try:
        page = DynamicFetcher.fetch(
            N8N_URL,
            headless=headless,
            network_idle=True,
            page_action=full_automation
        )

        return automation_result

    except Exception as e:
        return {
            "status": "error",
            "table_name": table_name,
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="n8n Data Table automation via Scrapling")
    parser.add_argument("--name", "-n", help="Data Table name to create")
    parser.add_argument("--csv", "-c", help="Path to CSV file to import")
    parser.add_argument("--visible", "-v", action="store_true", help="Show browser (not headless)")
    parser.add_argument("--test-login", "-t", action="store_true", help="Only test login")

    args = parser.parse_args()

    if not N8N_EMAIL or not N8N_PASSWORD:
        print("ERROR: N8N_WEB_EMAIL and N8N_WEB_PASSWORD must be set in .env")
        sys.exit(1)

    if args.test_login:
        result = test_login(headless=not args.visible)
    elif args.name:
        result = create_data_table(
            table_name=args.name,
            csv_path=args.csv,
            headless=not args.visible
        )
    else:
        print("ERROR: Either --name or --test-login required")
        parser.print_help()
        sys.exit(1)

    print("\n" + "=" * 50)
    print("RESULT")
    print("=" * 50)
    for key, value in result.items():
        print(f"  {key}: {value}")


if __name__ == "__main__":
    main()
