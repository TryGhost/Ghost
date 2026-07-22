import {expect, test} from '@playwright/test';
import {focusEditor, initialize} from '../../utils/e2e';

test.describe('Renders paywall card', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('renders paywall card', async function () {
        await focusEditor(page);
        await page.keyboard.type('===');
        await expect(page.locator('[data-kg-card="paywall"]')).toHaveAttribute('data-kg-card-selected', 'true');
        await expect(page.locator('[data-kg-card="paywall"]')).toHaveAttribute('data-kg-card-editing', 'true');
        await expect(page.getByTestId('settings-panel')).toBeVisible();
        await expect(page.getByTestId('paywall-post-access-value')).toBeVisible();
    });
});
