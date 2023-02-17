import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, focusEditor, assertHTML, html, initialize} from '../../utils/e2e';

describe('Restrict Content Plugin', async function () {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page, uri: '/contentrestricted'});
    });

    test('restricted content editor accepts input', async function () {
        await focusEditor(page);

        await page.keyboard.type('Hello World');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">Hello World</span></p>
        `);
    });

    test('can not add more than specified number of paragraphs by typing manually', async function () {
        await focusEditor(page);

        await page.keyboard.type('Hello World');
        await page.keyboard.press('Enter');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">Hello World</span></p>
        `);
    });
});
