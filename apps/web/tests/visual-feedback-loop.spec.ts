/**
 * Visual Feedback Loop Test
 *
 * Automated test that captures screenshots for visual assessment
 * Allows Claude to see the UI and iterate on improvements
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(__dirname, '../../../.screenshots');

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Visual Feedback Loop', () => {
  // Increase test timeout to allow for AI generation (default 30s is too short)
  test.setTimeout(120000); // 2 minutes per test

  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3003');

    // Wait for the app to be ready
    await page.waitForSelector('[data-testid="azure-canvas"], .react-flow', { timeout: 10000 });
  });

  test('capture initial state', async ({ page }) => {
    const timestamp = Date.now();

    // Take full page screenshot
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `initial-state-${timestamp}.png`),
      fullPage: true,
    });

    // Take canvas-only screenshot
    const canvas = page.locator('.react-flow').first();
    await canvas.screenshot({
      path: path.join(SCREENSHOT_DIR, `canvas-${timestamp}.png`),
    });

    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log(`Timestamp: ${timestamp}`);
  });

  test('test edge routing - generate architecture and capture', async ({ page }) => {
    const timestamp = Date.now();

    // Wait for CopilotKit to be ready
    await page.waitForTimeout(2000);

    // Find the chat input
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first();

    if (await chatInput.isVisible()) {
      // Send a prompt to generate architecture
      await chatInput.fill('Create a simple web app with a database');
      await chatInput.press('Enter');

      // Wait for generation to complete (AI takes 30-40 seconds)
      await page.waitForTimeout(45000);

      // Capture the result
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `generated-arch-${timestamp}.png`),
        fullPage: true,
      });

      const canvas = page.locator('.react-flow').first();
      await canvas.screenshot({
        path: path.join(SCREENSHOT_DIR, `generated-canvas-${timestamp}.png`),
      });
    }

    console.log(`Generation screenshots saved to: ${SCREENSHOT_DIR}`);
  });

  test('test multi-environment generation', async ({ page }) => {
    const timestamp = Date.now();

    await page.waitForTimeout(2000);

    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first();

    if (await chatInput.isVisible()) {
      await chatInput.fill('Build an e-commerce platform for dev, test, and prod environments');
      await chatInput.press('Enter');

      // Wait for generation (longer for multi-env - AI takes 40-50 seconds)
      await page.waitForTimeout(60000);

      // Capture the result
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `multi-env-${timestamp}.png`),
        fullPage: true,
      });

      const canvas = page.locator('.react-flow').first();
      await canvas.screenshot({
        path: path.join(SCREENSHOT_DIR, `multi-env-canvas-${timestamp}.png`),
      });
    }

    console.log(`Multi-env screenshots saved to: ${SCREENSHOT_DIR}`);
  });

  test('capture edge routing details', async ({ page }) => {
    const timestamp = Date.now();

    // Wait for any existing diagram
    await page.waitForTimeout(2000);

    // Zoom in to see edge details
    const canvas = page.locator('.react-flow').first();
    await canvas.click({ position: { x: 400, y: 300 } });

    // Try to zoom in (Ctrl + Mouse Wheel simulation via keyboard)
    await page.keyboard.press('Control+=');
    await page.keyboard.press('Control+=');
    await page.keyboard.press('Control+=');

    await page.waitForTimeout(500);

    // Capture zoomed view
    await canvas.screenshot({
      path: path.join(SCREENSHOT_DIR, `edges-zoomed-${timestamp}.png`),
    });

    console.log(`Edge detail screenshots saved to: ${SCREENSHOT_DIR}`);
  });
});
