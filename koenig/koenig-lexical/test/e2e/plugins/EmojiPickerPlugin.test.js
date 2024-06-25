import {assertHTML, ctrlOrCmd, focusEditor, html, initialize, insertCard} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Emoji Picker Plugin', async function () {
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

    test('displays an emoji menu when typing : followed by a character', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
    });

    test('hides emoji menu when typing a space after the colon', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.press('Space');
        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
    });

    test('hides the emoji menu when pressing escape', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
    });

    test('can use the arrow keys to navigate the emoji menu', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'false');

        await page.keyboard.press('ArrowDown');
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'false');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'true');

        await page.keyboard.press('ArrowUp');
        await expect(page.getByTestId('emoji-option-0')).toHaveAttribute('aria-selected', 'true');
        await expect(page.getByTestId('emoji-option-1')).toHaveAttribute('aria-selected', 'false');
    });

    test('can use the enter key to select an emoji', async function () {
        await focusEditor(page);

        await page.keyboard.type(':+1');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.keyboard.press('Enter');

        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">👍</span></p>');
    });

    test('filters the emoji menu when typing', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🦖t-rex');
        await expect(page.getByTestId('emoji-option-1')).toHaveText('🏓table_tennis_paddle_and_ball');

        await page.keyboard.type('a');
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🏓table_tennis_paddle_and_ball');
        await expect(page.getByTestId('emoji-option-1')).toHaveText('🌮taco');

        await page.keyboard.type('c');
        await expect(page.getByTestId('emoji-option-0')).toHaveText('🌮taco');
        await expect(page.getByTestId('emoji-option-1')).not.toBeVisible();

        await page.keyboard.press('Enter');
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮</span></p>');
    });

    test('can use the mouse to select an emoji', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.click('[data-testid="emoji-option-2"]');

        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮</span></p>');
    });

    test('can use punctuation', async function () {
        await focusEditor(page);

        await page.keyboard.type(':t-rex');
        await expect(page.getByTestId('emoji-menu')).toBeVisible();

        await page.keyboard.press('Enter');
        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🦖</span></p>');
    });

    test('can put emojis back to back without spaces', async function () {
        await focusEditor(page);

        await page.keyboard.type(':tac', {delay: 10});
        await page.keyboard.press('Enter');
        await page.keyboard.type(':tac', {delay: 10});
        await page.keyboard.press('Enter');
        await page.keyboard.type('s for all', {delay: 10});

        await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮🌮s for all</span></p>');
    });

    test('emojis retain text formatting on menu insert', async function () {
        await focusEditor(page);
        await page.keyboard.press('Control+Alt+H');
        await page.keyboard.type('Test :taco', {delay: 10});
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.press('Enter');

        await assertHTML(page, '<p dir="ltr"><mark data-lexical-text="true"><span>Test 🌮</span></mark></p>');
    });

    test('emojis retain text formatting on : completion', async function () {
        await focusEditor(page);
        await page.keyboard.press('Control+Alt+H');
        await page.keyboard.type('Test :heart', {delay: 10});
        await expect(page.getByTestId('emoji-menu')).toBeVisible();
        await page.keyboard.type(':', {delay: 10});

        await assertHTML(page, '<p dir="ltr"><mark data-lexical-text="true"><span>Test ❤️</span></mark></p>');
    });

    test('can handle :, with no search matches', async function () {
        await focusEditor(page);
        await page.keyboard.type(':,', {delay: 10});
        await expect(page.getByTestId('emoji-menu')).not.toBeVisible();
        // can continue typing (previous bug crashed editor)
        await page.keyboard.type(' testing');

        await assertHTML(page, html`
            <p dir="ltr"><span data-lexical-text="true">:, testing</span></p>
        `);
    });

    test(`can use emojis in nested editors`, async function () {
        await focusEditor(page);

        await insertCard(page, {cardName: 'callout'});

        await page.keyboard.type(':tac', {delay: 10});
        await page.keyboard.press('Enter');
        await page.keyboard.type('s for all', {delay: 10});

        await page.keyboard.press(`${ctrlOrCmd()}+Enter`); // exit edit mode

        await assertHTML(page, `
        <div data-lexical-decorator="true" contenteditable="false">
          <div
            data-kg-card-editing="false"
            data-kg-card-selected="true"
            data-kg-card="callout">
            <div>
              <div><button type="button">💡</button></div>
              <div>
                <div data-kg="editor">
                  <div
                    contenteditable="false"
                    role="textbox"
                    spellcheck="true"
                    data-lexical-editor="true"
                    aria-autocomplete="none"
                    aria-readonly="true">
                    <p dir="ltr"><span data-lexical-text="true">🌮s for all</span></p>
                  </div>
                </div>
              </div>
            </div>
            <div></div>
            <div data-kg-card-toolbar="callout">
              <ul>
                <li>
                  <button
                    aria-label="Edit"
                    data-kg-active="false"
                    type="button">
                    <svg></svg>
                  </button>
                  <div><span>Edit</span></div>
                </li>
                <li></li>
                <li>
                  <button
                    aria-label="Save as snippet"
                    data-kg-active="false"
                    type="button">
                    <svg></svg>
                  </button>
                  <div><span>Save as snippet</span></div>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <p><br /></p>
        `);
    });

    // not sure why this test is flaky on CI...
    test.skip('can use emojis in captions', async function () {
        await focusEditor(page);

        await page.keyboard.type('```js ', {delay: 10});
        await page.keyboard.type(`sample code`, {delay: 10});
        await page.keyboard.press(`${ctrlOrCmd()}+Enter`);
        await page.keyboard.type('enjoy :ta', {delay: 10});
        await page.keyboard.press('ArrowDown'); // make sure we test arrow key use
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('Enter'); // make sure we test enter key use
        await page.keyboard.type('s for all', {delay: 10});

        await assertHTML(page, `
        <div data-lexical-decorator="true" contenteditable="false">
            <div
                data-kg-card-editing="false"
                data-kg-card-selected="true"
                data-kg-card="codeblock">
                <div>
                <pre><code>sample code</code></pre>
                <div><span>js</span></div>
                </div>
                <figcaption>
                <div data-kg-allow-clickthrough="true">
                    <div>
                    <div data-kg="editor">
                        <div
                        contenteditable="true"
                        role="textbox"
                        spellcheck="true"
                        data-lexical-editor="true">
                        <p dir="ltr">
                            <span data-lexical-text="true">enjoy 🌮s for all</span>
                        </p>
                        </div>
                    </div>
                    </div>
                </div>
                </figcaption>
                <div data-kg-card-toolbar="button">
                <ul>
                    <li>
                    <button
                        aria-label="Edit"
                        data-kg-active="false"
                        type="button">
                        <svg></svg>
                    </button>
                    <div><span>Edit</span></div>
                    </li>
                    <li></li>
                    <li>
                    <button
                        aria-label="Save as snippet"
                        data-kg-active="false"
                        type="button">
                        <svg></svg>
                    </button>
                    <div><span>Save as snippet</span></div>
                    </li>
                </ul>
                </div>
            </div>
        </div>
        `);
    });

    test.describe('Completion matching', async function () {
        test('can insert emojis by providing the whole :shortcode:', async function () {
            await focusEditor(page);

            await page.keyboard.type(':taco:');
            await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">🌮</span></p>');
        });

        test('a whole :shortcode: with no emojis matches inserts nothing', async function () {
            await focusEditor(page);

            await page.keyboard.type(':tac:');
            await assertHTML(page, '<p dir="ltr"><span data-lexical-text="true">:tac:</span></p>');
        });
    });
});
