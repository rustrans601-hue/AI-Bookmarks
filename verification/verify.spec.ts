import { test, expect } from '@playwright/test';

test('ollama model name is saved', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.locator('button[title="Settings"]').click();
  await page.click('button:has-text("Local (Ollama)")');
  await page.fill('input[id="ollama-model-input"]', '');
  await page.click('button:has-text("Save")');

  // Wait for the modal to close completely
  await page.locator('h2:has-text("Settings")').waitFor({ state: 'hidden' });

  await page.locator('button[title="Settings"]').click();

  // Wait for modal to open and settings to load
  await page.waitForTimeout(500);

  await page.screenshot({ path: '/home/jules/verification/verification.png' });
});
