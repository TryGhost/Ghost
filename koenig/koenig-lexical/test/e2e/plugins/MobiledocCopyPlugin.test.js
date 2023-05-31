import {assertHTML, focusEditor, initialize, isMac, resetEditor} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Mobiledoc Copy Plugin', async function () {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';

    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
        await initialize({page});
    });

    test.beforeEach(async () => {
        await resetEditor({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('adds mobiledoc to clipboard when copying', async function () {
        await focusEditor(page);

        // set up a custom event handler to capture the clipboard data from the copy event
        // we can't use navigator.clipboard later on because standard copy events do not create clipboard items
        page.evaluate(() => {
            window.copiedMobiledoc = null;

            window.addEventListener('copy', (event) => {
                if (event.clipboardData.getData('application/x-mobiledoc-editor')) {
                    window.copiedMobiledoc = event.clipboardData.getData('application/x-mobiledoc-editor');
                }
            });
        });

        await page.keyboard.type('Hello World');

        await page.keyboard.press(`${ctrlOrCmd}+A`);
        await page.keyboard.press(`${ctrlOrCmd}+C`);

        const clipboardMobiledoc = await page.evaluate(() => {
            return window.copiedMobiledoc;
        });

        expect(clipboardMobiledoc).toEqual('{"version":"0.3.1","ghostVersion":"4.0","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello World"]]]]}');
    });

    test('adds mobiledoc to clipboard when cutting', async function () {
        await focusEditor(page);

        // set up a custom event handler to capture the clipboard data from the copy event
        // we can't use navigator.clipboard later on because standard copy events do not create clipboard items
        page.evaluate(() => {
            window.copiedMobiledoc = null;

            window.addEventListener('cut', (event) => {
                if (event.clipboardData.getData('application/x-mobiledoc-editor')) {
                    window.copiedMobiledoc = event.clipboardData.getData('application/x-mobiledoc-editor');
                }
            });
        });

        await page.keyboard.type('Hello World');

        await page.keyboard.press(`${ctrlOrCmd}+A`);
        await page.keyboard.press(`${ctrlOrCmd}+X`);

        // we do actually cut the content from the editor
        await assertHTML(page, '<p><br></p>');

        const clipboardMobiledoc = await page.evaluate(() => {
            return window.copiedMobiledoc;
        });

        expect(clipboardMobiledoc).toEqual('{"version":"0.3.1","ghostVersion":"4.0","atoms":[],"cards":[],"markups":[],"sections":[[1,"p",[[0,[],0,"Hello World"]]]]}');
    });
});
