/**
 * Isometric View Visual Feedback Loop Test
 *
 * Loads the e-commerce architecture and captures 10 iterations
 * in isometric view to assess layout quality and consistency
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../../.screenshots/isometric-loop');
const ARCHITECTURE_JSON = 'C:\\Users\\kruz7\\Downloads\\untitled-architecture.json';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Read the architecture JSON
const architectureData = JSON.parse(fs.readFileSync(ARCHITECTURE_JSON, 'utf-8'));

test.describe('Isometric View - 10 Iteration Loop', () => {
  test.setTimeout(180000); // 3 minutes total

  test('load architecture and capture isometric view 10 times', async ({ page }) => {
    // Capture browser console messages
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[tierLayout]') || text.includes('OLD parentId') || text.includes('NEW parentId')) {
        console.log(`[BROWSER] ${text}`);
      }
    });

    // Set localStorage before page loads
    await page.goto('http://localhost:3004');

    // Inject architecture data via localStorage IN 2D MODE FIRST
    // This forces a view mode change when we switch to isometric,
    // which triggers the auto-layout system
    await page.evaluate((data) => {
      const dataWith2D = { ...data, viewMode: '2d' };
      localStorage.setItem('azurecraft-diagram', JSON.stringify(dataWith2D));
    }, architectureData);

    // Reload to pick up the data
    await page.reload();

    // Wait for React Flow to be ready in 2D
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('[Test] Loaded in 2D mode, now switching to isometric to trigger layout...');

    // Click the view mode toggle button to switch to isometric
    // This will trigger the viewMode change useEffect and call calculateAutoLayout
    const viewToggle = page.locator('button').filter({ hasText: /isometric|3d/i }).first();
    if (await viewToggle.isVisible()) {
      await viewToggle.click();
      console.log('[Test] Clicked isometric view toggle');
    } else {
      // Fallback: try any button with view-related text
      const anyViewButton = page.locator('button').filter({ hasText: /view|2d|iso/i }).first();
      if (await anyViewButton.isVisible()) {
        await anyViewButton.click();
        console.log('[Test] Clicked view toggle button');
      }
    }

    // Wait for layout to complete (it's async)
    await page.waitForTimeout(3000);
    console.log('[Test] Isometric layout should be complete');

    // Run 10 iterations
    for (let i = 1; i <= 10; i++) {
      console.log(`\n=== Iteration ${i}/10 ===`);

      // Wait for layout to settle
      await page.waitForTimeout(500);

      // Capture full page screenshot
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `iteration-${i}-fullpage.png`),
        fullPage: true,
      });

      // Capture canvas-only screenshot
      const canvas = page.locator('.react-flow').first();
      await canvas.screenshot({
        path: path.join(SCREENSHOT_DIR, `iteration-${i}-canvas.png`),
      });

      // Zoom in to see node details
      await page.keyboard.press('Control+=');
      await page.waitForTimeout(300);

      await canvas.screenshot({
        path: path.join(SCREENSHOT_DIR, `iteration-${i}-zoomed.png`),
      });

      // Zoom back out
      await page.keyboard.press('Control+-');
      await page.waitForTimeout(300);

      console.log(`✓ Iteration ${i} screenshots saved`);

      // Small delay between iterations
      if (i < 10) {
        await page.waitForTimeout(500);
      }
    }

    console.log(`\n✅ All 10 iterations complete!`);
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  });
});
