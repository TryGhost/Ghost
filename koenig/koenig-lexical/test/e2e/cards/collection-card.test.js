import {assertHTML, createSnippet, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

async function insertCollectionCard(page) {
    await page.keyboard.type('/collect');
    await page.waitForSelector('[data-kg-card-menu-item="Post collection"][data-kg-cardmenu-selected="true"]');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-kg-card="collection"]');
}

test.describe('Collection card', async () => {
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

    test('can import serialized collection card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
            root: {
                children: [{
                    type: 'collection',
                    collection: 'latest',
                    header: 'Newest posts',
                    postCount: 3,
                    layout: 'grid',
                    columns: '3'
                }],
                direction: null,
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        // no post data but that's fine for this example
        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="collection">
                    <div>
                        <div data-kg="editor">
                            <div contenteditable="false"
                            role="textbox"
                            spellcheck="true"
                            data-lexical-editor="true"
                            aria-autocomplete="none"
                            aria-readonly="true">
                                <p dir="ltr"><span data-lexical-text="true">Newest posts</span></p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div>
                            <div>
                                <div></div>
                                <svg></svg>
                            </div>
                            <div>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div></div>
                                <svg></svg>
                            </div>
                            <div>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                        <div>
                            <div>
                                <div></div>
                                <svg></svg>
                            </div>
                            <div>
                                <div></div>
                                <div></div>
                            </div>
                        </div>
                    </div>
                    <div></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true, ignoreInnerSVG: true});
    });

    test('renders collection card node', async function () {
        await focusEditor(page);
        await insertCollectionCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false" data-kg-card-width="wide">
                <div data-kg-card-editing="true" data-kg-card-selected="true" data-kg-card="collection"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can edit header', async function () {
        await focusEditor(page);
        await insertCollectionCard(page);

        const header = await page.getByTestId('collection-header');
        await expect(header).toHaveText('Latest');
        
        await header.press('Backspace');
        await header.press('Backspace');
        await header.press('Backspace');
        await header.press('Backspace');
        await header.press('Backspace');
        await header.press('Backspace');

        await page.keyboard.type('Newest posts');
        await expect(header).toHaveText('Newest posts');
    });

    test.describe('settings', async () => {
        test('has settings panel', async function () {
            await focusEditor(page);
            await insertCollectionCard(page);

            await expect(await page.getByTestId('settings-panel')).toBeVisible();
            await expect(await page.getByTestId('collections-dropdown')).toBeVisible();
            await expect(await page.getByTestId('collection-layout-grid')).toBeVisible();
            await expect(await page.getByTestId('collection-layout-list')).toBeVisible();
            await expect(await page.locator('.test-collection-post-count-thumb')).toBeVisible();
            await expect(await page.locator('.test-collection-columns-thumb')).toBeVisible();
        });

        test('can change layout', async function () {
            await focusEditor(page);
            await insertCollectionCard(page);

            const postsContainer = await page.getByTestId('collection-posts-container');
            await expect(postsContainer).toHaveClass('grid w-full grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3');
            await page.getByTestId('collection-layout-list').click();
            await expect(postsContainer).toHaveClass('grid w-full gap-8');
        });

        test('can change post count', async function () {
            await focusEditor(page);
            await insertCollectionCard(page);

            const postCount = await page.getByTestId('collection-post-count-value');
            await expect(postCount).toHaveText('3');

            const postCountSlider = await page.locator('.test-collection-post-count-thumb');
            await postCountSlider.hover();
            await page.mouse.down();
            await page.mouse.move(100, 0);
            await page.mouse.up();
            
            await expect(postCount).toHaveText('1');
        });

        test('can change columns', async function () {
            await focusEditor(page);
            await insertCollectionCard(page);

            const columns = await page.getByTestId('collection-columns-value');
            await expect(columns).toHaveText('3');

            const columnsSlider = await page.locator('.test-collection-columns-thumb');
            await columnsSlider.hover();
            await page.mouse.down();
            await page.mouse.move(100, 0);
            await page.mouse.up();
            
            await expect(columns).toHaveText('1');
        });

        test('can change collection', async function () {
            // note: we should also see the header change only when switching between latest and featured with no edits to the header
            await focusEditor(page);
            await insertCollectionCard(page);

            const cardHeader = await page.getByTestId('collection-header');
            await expect(cardHeader).toHaveText('Latest');

            const collectionsDropdown = await page.getByTestId('collections-dropdown');
            const collectionValue = await page.getByTestId('collections-dropdown-value');
            await expect(collectionValue).toHaveText('Latest');

            await collectionsDropdown.click();
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            
            await expect(collectionValue).toHaveText('Featured');
            await expect(cardHeader).toHaveText('Featured');
        });
    });

    test('can add snippet', async function () {
        await focusEditor(page);
        await insertCollectionCard(page);

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="collection"]')).toHaveCount(2);
    });
});
