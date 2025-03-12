import {assertHTML, focusEditor, html, initialize, pasteText} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Linking', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        // searchLinks (and therefore internal linking) is provided by default,
        // can be turned off with /#/?searchLinks=false
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('with toolbar', function () {
        test.fixme('can type custom link', async function () {});
        test.fixme('can paste custom link', async function () {});
        test.fixme('can insert a default link', async function () {});
        test.fixme('can insert a searched link', async function () {});
        test.fixme('can edit a link', async function () {});
        test.fixme('can remove a link', async function () {});
    });

    test.describe('with @-link', function () {
        test('displays default links with no query', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');

            await assertHTML(page, html`
                <p>
                    <span>
                        <svg></svg>
                        <span data-lexical-text="true">‌</span>
                        <span
                            data-placeholder="Find a post, tag or author"
                            data-lexical-text="true"
                        ></span>
                    </span>
                </p>
            `);

            await assertHTML(page, html`
                <div>
                    <div>
                        <div>
                            <ul>
                                <li><div>Latest posts</div></li>
                                <li aria-selected="true" role="option">
                                    <span><span>Remote Work's Impact on Job Markets and Employment</span></span>
                                    <span>
                                        <span title="Members only"><svg></svg></span>
                                        <span>8 May 2024</span>
                                    </span>
                                </li>
                                <li aria-selected="false" role="option">
                                    <span><span>Robotics Renaissance: How Automation is Transforming Industries</span></span>
                                </li>
                                <li aria-selected="false" role="option">
                                    <span><span>Biodiversity Conservation in Fragile Ecosystems</span></span>
                                </li>
                                <li aria-selected="false" role="option">
                                    <span><span>Unveiling the Crisis of Plastic Pollution: Analyzing Its Profound Impact on the Environment</span></span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            `, {selector: '[data-testid="at-link-popup"]'});
        });

        test('can search for links', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');
            await page.keyboard.type('Emo');

            await assertHTML(page, html`
                <p>
                    <span dir="ltr">
                        <svg></svg>
                        <span data-lexical-text="true">‌</span>
                        <span data-placeholder="" data-lexical-text="true">Emo</span>
                    </span>
                </p>
            `);

            // wait for search to complete
            await expect(page.locator('[data-testid="at-link-results-listOption-label"]')).toContainText(['✨ Emoji autocomplete ✨']);

            await assertHTML(page, html`
                <div>
                    <div>
                        <div>
                            <ul>
                                <li><div>Posts</div></li>
                                <li aria-selected="true" role="option">
                                    <span><span>✨ <span>Emo</span>ji autocomplete ✨</span></span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            `, {selector: '[data-testid="at-link-popup"]'});
        });

        test('has custom no result options', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');
            await page.keyboard.type('Unknown page');

            await expect(page.locator('[data-testid="at-link-popup"]')).toContainText('No results found');

            await page.keyboard.press('Enter');

            await assertHTML(page, html`
                <p><span data-lexical-text="true">@Unknown page</span></p>
            `);
        });

        test('removes at-linking when backspacing', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');
            await page.keyboard.type('AB');

            await page.keyboard.press('Backspace');
            await page.keyboard.press('Backspace');
            // we should now have an empty input field with placeholder text
            await assertHTML(page, html`
                <p>
                    <span>
                        <svg></svg>
                        <span data-lexical-text="true">‌</span>
                        <span
                            data-placeholder="Find a post, tag or author"
                            data-lexical-text="true"
                        ></span>
                    </span>
                </p>
            `);

            await page.keyboard.press('Backspace');

            // it should now remove the at-linking entirely leaving only an @
            await assertHTML(page, html`
                <p><span data-lexical-text="true">@</span></p>
            `);
        });

        test('creates a bookmark when at-linking from a line', async function () {
            await focusEditor(page);

            await page.keyboard.type('@');
            await page.keyboard.type('Emo');
            await expect(page.locator('[data-testid="at-link-results-listOption-label"]')).toContainText(['✨ Emoji autocomplete ✨']);
            await page.keyboard.press('Enter');
            // now wait till data-testid="bookmark-container" appears
            await page.waitForSelector('[data-testid="bookmark-container"]');
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                    <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="bookmark">
                        <div>
                            <div>
                                <div>
                                    <div>Ghost: The Creator Economy Platform</div>
                                    <div>
                                        The former of the two songs addresses the issue of negative rumors
                                        in a relationship, while the latter, with a more upbeat pulse, is a
                                        classic club track; the single is highlighted by a hyped bridge.
                                    </div>
                                    <div>
                                        <img alt="" src="https://www.ghost.org/favicon.ico" />
                                        <span>Ghost - The Professional Publishing Platform</span>
                                        <span>Author McAuthory</span>
                                    </div>
                                </div>
                                <div><img alt="" src="https://ghost.org/images/meta/ghost.png" /></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div contenteditable="false" data-lexical-cursor="true"></div>
            `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
        });

        test('can paste into at-link node', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');
            await pasteText(page, 'https://ghost.org');
            await expect(page.getByTestId('at-link-results')).toBeVisible();

            await assertHTML(page, html`
                <p>
                    <span dir="ltr">
                        <svg></svg>
                        <span data-lexical-text="true">‌</span>
                        <span data-placeholder="" data-lexical-text="true">https://ghost.org</span>
                    </span>
                </p>
            `);
        });
    });
});
