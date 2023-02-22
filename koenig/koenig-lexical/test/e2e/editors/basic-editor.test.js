import {afterAll, beforeAll, beforeEach, describe, test} from 'vitest';
import {startApp, focusEditor, assertHTML, html, initialize} from '../../utils/e2e';

describe('Koening Editor with basic nodes', async function () {
    let app;
    let page;

    beforeAll(async function () {
        ({app, page} = await startApp());
    });

    afterAll(async function () {
        await app.stop();
    });

    beforeEach(async function () {
        await initialize({page, uri: '/basic?content=false'});
    });

    test('caret does not appear on empty editor', async function () {
        await focusEditor(page);
        expect(await page.$('[data-kg-plus-button]')).toBeNull();
    });

    test('can add basic text', async function () {
        await focusEditor(page);

        await page.keyboard.type('Hello World');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">Hello World</span></p>
        `);
    });

    test('can add more than 1 paragraphs by typing manually', async function () {
        await focusEditor(page);

        await page.keyboard.type('Hello World');
        await page.keyboard.press('Enter');
        await page.keyboard.type('This is second para');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">Hello World</span></p>
            <p dir="ltr"><span data-lexical-text="true">This is second para</span></p>
        `);
    });

    test('ignores hr card shortcut', async function () {
        await focusEditor(page);

        await page.keyboard.type('--- ');
        await page.keyboard.press('Enter');

        await assertHTML(page, html`
            <p><span data-lexical-text="true">---</span></p>
            <p><br /></p>
        `);
    });

    test('ignores code block card shortcut', async function () {
        await focusEditor(page);
        await page.keyboard.type('```javascript ');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">\`\`\`javascript </span></p>
        `);
    });

    test('ignores image card shortcut', async function () {
        await focusEditor(page);

        await page.keyboard.type('image! ');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">image! </span></p>
        `);
    });

    test('ignores slash menu on blank paragraph', async function () {
        await focusEditor(page);
        expect(await page.$('[data-kg-slash-menu]')).toBeNull();
        await page.keyboard.type('/');
        expect(await page.$('[data-kg-slash-menu]')).toBeNull();
    });

    describe('Floating format toolbar', async () => {
        test('appears on text selection', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            expect(await page.$('[data-kg-floating-toolbar]')).toBeNull();

            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            expect(await page.$('[data-kg-floating-toolbar]')).not.toBeNull();
        });

        test('does not has heading buttons', async function () {
            await focusEditor(page);
            await page.keyboard.type('text for selection');

            expect(await page.$('[data-kg-floating-toolbar]')).toBeNull();

            await page.keyboard.down('Shift');
            for (let i = 0; i < 'for selection'.length; i++) {
                await page.keyboard.press('ArrowLeft');
            }
            await page.keyboard.up('Shift');

            expect(await page.$('[data-kg-floating-toolbar]')).not.toBeNull();

            const boldButtonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="bold"] button`;
            expect(await page.$(boldButtonSelector)).not.toBeNull();

            const h2ButtonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="h2"] button`;
            expect(await page.$(h2ButtonSelector)).toBeNull();

            const h3ButtonSelector = `[data-kg-floating-toolbar] [data-kg-toolbar-button="h3"] button`;
            expect(await page.$(h3ButtonSelector)).toBeNull();
        });
    });
});
