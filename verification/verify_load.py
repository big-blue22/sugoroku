
from playwright.sync_api import Page, expect, sync_playwright

def verify_app_loads(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:3000/sugoroku/")

    # Wait for the canvas or some element
    print("Waiting for canvas...")
    try:
        page.wait_for_selector("canvas", timeout=10000)
    except:
        print("Canvas not found, taking screenshot anyway")

    # Wait a bit for initial render
    page.wait_for_timeout(3000)

    print("Taking screenshot...")
    page.screenshot(path="verification/app_load.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_app_loads(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
