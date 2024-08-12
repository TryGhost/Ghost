import {expect, test} from '@playwright/test';
import {focusEditor,initialize, insertCard} from '../utils/e2e';

test.describe('Content Visibility', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/?content=false&labs=contentVisibility'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('HTML card', async function () {
        test('toolbar shows content visibility icon', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'html'});
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
            await page.keyboard.type('Testing');
            await page.keyboard.press('Meta+Enter');

            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-selected', 'true');
            await expect(page.locator('[data-kg-card="html"]')).toHaveAttribute('data-kg-card-editing', 'false');
            await expect(page.locator('[data-kg-card-toolbar="html"]')).toBeVisible();
            await expect(page.locator('[data-kg-card-toolbar="html"] [aria-label="Visibility"]')).toBeVisible();
        });
    });
});
