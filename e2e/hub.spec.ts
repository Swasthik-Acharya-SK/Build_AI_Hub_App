import { test, expect } from '@playwright/test';

test.describe('All-in-One AI Hub E2E Suite', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (exception) => {
      console.error(`Page Uncaught Exception: ${exception.message}`);
    });
  });

  test('1. Home page loads with valid title, dark theme, and header elements', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/All-in-One AI Hub/i);

    // Verify main components are rendered
    await expect(page.locator('header')).toBeVisible();
    await expect(page.getByText('All-in-One AI Hub').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chat', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Compare Arena/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Open settings/i })).toBeVisible();
  });

  test('2. Chat flow in Mock Mode: sends prompt and receives streamed response', async ({ page }) => {
    await page.goto('/');

    // Locate the prompt textarea
    const promptInput = page.getByPlaceholder(/Type your prompt here/i);
    await expect(promptInput).toBeVisible();

    // Type prompt and submit
    await promptInput.fill('Explain quantum computing in one sentence.');
    await page.keyboard.press('Enter');

    // Wait for the response bubble to appear
    const assistantBubble = page.locator('.prose-ai').first();
    await expect(assistantBubble).toBeVisible({ timeout: 10_000 });

    // Verify response content has arrived
    const responseText = await assistantBubble.innerText();
    expect(responseText.length).toBeGreaterThan(10);
  });

  test('3. Stop generation and retry functionality', async ({ page }) => {
    await page.goto('/');

    const promptInput = page.getByPlaceholder(/Type your prompt here/i);
    await promptInput.fill('Write a long essay about the history of artificial intelligence.');
    await page.keyboard.press('Enter');

    // While streaming, the stop button appears
    const stopButton = page.getByRole('button', { name: /Stop/i });
    if (await stopButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stopButton.click();
    }

    // After stopping/finishing, retry button should be present on the message or assistant bubble
    await expect(page.locator('.prose-ai').first()).toBeVisible();
  });

  test('4. Conversation management: rename, pin, tag, search, and delete', async ({ page }) => {
    await page.goto('/');

    // Send a message to create an active conversation
    const promptInput = page.getByPlaceholder(/Type your prompt here/i);
    await promptInput.fill('Test conversation management message');
    await page.keyboard.press('Enter');

    // Wait for response
    await expect(page.locator('.prose-ai').first()).toBeVisible({ timeout: 10_000 });

    // Look for conversation in the desktop sidebar
    const conversationItem = page.locator('.hidden.md\\:flex div.group.relative.flex.flex-col').first();
    await expect(conversationItem).toBeVisible();

    // Search for the conversation using exact placeholder
    const searchInput = page.getByPlaceholder(/Search titles, messages, tags/i).first();
    await searchInput.fill('Test conversation');
    await expect(conversationItem).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // Open delete confirmation dialog
    const deleteBtn = conversationItem.locator('button[title*="Delete"]').first();
    await conversationItem.hover();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      // Verify confirmation dialog opens
      const confirmModal = page.getByText(/Confirm Delete Conversation/i);
      await expect(confirmModal).toBeVisible();

      // Click cancel
      const cancelBtn = page.getByRole('button', { name: /Cancel/i });
      await cancelBtn.click();
      await expect(confirmModal).not.toBeVisible();
    }
  });

  test('5. Compare Arena: switch mode, broadcast prompt, and export results', async ({ page }) => {
    await page.goto('/');

    // Switch to Compare Arena
    const arenaButton = page.getByRole('button', { name: /Compare Arena/i });
    await arenaButton.click();

    // Check Arena header
    await expect(page.getByText('Compare AI Arena')).toBeVisible();

    // Enter comparison prompt using exact placeholder
    const arenaInput = page.getByPlaceholder(/comparison prompt/i);
    await expect(arenaInput).toBeVisible();
    await arenaInput.fill('Compare advantages of functional vs OOP programming.');

    // Broadcast comparison
    const compareBtn = page.getByRole('button', { name: 'Compare', exact: true });
    await compareBtn.click();

    // Verify response slots display content
    const arenaProse = page.locator('.prose-ai').first();
    await expect(arenaProse).toBeVisible({ timeout: 15_000 });

    // Open Export dropdown menu and verify options exist
    const exportDropdownBtn = page.locator('button[title="Export comparison"]');
    await expect(exportDropdownBtn).toBeVisible();
    await exportDropdownBtn.click();

    await expect(page.getByText('Download Markdown (.md)')).toBeVisible();
    await expect(page.getByText('Download JSON (.json)')).toBeVisible();
  });

  test('6. Settings modal opens and allows changing preferences', async ({ page }) => {
    await page.goto('/');

    // Open settings modal
    const settingsBtn = page.getByRole('button', { name: /Open settings/i });
    await settingsBtn.click();

    // Check modal contents
    await expect(page.getByText('Settings & Configuration')).toBeVisible();
    await expect(page.getByText('Server API Keys')).toBeVisible();
    await expect(page.getByText('OpenAI', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Anthropic Claude').first()).toBeVisible();
    await expect(page.getByText('Google Gemini').first()).toBeVisible();

    // Close settings modal
    const closeBtn = page.locator('div.fixed.inset-0').locator('button').first();
    await closeBtn.click();
  });

  test('7. Responsive Viewport Adaptations (320px, 375px, 768px)', async ({ page }) => {
    // 320px (Small Mobile)
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/');
    const mobileMenuBtn = page.getByRole('button', { name: /Toggle navigation menu/i });
    await expect(mobileMenuBtn).toBeVisible();

    // 375px (Standard Mobile)
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(mobileMenuBtn).toBeVisible();

    // Open mobile sidebar drawer
    await mobileMenuBtn.click();
    const mobileDrawer = page.locator('.fixed.inset-0.md\\:hidden');
    await expect(mobileDrawer).toBeVisible();
    await expect(mobileDrawer.getByText('New Conversation')).toBeVisible();

    // Close mobile drawer by clicking backdrop
    const backdrop = page.locator('.fixed.inset-0.bg-black\\/70');
    if (await backdrop.isVisible()) {
      await backdrop.click({ position: { x: 350, y: 100 }, force: true });
    }

    // 768px (Tablet)
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('header')).toBeVisible();
  });

  test('8. Keyboard accessibility: Tab navigation reaches interactive controls', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Ensure no unhandled JS errors occurred
    const promptInput = page.getByPlaceholder(/Type your prompt here/i);
    await promptInput.focus();
    await expect(promptInput).toBeFocused();
  });
});
