from playwright.sync_api import sync_playwright

def verify_3d_board():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Using a fixed viewport to capture enough area
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            # Wait a bit for Vite to start
            page.wait_for_timeout(2000)

            print("Navigating...")
            # Go to the app (Updated port to 3000)
            page.goto("http://localhost:3000/sugoroku/")

            print("Page loaded. Checking for Setup screen...")
            # Take a debug screenshot
            page.screenshot(path="verification/setup_screen.png")

            # Start game to see players
            # Setup screen is first.
            print("Clicking Start Game...")
            page.get_by_role("button", name="冒険を始める").click()

            print("Waiting for Canvas...")
            # Wait for canvas to be present (Canvas is rendered by R3F)
            page.wait_for_selector("canvas", timeout=10000)

            # Wait for transition and camera movement
            page.wait_for_timeout(3000)

            # Capture screenshot of the 3D board
            page.screenshot(path="verification/board_3d.png")
            print("Screenshot captured successfully.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_state.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_3d_board()
