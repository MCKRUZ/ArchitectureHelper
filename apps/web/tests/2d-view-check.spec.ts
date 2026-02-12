/**
 * 2D View Check - Verify no overlap in flat view
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../../.screenshots/2d-check');
const ARCHITECTURE_JSON = 'C:\\Users\\kruz7\\Downloads\\untitled-architecture.json';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Read the architecture JSON
const architectureData = JSON.parse(fs.readFileSync(ARCHITECTURE_JSON, 'utf-8'));

test.describe('2D View - No Overlap Check', () => {
  test.setTimeout(60000);

  test('load architecture in 2D view and verify no overlap', async ({ page }) => {
    // Set localStorage before page loads - force 2D mode
    await page.goto('http://localhost:3004');

    // Inject architecture data in 2D mode
    await page.evaluate((data) => {
      const dataWith2D = { ...data, viewMode: '2d' };
      localStorage.setItem('azurecraft-diagram', JSON.stringify(dataWith2D));
    }, architectureData);

    // Reload to pick up the data
    await page.reload();

    // Wait for React Flow to be ready
    await page.waitForSelector('.react-flow', { timeout: 10000 });
    await page.waitForTimeout(3000);

    console.log('[Test] 2D view loaded, capturing screenshots...');

    // Capture full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '2d-fullpage.png'),
      fullPage: true,
    });

    // Capture canvas-only screenshot
    const canvas = page.locator('.react-flow').first();
    await canvas.screenshot({
      path: path.join(SCREENSHOT_DIR, '2d-canvas.png'),
    });

    // Zoom in to see details
    await page.keyboard.press('Control+=');
    await page.waitForTimeout(300);

    await canvas.screenshot({
      path: path.join(SCREENSHOT_DIR, '2d-zoomed.png'),
    });

    console.log(`✅ 2D screenshots saved to: ${SCREENSHOT_DIR}`);
  });
});
