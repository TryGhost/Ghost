import {expect, test} from '@playwright/test';
import {focusEditor, initialize, isMac} from '../../utils/e2e';

test.describe('CodeMirrorPlugin', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
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

    test.describe('copy', async () => {
        test('can copy and paste within the editor', async () => {
            await focusEditor(page);
            await page.keyboard.type('/html');
            await page.waitForSelector('[data-kg-card-menu-item="HTML"][data-kg-cardmenu-selected="true"]');
            await page.keyboard.press('Enter');

            await expect(await page.locator('[data-kg-card="html"][data-kg-card-editing="true"]')).toBeVisible();
            // waiting for html editor
            await expect(await page.locator('.cm-content[contenteditable="true"]')).toBeVisible();
    
            // Types slower. Codemirror can be slow and needs some time to place the cursor after entering text.
            await page.keyboard.type('SomeHtml', {delay: 100});
            await expect(page.getByText('SomeHtml')).toBeVisible();

            await page.keyboard.press(`${ctrlOrCmd}+A`);
            await page.keyboard.press(`${ctrlOrCmd}+C`);
            await page.keyboard.press(`${ctrlOrCmd}+V`);
            await page.keyboard.press(`${ctrlOrCmd}+V`);

            await expect(page.getByText('SomeHtmlSomeHtml')).toBeVisible();
        });
    });
});