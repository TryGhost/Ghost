import {assertHTML, focusEditor, html, initialize, pasteText} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Links', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('converts selected text to link on url paste', async function ({page}) {
        await focusEditor(page);
        await page.keyboard.type('link');
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');
        await pasteText(page, 'https://koenig.ghost.org');
        await assertHTML(page, html`
            <p dir="ltr">
                <a href="https://koenig.ghost.org" dir="ltr">
                <span data-lexical-text="true">link</span>
                </a>
            </p>
        `);
    });

    test('does not convert text to link if pasting a non-url', async function ({page}) {
        await focusEditor(page);
        await page.keyboard.type('link');
        await page.keyboard.down('Shift');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.up('Shift');
        await pasteText(page, 'Hello Koenig');
        await assertHTML(page, html`
            <p dir="ltr">
                <span data-lexical-text="true">Hello Koenig</span>
            </p>
        `);
    });
});
