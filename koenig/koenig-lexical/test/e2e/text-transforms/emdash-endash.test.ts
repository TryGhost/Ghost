import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('Renders horizontal line rule', async () => {
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

    test.describe('emdash', () => {
        test('renders with text and space on either side', async function () {
            await focusEditor(page);
            await page.keyboard.type('text--- ');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text— </span></p>`);
        });

        test('renders with text and text on either side', async function () {
            await focusEditor(page);
            await page.keyboard.type('text---text');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text—text</span></p>`);
        });

        test('renders with space and space on either side', async function () {
            await focusEditor(page);
            await page.keyboard.type('text --- ');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text — </span></p>`);
        });

        test('renders in the middle of text', async function () {
            await focusEditor(page);
            await page.keyboard.type('texttext');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.type('---');
            
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text—text</span></p>`);
        });
    });

    test.describe('endash', () => {
        test('renders with text and space on either side', async function () {
            await focusEditor(page);
            await page.keyboard.type('text-- ');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text– </span></p>`);
        });

        test('renders with space and space on either side', async function () {
            await focusEditor(page);
            await page.keyboard.type('text -- ');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text – </span></p>`);
        });

        test('does render in the middle of text with space', async function () {
            await focusEditor(page);
            await page.keyboard.type('texttext');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.type('-- ');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text– text</span></p>`);
        });

        test('does not render in the middle of text without space', async function () {
            await focusEditor(page);
            await page.keyboard.type('texttext');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.type('--');
            await assertHTML(page, html`<p dir=\"ltr\"><span data-lexical-text=\"true\">text--text</span></p>`);
        });
    });
});
