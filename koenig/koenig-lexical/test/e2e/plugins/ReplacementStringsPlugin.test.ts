import {assertHTML, focusEditor, html, initialize} from '../../utils/e2e';
import {test} from '@playwright/test';

test.describe('ReplacementStringsPlugin', async function () {
    test.describe('In email editor (ExtendedTextNode)', function () {
        let page;

        test.beforeAll(async ({browser}) => {
            page = await browser.newPage();
        });

        test.beforeEach(async () => {
            // full editor doesn't use the plugin directly; it's part of specific email cards
            await initialize({page, uri: '/#/email?content=false'});
        });

        test.afterAll(async () => {
            await page.close();
        });

        test('formats {first_name} as code', async function () {
            await focusEditor(page);
            await page.keyboard.type('Hello {first_name}!');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Hello </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}</span></code>
                    <span data-lexical-text="true">!</span>
                </p>
            `);
        });

        test('formats {first_name, "fallback"} as code', async function () {
            await focusEditor(page);
            await page.keyboard.type('Hello {first_name, "there"}!');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Hello </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name, "there"}</span></code>
                    <span data-lexical-text="true">!</span>
                </p>
            `);
        });

        test('formats {email} as code', async function () {
            await focusEditor(page);
            await page.keyboard.type('Your email is {email}');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Your email is </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{email}</span></code>
                </p>
            `);
        });

        test('handles multiple replacement strings in same paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Hi {first_name}, your email is {email}');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Hi </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}</span></code>
                    <span data-lexical-text="true">, your email is </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{email}</span></code>
                </p>
            `);
        });

        test('formats replacement string at start of paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('{first_name} is here');

            await assertHTML(page, html`
                <p dir="ltr">
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}</span></code>
                    <span data-lexical-text="true"> is here</span>
                </p>
            `);
        });

        test('formats replacement string at end of paragraph', async function () {
            await focusEditor(page);
            await page.keyboard.type('Name: {first_name}');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Name: </span>
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}</span></code>
                </p>
            `);
        });

        test('formats standalone replacement string', async function () {
            await focusEditor(page);
            await page.keyboard.type('{first_name}');

            await assertHTML(page, html`
                <p dir="ltr">
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}</span></code>
                </p>
            `);
        });

        test('handles adjacent replacement strings', async function () {
            await focusEditor(page);
            await page.keyboard.type('{first_name}{last_name}');

            await assertHTML(page, html`
                <p dir="ltr">
                    <code spellcheck="false" data-lexical-text="true"><span>{first_name}{last_name}</span></code>
                </p>
            `);
        });

        test('does not format incomplete braces', async function () {
            await focusEditor(page);
            await page.keyboard.type('This {is incomplete');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">This {is incomplete</span>
                </p>
            `);
        });

        test('formats empty braces as replacement string', async function () {
            await focusEditor(page);
            await page.keyboard.type('Empty {} braces');

            await assertHTML(page, html`
                <p dir="ltr">
                    <span data-lexical-text="true">Empty</span>
                    <code spellcheck="false" data-lexical-text="true"><span>{}</span></code>
                    <span data-lexical-text="true">braces</span>
                </p>
            `);
        });
    });
});
