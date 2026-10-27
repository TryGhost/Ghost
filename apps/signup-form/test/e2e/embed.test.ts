import { expect, test } from '@playwright/test';
import { initialize } from '../utils/e2e';

test.describe('Embed', () => {
  test('Sizes the minimal frame to its content', async ({ page }) => {
    const { frame } = await initialize({ page });
    const iframe = page.locator('iframe');
    const frameHeight = () => iframe.evaluate((el) => el.clientHeight);
    const heightDifference = async () =>
      (await frame.locator('body').evaluate((el) => el.scrollHeight)) - (await frameHeight());

    await expect.poll(frameHeight).toBeGreaterThan(0);
    await expect.poll(heightDifference).toBe(0);
    const initialHeight = await frameHeight();

    // The error message below the form grows the frame
    await frame.getByTestId('input').fill('invalid');
    await frame.getByTestId('button').click();
    await expect.poll(frameHeight).toBeGreaterThan(initialHeight);
    await expect.poll(heightDifference).toBe(0);
  });

  test('Renders again when the snippet runs a second time', async ({ page }) => {
    const { frame } = await initialize({ page, buttonColor: 'rgb(255, 0, 0)' });
    await expect(frame.getByTestId('button')).toBeVisible();

    await page.evaluate(() => {
      const script = document.querySelector('script[data-site]') as HTMLScriptElement;
      const clone = document.createElement('script');
      for (const { name, value } of Array.from(script.attributes)) {
        clone.setAttribute(name, value);
      }
      clone.dataset.buttonColor = 'rgb(0, 0, 255)';
      script.replaceWith(clone);
    });

    await expect(page.locator('.gh-signup-root')).toHaveCount(1);
    await expect(page.locator('iframe')).toHaveCount(1);
    await expect(frame.getByTestId('button')).toHaveCSS('background-color', 'rgb(0, 0, 255)');
  });

  test('Accepts an email filled without an input event', async ({ page }) => {
    const { frame, lastApiRequest } = await initialize({ page, title: 'Sign up' });

    // Some autofill tools set the value natively and only dispatch `change`
    await frame.getByTestId('input').evaluate((el) => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(el, 'autofill@example.com');
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await frame.getByTestId('button').click();

    await expect(frame.getByTestId('success-page')).toHaveCount(1);
    expect(lastApiRequest.body).toHaveProperty('email', 'autofill@example.com');
  });
});
