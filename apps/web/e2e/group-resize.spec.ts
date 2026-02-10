import { test, expect } from '@playwright/test';

test.describe('Group node resize', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3002');
    await page.waitForSelector('.react-flow__renderer', { timeout: 10000 });
  });

  test('resize from south handle keeps north vertex anchored', async ({ page }) => {
    // Drop a Resource Group onto the canvas
    const containers = page.locator('text=Containers').first();
    if (await containers.isVisible().catch(() => false)) {
      await containers.click();
      await page.waitForTimeout(500);
    }

    const canvas = page.locator('.react-flow__pane');
    const canvasBox = await canvas.boundingBox();
    const resourceGroup = page.locator('[draggable="true"]').filter({ hasText: 'Resource Group' }).first();
    const rgBox = await resourceGroup.boundingBox();

    if (!rgBox || !canvasBox) throw new Error('Could not find elements');

    // Drag Resource Group to canvas
    const targetX = canvasBox.x + canvasBox.width / 2;
    const targetY = canvasBox.y + canvasBox.height / 2;
    await page.mouse.move(rgBox.x + rgBox.width / 2, rgBox.y + rgBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    // Get the group node
    const groupNode = page.locator('.react-flow__node-group').first();
    const beforeBox = await groupNode.boundingBox();
    if (!beforeBox) throw new Error('Group node not found');

    console.log('BEFORE resize:', beforeBox);

    // Compute diamond vertex positions from rectangle bounding box
    // North vertex = top center of bounding box
    const beforeNorth = {
      x: beforeBox.x + beforeBox.width / 2,
      y: beforeBox.y,
    };
    console.log('BEFORE north vertex:', beforeNorth);

    // Hover to reveal handles — move to center of group
    await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2);
    await page.waitForTimeout(500);

    // Find the south handle (diamond bottom vertex)
    const southHandle = page.locator('.group-resize-handle--south').first();
    const southBox = await southHandle.boundingBox();
    if (!southBox) throw new Error('South handle not found');
    console.log('South handle position:', southBox);

    // Drag the south handle DOWN to make bigger
    const handleCenterX = southBox.x + southBox.width / 2;
    const handleCenterY = southBox.y + southBox.height / 2;
    await page.mouse.move(handleCenterX, handleCenterY);
    await page.mouse.down();
    await page.mouse.move(handleCenterX, handleCenterY + 100, { steps: 20 });
    await page.waitForTimeout(200);

    const duringBox = await groupNode.boundingBox();
    console.log('DURING resize:', duringBox);

    await page.mouse.up();
    await page.waitForTimeout(500);

    const afterBox = await groupNode.boundingBox();
    if (!afterBox) throw new Error('Group node not found after resize');

    console.log('AFTER resize:', afterBox);

    // The NORTH vertex (top center) should stay anchored
    // North vertex = top edge center = (x + W/2, y)
    const afterNorth = {
      x: afterBox.x + afterBox.width / 2,
      y: afterBox.y,
    };
    console.log('AFTER north vertex:', afterNorth);

    const northDeltaX = Math.abs(afterNorth.x - beforeNorth.x);
    const northDeltaY = Math.abs(afterNorth.y - beforeNorth.y);
    console.log(`North vertex delta: x=${northDeltaX}, y=${northDeltaY}`);
    expect(northDeltaX).toBeLessThan(5); // tight tolerance — opposite vertex should be locked
    expect(northDeltaY).toBeLessThan(5);

    // Dimensions should have gotten bigger
    console.log(`Width: ${beforeBox.width} → ${afterBox.width}`);
    console.log(`Height: ${beforeBox.height} → ${afterBox.height}`);
    expect(afterBox.height).toBeGreaterThan(beforeBox.height);

    // Aspect ratio should be ~2:1
    const ratio = afterBox.width / afterBox.height;
    console.log(`Aspect ratio: ${ratio} (should be ~2.0)`);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);

    await page.screenshot({ path: 'e2e/screenshots/resize-south-anchor-test.png' });
  });

  test('resize from east handle keeps west vertex anchored', async ({ page }) => {
    // Drop a Resource Group onto the canvas
    const containers = page.locator('text=Containers').first();
    if (await containers.isVisible().catch(() => false)) {
      await containers.click();
      await page.waitForTimeout(500);
    }

    const canvas = page.locator('.react-flow__pane');
    const canvasBox = await canvas.boundingBox();
    const resourceGroup = page.locator('[draggable="true"]').filter({ hasText: 'Resource Group' }).first();
    const rgBox = await resourceGroup.boundingBox();

    if (!rgBox || !canvasBox) throw new Error('Could not find elements');

    const targetX = canvasBox.x + canvasBox.width / 2;
    const targetY = canvasBox.y + canvasBox.height / 2;
    await page.mouse.move(rgBox.x + rgBox.width / 2, rgBox.y + rgBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(1000);

    const groupNode = page.locator('.react-flow__node-group').first();
    const beforeBox = await groupNode.boundingBox();
    if (!beforeBox) throw new Error('Group node not found');

    // West vertex = left edge center = (x, y + H/2)
    const beforeWest = {
      x: beforeBox.x,
      y: beforeBox.y + beforeBox.height / 2,
    };
    console.log('BEFORE west vertex:', beforeWest);

    // Hover to reveal handles
    await page.mouse.move(beforeBox.x + beforeBox.width / 2, beforeBox.y + beforeBox.height / 2);
    await page.waitForTimeout(500);

    // Find the east handle
    const eastHandle = page.locator('.group-resize-handle--east').first();
    const eastBox = await eastHandle.boundingBox();
    if (!eastBox) throw new Error('East handle not found');

    // Drag east handle RIGHT to make bigger
    const hx = eastBox.x + eastBox.width / 2;
    const hy = eastBox.y + eastBox.height / 2;
    await page.mouse.move(hx, hy);
    await page.mouse.down();
    await page.mouse.move(hx + 120, hy, { steps: 20 });
    await page.waitForTimeout(200);
    await page.mouse.up();
    await page.waitForTimeout(500);

    const afterBox = await groupNode.boundingBox();
    if (!afterBox) throw new Error('Group node not found after resize');

    // West vertex should stay anchored
    const afterWest = {
      x: afterBox.x,
      y: afterBox.y + afterBox.height / 2,
    };
    console.log('AFTER west vertex:', afterWest);

    const westDeltaX = Math.abs(afterWest.x - beforeWest.x);
    const westDeltaY = Math.abs(afterWest.y - beforeWest.y);
    console.log(`West vertex delta: x=${westDeltaX}, y=${westDeltaY}`);
    expect(westDeltaX).toBeLessThan(5);
    expect(westDeltaY).toBeLessThan(5);

    // Should have gotten wider
    expect(afterBox.width).toBeGreaterThan(beforeBox.width);

    // Aspect ratio ~2:1
    const ratio = afterBox.width / afterBox.height;
    console.log(`Aspect ratio: ${ratio}`);
    expect(ratio).toBeGreaterThan(1.8);
    expect(ratio).toBeLessThan(2.2);

    await page.screenshot({ path: 'e2e/screenshots/resize-east-anchor-test.png' });
  });
});
