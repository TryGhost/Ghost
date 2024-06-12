import {assertHTML, focusEditor, html, initialize, insertCard} from '../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Internal linking', async () => {
    let page;

    test.beforeAll(async ({browser}) => {
        page = await browser.newPage();
    });

    test.beforeEach(async () => {
        await initialize({page, uri: '/#/?content=false&labs=internalLinking'});
    });

    test.afterAll(async () => {
        await page.close();
    });

    test.describe('Bookmark card', function () {
        test('shows default options when opening', async function () {
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

        test('matches URL queries (http)', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('http');
            await expect(page.getByTestId('input-list-spinner')).not.toBeVisible();

            await assertHTML(page, html`
                <li><div>Link to web page</div></li>
                <li aria-selected="true" role="option">
                  <span>
                    <svg></svg>
                    <span>http</span>
                  </span>
                </li>
            `, {selector: '[data-testid="bookmark-url-dropdown"]'});
        });

        test('matches URL queries (anchor)', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('#test');
            await expect(page.getByTestId('input-list-spinner')).not.toBeVisible();

            await assertHTML(page, html`
                <li><div>Link to web page</div></li>
                <li aria-selected="true" role="option">
                  <span>
                    <svg></svg>
                    <span>#test</span>
                  </span>
                </li>
            `, {selector: '[data-testid="bookmark-url-dropdown"]'});
        });

        test('matches URL queries (relative)', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('/test');
            await expect(page.getByTestId('input-list-spinner')).not.toBeVisible();

            await assertHTML(page, html`
                <li><div>Link to web page</div></li>
                <li aria-selected="true" role="option">
                  <span>
                    <svg></svg>
                    <span>/test</span>
                  </span>
                </li>
            `, {selector: '[data-testid="bookmark-url-dropdown"]'});
        });

        test('matches URL queries (mailto)', async function () {
            await focusEditor(page);
            await insertCard(page, {cardName: 'bookmark'});
            await expect(page.getByTestId('bookmark-url-dropdown')).toBeVisible();

            await page.keyboard.type('mailto:test@example.com');
            await expect(page.getByTestId('input-list-spinner')).not.toBeVisible();

            await assertHTML(page, html`
                <li><div>Link to web page</div></li>
                <li aria-selected="true" role="option">
                  <span>
                    <svg></svg>
                    <span>mailto:test@example.com</span>
                  </span>
                </li>
            `, {selector: '[data-testid="bookmark-url-dropdown"]'});
        });
    });

    test.describe('Link toolbar', function () {});

    test.describe('At-linking', function () {
        test('displays default links with no query', async function () {
            await focusEditor(page);
            await page.keyboard.type('@');

            await assertHTML(page, html`
                <p>
                    <span>
                        <span data-lexical-text="true">‌</span>
                        <span
                            data-placeholder="Search for a link"
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
    });
});
