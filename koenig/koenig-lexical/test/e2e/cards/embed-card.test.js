import {assertHTML, createSnippet, focusEditor, html, initialize} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Embed card', async () => {
    test.beforeEach(async ({page}) => {
        await initialize({page});
    });

    test('can import serialized embed card nodes', async function ({page}) {
        await page.evaluate(() => {
            const serializedState = JSON.stringify({
                root: {
                    children: [{
                        type: 'embed',
                        html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>',
                        metadata: {
                            author_name: 'Bad Obsession Motorsport',
                            author_url: 'https://www.youtube.com/@BadObsessionMotorsport',
                            height: 113,
                            provider_name: 'YouTube',
                            provider_url: 'https://www.youtube.com/',
                            thumbnail_height: 360,
                            thumbnail_url: 'https://i.ytimg.com/vi/7hCPODjJO7s/hqdefault.jpg',
                            thumbnail_width: '480',
                            title: 'Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini',
                            version: '1.0',
                            width: 200
                        },
                        embedType: 'video',
                        url: 'https://www.youtube.com/watch?v=7hCPODjJO7s'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            });
            const editor = window.lexicalEditor;
            const editorState = editor.parseEditorState(serializedState);
            editor.setEditorState(editorState);
        });

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="embed">
                </div>
            </div>
        `, {ignoreCardContents: true});
    });

    test('renders embed card node', async function ({page}) {
        await focusEditor(page);
        await insertEmbedCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="embed"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can interact with url input after inserting', async function ({page}) {
        await focusEditor(page);
        await insertEmbedCard(page);

        const urlInput = await page.getByTestId('embed-url');
        await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

        await urlInput.fill('test');
        await expect(urlInput).toHaveValue('test');
    });

    test.describe('Valid URL handling', async () => {
        test('shows loading wheel', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(await page.getByTestId('embed-url-loading-spinner')).toBeVisible();
        });

        test('displays expected metadata', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-iframe')).toBeVisible();
        });

        // TODO: the caption editor is very nested, and we don't have an actual input field here, so we aren't testing for filling it
        test('caption displays on insert', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            const captionInput = await page.getByTestId('embed-caption');
            await expect(captionInput).toContainText('Type caption for embed (optional)');
        });
    });

    test.describe('Error Handling', async () => {
        test('bad url entry shows error message', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-url-error-message')).toContainText('There was an error when parsing the URL.');
        });

        test('retry button bring back url input', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('embed-url-error-retry');
            await retryButton.click();

            const urlInputRetry = await page.getByTestId('embed-url');
            await expect(urlInputRetry).toHaveValue('badurl');
            await expect(retryButton).not.toBeVisible();
        });

        // todo: test is failing, need to figure if the error in test logic or on code
        test.skip('paste as link button removes card and inserts text node link', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('embed-url-error-pasteAsLink');
            await retryButton.click();

            await assertHTML(page, html`
                <p>
                    <a href="badurl" dir="ltr"><span data-lexical-text="true">badurl</span></a>
                </p>
                <p><br /></p>
            `);
        });

        test('close button removes card', async function ({page}) {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const retryButton = await page.getByTestId('embed-url-error-close');
            await retryButton.click();

            await assertHTML(page, html`<p><br /></p>`);
        });
    });

    test('can add snippet', async function ({page}) {
        await focusEditor(page);
        await insertEmbedCard(page);

        const urlInput = await page.getByTestId('embed-url');
        await urlInput.fill('https://ghost.org/');
        await urlInput.press('Enter');
        await expect(await page.getByTestId('embed-iframe')).toBeVisible();

        // create snippet
        await page.keyboard.press('Escape');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await page.waitForSelector('[data-kg-cardmenu-selected="true"]');
        await page.keyboard.press('Enter');
        await expect(await page.locator('[data-kg-card="embed"]')).toHaveCount(2);
    });
});

async function insertEmbedCard(page) {
    await page.keyboard.type(`/embed`);
    await expect(await page.locator('[data-kg-card-menu-item="Other..."][data-kg-cardmenu-selected="true"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(await page.locator(`[data-kg-card="embed"]`)).toBeVisible();
}
