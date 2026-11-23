import {expect, test} from '@playwright/test';
import {focusEditor, initialize, insertCard} from '../utils/e2e';

for (const insertion of ['URL', 'dropdown']) {
    test.describe(`Bookmark loading from ${insertion}`, () => {
    test.beforeEach(async ({page}) => {
        await page.route('**/demo/utils/fetchEmbed.ts', route => route.fulfill({
            contentType: 'text/javascript',
            body: `export async function fetchEmbed(url) {
                return new Promise((resolve, reject) => {
                    window.finishBookmarkRequest = () => resolve({url, metadata: {title: 'Loaded bookmark'}});
                    window.failBookmarkRequest = () => reject(new Error('Lookup failed'));
                });
            }`
        }));
        await initialize({page, uri: '/#/?content=false'});
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});
        if (insertion === 'URL') {
            await page.getByTestId('bookmark-url').fill('https://example.com');
            await page.getByTestId('bookmark-url').press('Enter');
        } else {
            await page.getByTestId('bookmark-url-listOption').first().click();
        }
        await expect(page.getByTestId('bookmark-url-loading-container')).toBeVisible();
    });

    async function finishRequest(page) {
        await page.evaluate(async () => {
            window.finishBookmarkRequest();
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    }

    async function failRequest(page) {
        await page.evaluate(async () => {
            window.failBookmarkRequest();
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    }

    test('retains a submitted bookmark when the writer continues typing before its preview loads', async ({page}) => {
        await page.keyboard.press('ArrowDown');
        await page.keyboard.type('Next paragraph');
        await expect(page.locator('[data-lexical-editor="true"]').first()).toContainText('Next paragraph');
        await finishRequest(page);
        await expect(page.getByTestId('bookmark-title')).toHaveText('Loaded bookmark');
        await expect(page.locator('[data-lexical-editor="true"]').first()).toContainText('Next paragraph');
    });

    test('ignores a preview that arrives after the writer deletes the card', async ({page}) => {
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => {
            if (message.type() === 'error') {
                errors.push(message.text());
            }
        });
        await page.locator('[data-kg-card="bookmark"]').click();
        await page.keyboard.press('Backspace');
        await expect(page.locator('[data-kg-card="bookmark"]')).toHaveCount(0);
        await finishRequest(page);
        expect(errors).toEqual([]);
        await expect(page.locator('[data-kg-card="bookmark"]')).toHaveCount(0);
    });

    test('removes a bookmark whose preview failed once the writer moves on', async ({page}) => {
        await failRequest(page);
        await expect(page.getByTestId('bookmark-url-error-message')).toBeVisible();
        await page.keyboard.press('ArrowDown');
        await expect(page.locator('[data-kg-card="bookmark"]')).toHaveCount(0);
    });
});
}
