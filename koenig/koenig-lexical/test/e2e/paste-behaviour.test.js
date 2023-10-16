import fs from 'fs';
import {assertHTML, focusEditor, html, initialize, pasteHtml, pasteText} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Paste behaviour', async () => {
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

    test.describe('Text', function () {
        test('converts line breaks to paragraphs', async function () {
            await focusEditor(page);
            await pasteText(page, 'One\n\nTwo\n\nThree');
            await assertHTML(page, html`
                <p dir="ltr"><span data-lexical-text="true">One</span></p>
                <p dir="ltr"><span data-lexical-text="true">Two</span></p>
                <p dir="ltr"><span data-lexical-text="true">Three</span></p>
            `);
        });
    });

    test.describe('URLs', function () {
        test('pasted at start of populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Space');

            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true"></span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                    <span data-lexical-text="true">1 2</span>
                </p>
            `);
        });

        test('pasted mid populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('ArrowLeft');
            await page.keyboard.press('Space');

            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                    <span data-lexical-text="true">2</span>
                </p>
            `);
        });

        test('pasted at end of populated paragraph creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 2 ');
            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1 2</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org</span>
                    </a>
                </p>
            `);
        });

        test('pasted on selected text converts to link', async function () {
            await focusEditor(page);
            await page.keyboard.type('1 test');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await page.keyboard.press('Shift+ArrowLeft');
            await pasteText(page, 'https://ghost.org');

            await assertHTML(page, html`
                <p>
                    <span data-lexical-text="true">1</span>
                    <a href="https://ghost.org" dir="ltr">
                        <span data-lexical-text="true">test</span>
                    </a>
                </p>
            `);
        });

        test('pasted on blank paragraph creates embed/bookmark', async function () {
            await focusEditor(page);
            await pasteText(page, 'https://ghost.org/');
            await expect(page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(page.getByTestId('embed-url-loading-container')).toBeHidden();
            await expect(page.getByTestId('embed-iframe')).toBeVisible();
        });

        test('pasted on blank paragraph with shift creates a link', async function () {
            await focusEditor(page);
            await page.keyboard.down('Shift');
            await pasteText(page, 'https://ghost.org/');
            await page.keyboard.up('Shift');

            await assertHTML(page, html`
                <p>
                    <a href="https://ghost.org/" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org/</span>
                    </a>
                </p>
            `);
        });

        test('pasted on a card shortcut avoids conversion', async function () {
            await focusEditor(page);
            await page.keyboard.type('/embed ');
            await pasteText(page, 'https://ghost.org/');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">/embed https://ghost.org/</span>
                </p>
            `);

            await page.keyboard.press('Enter');

            await expect(page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(page.getByTestId('embed-url-loading-container')).toBeHidden();
            await expect(page.getByTestId('embed-iframe')).toBeVisible();
        });
    });

    test.describe('Styles', function () {
        test('text alignment styles are stripped from paragraphs on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<p style="text-align: center">Testing</p>');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are stripped from headings on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<h1 style="text-align: center">Testing</h1>');

            await assertHTML(page, html`
                <h1 dir="ltr"><span data-lexical-text="true">Testing</span></h1>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are stripped from quotes on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<blockquote style="text-align: center">Testing</blockquote>');

            await assertHTML(page, html`
                <blockquote dir="ltr"><span data-lexical-text="true">Testing</span></blockquote>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text alignment styles are not copied over for lists on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<ul style="text-align: center"><li style="text-align: center">Testing</li></ul>');

            await assertHTML(page, html`
                <ul>
                    <li value="1" dir="ltr"><span data-lexical-text="true">Testing</span></li>
                </ul>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('text format styles are not copied over on paste', async function () {
            await focusEditor(page);
            await pasteHtml(page, '<p style="color: red"><span style="color: red">Testing</span></p>');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });
    });

    test.describe('Office.com Word', function () {
        test('supports basic text formatting', async function () {
            const copiedHtml = fs.readFileSync('test/e2e/fixtures/paste/office-com-text-formats.html', 'utf8');

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Testing</span>
                    <strong data-lexical-text="true">bold</strong>
                    <span data-lexical-text="true"></span>
                    <em class="italic" data-lexical-text="true">italic</em>
                    <span class="underline" data-lexical-text="true">underline</span>
                    <span data-lexical-text="true"></span>
                    <span class="line-through" data-lexical-text="true">strikethrough</span>
                    <span data-lexical-text="true"></span>
                    <sub data-lexical-text="true"><span>subscript</span></sub>
                    <sup data-lexical-text="true"><span>supscript</span></sup>
                    <a href="https://ghost.org/" target="_blank" rel="noreferrer noopener" dir="ltr">
                        <span class="underline" data-lexical-text="true">link</span>
                    </a>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p dir="ltr">
                    <strong class="italic underline" data-lexical-text="true">Bold+italic+underline</strong>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p>
                    <a href="https://ghost.org/" target="_blank" rel="noreferrer noopener" dir="ltr">
                        <strong class="italic" data-lexical-text="true">Bold+italic+link</strong>
                    </a>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
                <p dir="ltr">
                    <mark data-lexical-text="true"><span>highlight</span></mark>
                    <span data-lexical-text="true">&nbsp;</span>
                </p>
            `, {ignoreClasses: false, ignoreInlineStyles: false});
        });

        test('supports headings', async function () {
            const copiedHtml = fs.readFileSync('test/e2e/fixtures/paste/office-com-headings.html', 'utf8');

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h1 dir="ltr"><span data-lexical-text="true">Heading one&nbsp;</span></h1>
                <h2 dir="ltr"><span data-lexical-text="true">Heading two&nbsp;</span></h2>
                <h3 dir="ltr"><span data-lexical-text="true">Heading three&nbsp;</span></h3>
                <h4 dir="ltr"><em data-lexical-text="true">Heading four&nbsp;</em></h4>
            `);
        });
    });

    test.describe('Invalid nesting', function () {
        // if we have inline elements converting to block elements such as Google Docs
        // spans converting to headings then we need to make sure we don't end up with
        // invalid nesting in the editor

        test('paragraphs containing Google Docs heading span at start', async function () {
            const copiedHtml = `<p><span style="font-size: 26pt">Nested heading</span> Text after</p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
                <p dir="ltr">
                    <span data-lexical-text="true">Text after</span>
                </p>
            `);
        });

        test('paragraphs containing Google Docs heading span at end', async function () {
            const copiedHtml = `<p>Paragraph <strong>with</strong> <em>elements</em><span style="font-size: 26pt">Nested heading</span></p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Paragraph</span>
                    <strong data-lexical-text="true">with</strong>
                    <span data-lexical-text="true"></span>
                    <em data-lexical-text="true">elements</em>
                </p>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
            `);
        });

        test('paragraphs containing Google Docs heading span in middle', async function () {
            const copiedHtml = `<p>Text before <span style="font-size: 26pt">Nested heading</span> Text after</p>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Text before</span>
                </p>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested heading</span>
                </h1>
                <p dir="ltr">
                    <span data-lexical-text="true">Text after</span>
                </p>
            `);
        });

        test('headings containing Google Docs title span', async function () {
            const copiedHtml = `<h2>Normal H2 <span style="font-size: 26pt">Nested Google heading</span></h2>`;

            await focusEditor(page);
            await pasteHtml(page, copiedHtml);

            await assertHTML(page, html`
                <h2 dir="ltr">
                    <span data-lexical-text="true">Normal H2</span>
                </h2>
                <h1 dir="ltr">
                    <span data-lexical-text="true">Nested Google heading</span>
                </h1>
            `);
        });
    });
});
