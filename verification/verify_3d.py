from playwright.sync_api import sync_playwright

def verify_game_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the game (local dev server port 3000)
        page.goto("http://localhost:3000/sugoroku/")

        # Wait for the board to load (check for board coordinates element or just wait)
        page.wait_for_timeout(3000) # Give it time to render the 3D scene

        # Start game to see players
        # Click the start button. It might be Japanese "ゲーム開始"
        # The SetupScreen has a button.
        start_btn = page.get_by_role("button", name="ゲーム開始")
        if start_btn.is_visible():
            start_btn.click()

        page.wait_for_timeout(2000) # Wait for initial animation

        # Take a screenshot
        page.screenshot(path="verification/game_board_3d.png")

        browser.close()

if __name__ == "__main__":
    verify_game_ui()
