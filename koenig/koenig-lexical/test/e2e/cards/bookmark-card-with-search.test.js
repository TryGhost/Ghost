import {assertHTML, createSnippet, focusEditor, html, initialize, insertCard, isMac, pasteText} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Bookmark card (with searchLinks)', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
    let page;
    let errors;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();

        page.on('pageerror', (err) => {
            errors.push(err.message);
        });
    });

    test.beforeEach(async () => {
        errors = [];
        await initialize({page});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test('can import serialized bookmark card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    type: 'bookmark',
                    url: 'https://www.ghost.org/',
                    caption: 'caption here',
                    metadata: {
                        icon: 'https://www.ghost.org/favicon.ico',
                        title: 'Ghost: The Creator Economy Platform',
                        description: 'lorem ipsum dolor amet lorem ipsum dolor amet',
                        author: 'ghost',
                        publisher: 'Ghost - The Professional Publishing Platform',
                        thumbnail: 'https://ghost.org/images/meta/ghost.png'
                    }
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="bookmark">
                    <div>
                        <div>
                            <div>
                                <div>Ghost: The Creator Economy Platform</div>
                                <div>lorem ipsum dolor amet lorem ipsum dolor amet</div>
                                <div>
                                    <img alt="" src="https://www.ghost.org/favicon.ico" />
                                    <span>Ghost - The Professional Publishing Platform</span>
                                    <span>ghost</span>
                                </div>
                            </div>
                            <div><img alt="" src="https://ghost.org/images/meta/ghost.png" /></div>
                            <div></div>
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
                                                <span data-lexical-text="true">caption here</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </figcaption>
                    </div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('renders bookmark card node', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="bookmark"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can interact with url input after inserting', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        const urlInput = await page.getByTestId('bookmark-url');
        await expect(urlInput).toHaveAttribute('placeholder','Paste URL or search posts and pages...');

        await urlInput.fill('test');
        await expect(urlInput).toHaveValue('test');
    });

    test.describe('Valid URL handling', async () => {
        test('shows loading wheel', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(page.getByTestId('bookmark-url-loading-container')).toBeVisible();
            await expect(page.getByTestId('bookmark-url-loading-spinner')).toBeVisible();
        });

        test('displays expected metadata', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(page.getByTestId('bookmark-title')).toHaveText('Ghost: The Creator Economy Platform');
            await expect(page.getByTestId('bookmark-description')).toContainText('The former of the two songs addresses the issue of negative rumors in a relationship, while the latter, with a more upbeat pulse, is a classic club track; the single is highlighted by a hyped bridge.');
            await expect(page.getByTestId('bookmark-publisher')).toContainText('Ghost - The Professional Publishing Platform');
        });

        // TODO: the caption editor is very nested, and we don't have an actual input field here, so we aren't testing for filling it
        test('caption displays on insert', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            const captionInput = await page.getByTestId('bookmark-caption');
            await expect(captionInput).toContainText('Type caption for bookmark (optional)');
        });
    });

    test.describe('Error Handling', async () => {
        test('bad url entry shows error message', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            await expect(page.getByTestId('bookmark-url-error-message')).toContainText('Oops, that link didn\'t work.');
        });

        test('retry button bring back url input', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL or search posts and pages...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('bookmark-url-error-retry');
            await retryButton.click();

            const urlInputRetry = await page.getByTestId('bookmark-url');
            await expect(urlInputRetry).toHaveValue('badurl');
            await expect(retryButton).not.toBeVisible();
        });

        // todo: test is failing, need to figure if the error in test logic or on code
        test.skip('paste as link button removes card and inserts text node link', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL or search posts and pages...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('bookmark-url-error-pasteAsLink');
            await retryButton.click();

            await assertHTML(page, html`
                <p>
                    <a href="badurl" dir="ltr"><span data-lexical-text="true">badurl</span></a>
                </p>
                <p><br /></p>
            `);
        });

        test('close button removes card', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});

            const urlInput = await page.getByTestId('bookmark-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL or search posts and pages...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('bookmark-url-error-close');
            await retryButton.click();

            await assertHTML(page, html`<p><br /></p>`);
        });
    });

    test('can add snippet', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        const urlInput = await page.getByTestId('bookmark-url');
        await urlInput.fill('https://ghost.org/');
        await urlInput.press('Enter');
        await expect(page.getByTestId('bookmark-description')).toBeVisible();

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-kg-card="bookmark"]')).toHaveCount(2);
    });

    test('can undo/redo without losing caption', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        const urlInput = await page.getByTestId('bookmark-url');
        await urlInput.fill('https://ghost.org/');
        await urlInput.press('Enter');
        await expect(page.getByTestId('bookmark-description')).toBeVisible();

        await page.click('[data-testid="bookmark-caption"]');
        await page.keyboard.type('My test caption');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="bookmark">
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
                                                <span data-lexical-text="true">My test caption</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </figcaption>
                    </div>
                    <div data-kg-card-toolbar="bookmark"></div>
                </div>
            </div>
            <p><br /></p>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('escape removes url input component', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        await page.keyboard.press('Escape');

        await assertHTML(page, html`
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('escape removes url error component', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        await page.keyboard.type('badurl');
        await page.keyboard.press('Enter');

        await expect(page.getByTestId('bookmark-url-error-message')).toContainText('Oops, that link didn\'t work.');

        await page.keyboard.press('Escape');

        await assertHTML(page, html`
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    // AtLinkPlugin added a PASTE_COMMAND handler which didn't account for
    // pastes occurring in input fields inside the main editor resulting in a TypeError
    test('can paste into URL input', async function () {
        await focusEditor(page);
        await insertCard(page, {cardName: 'bookmark'});

        const urlInput = await page.getByTestId('bookmark-url');
        await expect(urlInput).toBeFocused();

        await pasteText(page, 'https://ghost.org/');

        expect(errors).toEqual([]);
    });

    // Searchable URL input ----------------------------------------------------

    test.describe('Search', function () {
        test('shows default options when opening', async function () {
            await page.mouse.move(0,0); // was triggering hover state on option after the first
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();
            await assertHTML(page, html`
                <div data-lexical-decorator="true" contenteditable="false">
                  <div
                    data-kg-card-editing="false"
                    data-kg-card-selected="true"
                    data-kg-card="bookmark">
                    <div>
                      <div>
                        <div><input placeholder="Paste URL or search posts and pages..." value="" /></div>
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
                </div>
                <p><br /></p>
            `);
        });

        test('shows metadata on selected items', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await assertHTML(page, html`
                <span><span>Remote Work's Impact on Job Markets and Employment</span></span>
                <span>
                  <span title="Members only"><svg></svg></span>
                  <span>8 May 2024</span>
                </span>
            `, {selector: '[data-testid="bookmark-url-listOption"][aria-selected="true"]'});

            await page.keyboard.press('ArrowDown');

            // first item no longer shows metadata

            await assertHTML(page, html`
                <span><span>Remote Work's Impact on Job Markets and Employment</span></span>
            `, {selector: '[data-testid="bookmark-url-listOption"]'});

            // second now-selected item shows metadata
            await assertHTML(page, html`
                <span><span>Robotics Renaissance: How Automation is Transforming Industries</span></span>
                <span>
                  <span title="Specific tiers only"><svg></svg></span>
                  <span>2 May 2024</span>
                </span>
            `, {selector: '[data-testid="bookmark-url-listOption"][aria-selected="true"]'});
        });

        test('highlights matches in results', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('Emoji');

            await expect(page.locator('[data-testid="bookmark-url-listOption"]')).toBeVisible();
            await expect(page.locator('span.font-bold').first()).toHaveText('Emoji');
        });

        test('does not crash with regexp chars in search', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('[');

            await expect(page.locator('[data-testid="bookmark-url-dropdown"]')).toBeVisible();
        });

        test('filters options whilst typing', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('e');

            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('TK Reminders');

            await page.keyboard.type('mo');

            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('✨ Emoji autocomplete ✨');
        });

        test('can change selected item with arrow keys', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('Remote Work\'s Impact on Job Markets and Employment');
            await page.keyboard.press('ArrowDown');
            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('Robotics Renaissance: How Automation is Transforming Industries');
            await page.keyboard.press('ArrowUp');
            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('Remote Work\'s Impact on Job Markets and Employment');
        });

        test('inserts selected item on enter', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();
            await page.keyboard.type('Emoji');
            await expect(page.locator('[data-testid="bookmark-url-listOption"][aria-selected="true"]')).toContainText('✨ Emoji autocomplete ✨');
            await page.keyboard.press('Enter');

            // NOTE: this doesn't test for the right item being inserted because
            // the demo app always inserts a mocked oembed response
            await expect(page.getByTestId('bookmark-url-loading-spinner')).toBeVisible();
            await expect(page.getByTestId('bookmark-container')).toBeVisible();
        });

        test('inserts item on click', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await page.click('[data-testid="bookmark-url-listOption"]:nth-child(2)');

            // NOTE: this doesn't test for the right item being inserted because
            // the demo app always inserts a mocked oembed response
            await expect(page.getByTestId('bookmark-url-loading-spinner')).toBeVisible();
            await expect(page.getByTestId('bookmark-container')).toBeVisible();
        });

        test('handles Enter with no matching result', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await page.keyboard.type('Not a valid match');

            await expect(page.getByText('Enter URL to create link')).toBeVisible();

            await page.keyboard.press('Enter');

            await expect(page.getByText('Enter URL to create link')).toBeVisible();

            expect(errors).toEqual([]);
        });

        [
            'http',
            '#test',
            '/test',
            'mailto:'
        ].forEach((expected) => {
            test(`handles URL-like inputs (${expected})`, async function () {
                await focusEditor(page);
                await insertCard(page, {cardName: 'bookmark'});
                await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

                await page.keyboard.type(expected);
                await expect(page.getByTestId('input-list-spinner')).not.toBeVisible();

                await assertHTML(page, html`
                    <li><div>Link to web page</div></li>
                    <li aria-selected="true" role="option">
                    <span>
                        <svg></svg>
                        <span>${expected}</span>
                    </span>
                    </li>
                `, {selector: '[data-testid="bookmark-url-dropdown"]'});
            });
        });
    });
});
