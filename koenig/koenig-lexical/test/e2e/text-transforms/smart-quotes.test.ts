import {assertHTML, focusEditor, html, initialize, pasteHtml, pasteText} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Smart quotes', async () => {
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

    test.describe('typing', () => {
        test('converts double quotes', async function () {
            await focusEditor(page);
            await page.keyboard.type('"Hello," she said');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">“Hello,” she said</span></p>`);
        });

        test('converts single quotes and apostrophes', async function () {
            await focusEditor(page);
            await page.keyboard.type('It\'s \'fine\'');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">It’s ‘fine’</span></p>`);
        });

        test('corrects leading apostrophes', async function () {
            await focusEditor(page);
            await page.keyboard.type('rock \'n\' roll in the \'90s ');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">rock ’n’ roll in the ’90s </span></p>`);
        });

        test('uses primes for feet and inches', async function () {
            await focusEditor(page);
            await page.keyboard.type('She\'s 5\'10" and has a 12" pizza');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">She’s 5′10″ and has a 12″ pizza</span></p>`);
        });

        test('closes quotes that end with a number', async function () {
            await focusEditor(page);
            await page.keyboard.type('"I was 25" in the 1990\'s');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">“I was 25” in the 1990’s</span></p>`);
        });

        test('converts quotes typed with dead keys', async function ({browserName}) {
            test.skip(browserName !== 'chromium', 'composition is simulated through the Chrome DevTools Protocol');

            // a dead key (e.g. US-International) composes the quote rather than sending a keydown for it
            const client = await page.context().newCDPSession(page);
            const composeQuote = async () => {
                await client.send('Input.imeSetComposition', {text: '"', selectionStart: 1, selectionEnd: 1});
                await client.send('Input.insertText', {text: '"'});
            };

            await focusEditor(page);
            await page.keyboard.type('say ');
            await composeQuote();
            await page.keyboard.type('hi');
            await composeQuote();
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">say “hi”</span></p>`);
        });

        test('uses surrounding text when typing mid-sentence', async function () {
            await focusEditor(page);
            await page.keyboard.type('say hi');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.type('"');
            await page.keyboard.press('End');
            await page.keyboard.type('"');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">say “hi”</span></p>`);
        });

        test('leaves inline code alone', async function () {
            await focusEditor(page);
            await page.keyboard.type('`a "b"` ');
            await assertHTML(page, html`<p dir="ltr"><code spellcheck="false" data-lexical-text="true"><span>a "b"</span></code><span data-lexical-text="true"> </span></p>`);
        });

        test('can be undone', async function () {
            await focusEditor(page);
            await page.keyboard.type('"');
            await page.keyboard.press('Meta+z');
            await page.keyboard.press('Control+z');
            await assertHTML(page, html`<p><br></p>`);
        });
    });

    test.describe('pasting', () => {
        test('converts pasted plain text', async function () {
            await focusEditor(page);
            await pasteText(page, '"It\'s fine," she said.');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">“It’s fine,” she said.</span></p>`);
        });

        test('converts pasted html', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<p>"Don\'t <strong>panic</strong>"</p>');
            await assertHTML(page, html`<p dir="ltr"><span data-lexical-text="true">“Don’t </span><strong data-lexical-text="true">panic</strong><span data-lexical-text="true">”</span></p>`);
        });
    });
});
