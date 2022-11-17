import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, initialize, focusEditor, assertHTML, html, pasteText} from '../../utils/e2e';

describe('Links', async () => {
    let app;
    let page;

    beforeAll(async () => {
        ({app, page} = await startApp());
    });

    afterAll(async () => {
        await app.stop();
    });

    beforeEach(async () => {
        await initialize({page});
    });

    test('converts selected text to link on url paste', async function () {
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

    test('does not convert text to link if pasting a non-url', async function () {
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
