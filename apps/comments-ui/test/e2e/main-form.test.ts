import { MockedApi, initialize } from '../utils/e2e';
import { buildMember } from '../utils/fixtures';
import { expect, test } from '@playwright/test';

test.describe('Main form', async () => {
  let mockedApi: MockedApi;

  async function initializeTest(page, options = {}) {
    mockedApi = new MockedApi({});
    mockedApi.setMember(buildMember({}));

    return await initialize({
      mockedApi,
      page,
      publication: 'Publisher Weekly',
      ...options,
    });
  }

  test('hides header by default', async ({ page }) => {
    const { frame } = await initializeTest(page);
    await expect(frame.locator('[data-testid="main-form"]')).toBeVisible();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).not.toBeVisible();
  });

  test('shows header when focused', async ({ page }) => {
    const { frame } = await initializeTest(page);
    await frame.locator('[data-testid="main-form"] [data-testid="form-editor"]').click();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).toBeVisible();
  });

  test('hides header when blurred', async ({ page }) => {
    const { frame } = await initializeTest(page);
    await frame.locator('[data-testid="main-form"] [data-testid="form-editor"]').click();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).toBeVisible();
    await page.locator('body').click();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).not.toBeVisible();
  });

  test('keeps showing header when blurred with unpublished changes', async ({ page }) => {
    const { frame } = await initializeTest(page);
    await frame.locator('[data-testid="main-form"] [data-testid="form-editor"]').click();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).toBeVisible();
    await frame
      .locator('[data-testid="main-form"] [data-testid="form-editor"]')
      .pressSequentially('Some text');
    await page.locator('body').click();
    await expect(
      frame.locator('[data-testid="main-form"] [data-testid="form-header"]'),
    ).toBeVisible();
  });

  test('allows keyboard focus to leave an empty comments frame', async ({ page }) => {
    const { frame } = await initializeTest(page);
    await page.evaluate(() => {
      const button = document.createElement('button');
      button.id = 'after-comments';
      button.textContent = 'After comments';
      document.body.append(button);
    });

    const editor = frame.getByTestId('editor');
    const expertiseButton = frame.getByTestId('expertise-button');

    await editor.focus();
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await expect(expertiseButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#after-comments')).toBeFocused();
  });
});
