from playwright.sync_api import sync_playwright

def verify_setup_screen():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Note the base path /sugoroku/
            page.goto("http://localhost:3000/sugoroku/")

            # The text is "冒険すごろく ONLINE", not "AI冒険すごろく"
            page.wait_for_selector("text=冒険すごろく ONLINE", timeout=10000)
            print("Page loaded successfully")
            page.screenshot(path="verification/setup_screen.png")
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_setup_screen()
