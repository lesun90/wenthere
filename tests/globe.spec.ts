import { expect, test } from '@playwright/test';

const GLOBE_SETTLE_MS = 500;
const DRAG_DISTANCE_PX = 220;
const POST_DRAG_SETTLE_MS = 250;

test('globe rotates when dragged', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/yourname');

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(GLOBE_SETTLE_MS);
  expect(await page.getByText(/\d+ error/).count()).toBe(0);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);

  const before = await canvas.screenshot();
  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + DRAG_DISTANCE_PX, centerY);
  await page.mouse.up();
  await page.waitForTimeout(POST_DRAG_SETTLE_MS);

  const after = await canvas.screenshot();
  expect(Buffer.compare(before, after)).not.toBe(0);
  expect(pageErrors).toEqual([]);
});
