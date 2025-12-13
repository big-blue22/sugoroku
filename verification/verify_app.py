from playwright.sync_api import sync_playwright

def verify_setup_screen():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Update URL to match server log
            page.goto("http://localhost:3000/sugoroku/")

            # Wait for content
            # The app likely shows the Setup Screen first
            # "ルームIDの入力" might not be visible immediately or text might differ.
            # Let's wait for body first then check.
            page.wait_for_selector("body")

            # Give it a moment to render React
            page.wait_for_timeout(2000)

            # Take a screenshot
            page.screenshot(path="verification/setup_screen.png")
            print("Screenshot taken: verification/setup_screen.png")

        except Exception as e:
            print(f"Error: {e}")
            try:
                page.screenshot(path="verification/error_state.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_setup_screen()
