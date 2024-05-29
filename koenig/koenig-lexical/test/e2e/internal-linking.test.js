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
                          <li>Latest posts</li>
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

            await expect(page.locator('[data-testid="bookmark-url-listOption"]')).toBeVisible();
        });
    });

    test.describe('Link toolbar', function () {

    });

    test.describe('At-linking', function () {

    });
});
