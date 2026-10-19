import { expect, test } from '@playwright/test';

test.describe('Acceptance test - Unsplash Selector', async () => {
  test.beforeEach(async ({ page }) => {
    page.route('**', (route) => {
      const requestURL = route.request().url();

      if (requestURL.match(/http:\/\/localhost:5173/)) {
        route.continue();
      } else {
        route.abort();
      }
    });
  });

  test('Can load the unsplash selector modal', async ({ page }) => {
    await page.goto('/');
    const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
    expect(modal).toBeTruthy();
  });

  test('can load initial images', async ({ page }) => {
    await page.goto('/');
    const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
    await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
    const images = await modal.$$('[data-kg-unsplash-gallery-item="true"]');
    expect(images.length).toBeGreaterThan(0);
  });

  test('Can search for images', async ({ page }) => {
    await page.goto('/');
    const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
    const searchInput = await modal.$('[data-kg-unsplash-search="true"]');
    await searchInput?.fill('train station');
    await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
    const searchResults = await modal.$$('[data-kg-unsplash-gallery-item="true"]');
    expect(searchResults.length).toBe(1);
  });

  test('Can select and zoom on an image', async ({ page }) => {
    await page.goto('/');
    const modal = await page.waitForSelector('[data-kg-modal="unsplash"]');
    const searchInput = await modal.$('[data-kg-unsplash-search="true"]');
    await searchInput?.fill('train station');
    await modal.waitForSelector('[data-kg-unsplash-gallery-item="true"]');
    await page.getByText('8Christian LueInsert image').click();
    const zoomed = await modal.waitForSelector('[data-kg-unsplash-zoomed="true"]');
    expect(zoomed).toBeTruthy();
  });

  test('Credits the photographer and Unsplash with the referral', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('[data-kg-unsplash-gallery-item="true"]', { hasText: 'Christian Lue' })
      .locator('[data-kg-unsplash-insert-button="true"]')
      .click();

    const caption = page.getByTestId('inserted-caption');
    await expect(caption).toHaveText('Photo by Christian Lue / Unsplash');
    await expect(caption.getByRole('link', { name: 'Christian Lue' })).toHaveAttribute(
      'href',
      'https://unsplash.com/@christianlue?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit',
    );
    await expect(caption.getByRole('link', { name: 'Unsplash' })).toHaveAttribute(
      'href',
      'https://unsplash.com/?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit',
    );
  });

  test('Closes with the keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox', { name: 'Search Unsplash' })).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-kg-modal="unsplash"]')).toBeHidden();
  });

  test('Escape leaves a zoomed photo before closing', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('[data-kg-unsplash-gallery-item="true"]', { hasText: 'Christian Lue' })
      .click();
    await expect(page.locator('[data-kg-unsplash-zoomed="true"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-kg-unsplash-zoomed="true"]')).toBeHidden();
    await expect(page.locator('[data-kg-modal="unsplash"]')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('[data-kg-modal="unsplash"]')).toBeHidden();
  });

  test('Inserts an image with the keyboard', async ({ page }) => {
    await page.goto('/');
    await page
      .locator('[data-kg-unsplash-gallery-item="true"]', { hasText: 'Christian Lue' })
      .locator('[data-kg-unsplash-insert-button="true"]')
      .focus();
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('inserted-caption')).toHaveText(
      'Photo by Christian Lue / Unsplash',
    );
  });

  test('Adds the referral to the like and download links', async ({ page }) => {
    await page.goto('/');
    const photo = page.locator('[data-kg-unsplash-gallery-item="true"]', {
      hasText: 'Christian Lue',
    });

    await expect(photo.locator('[data-kg-button="unsplash-like"]')).toHaveAttribute(
      'href',
      'https://unsplash.com/photos/a-train-station-with-a-train-on-the-tracks-b4kKyX0BQvc?utm_source=ghost&utm_medium=referral&utm_campaign=api-credit',
    );
    await expect(photo.locator('[data-kg-button="unsplash-download"]')).toHaveAttribute(
      'href',
      'https://unsplash.com/photos/b4kKyX0BQvc/download?ixid=M3wxMTc3M3wwfDF8YWxsfDV8fHx8fHwyfHwxNzEwMTUzMjA1fA&utm_source=ghost&utm_medium=referral&utm_campaign=api-credit&force=true',
    );
  });
});
