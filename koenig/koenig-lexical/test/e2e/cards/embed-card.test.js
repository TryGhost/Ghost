import {assertHTML, createSnippet, focusEditor, html, initialize, isMac, pasteText} from '../../utils/e2e';
import {expect, test} from '@playwright/test';

test.describe('Embed card', async () => {
    const ctrlOrCmd = isMac() ? 'Meta' : 'Control';
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

    test('can import serialized embed card nodes', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
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
                    url: 'https://www.youtube.com/watch?v=7hCPODjJO7s',
                    caption: 'This is a <i>caption</i>'
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
                <div data-kg-card-editing="false" data-kg-card-selected="false" data-kg-card="embed">
                    <div>
                        <div>
                            <iframe
                                srcdoc='<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>'
                                tabindex="-1"
                                title="embed-card-iframe"></iframe>
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
                                            data-lexical-editor="true"
                                        >
                                            <p dir="ltr">
                                                <span data-lexical-text="true">This is a</span>
                                                <em data-lexical-text="true">caption</em>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </figcaption>
                    </div>
                </div>
            </div>
        `, {ignoreCardContents: false});
    });

    test('renders embed card node', async function () {
        await focusEditor(page);
        await insertEmbedCard(page);

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="embed"></div>
            </div>
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('can interact with url input after inserting', async function () {
        await focusEditor(page);
        await insertEmbedCard(page);

        const urlInput = await page.getByTestId('embed-url');
        await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

        await urlInput.fill('test');
        await expect(urlInput).toHaveValue('test');
    });

    test.describe('Valid URL handling', async () => {
        test('shows loading wheel', async function () {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-url-loading-container')).toBeVisible();
            await expect(await page.getByTestId('embed-url-loading-spinner')).toBeVisible();
        });

        test('displays expected metadata', async function () {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('https://ghost.org/');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-iframe')).toBeVisible();
        });

        // TODO: the caption editor is very nested, and we don't have an actual input field here, so we aren't testing for filling it
        test('caption displays on insert', async function () {
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
        test('bad url entry shows error message', async function () {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            await expect(await page.getByTestId('embed-url-error-message')).toContainText('Oops, that link didn\'t work.');
        });

        test('retry button bring back url input', async function () {
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

        test('should convert url to link if can\'t extract metadata', async function () {
            await focusEditor(page);
            await pasteText(page, 'https://ghost.org/should-convert-to-link');

            await expect(page.locator('a[href="https://ghost.org/should-convert-to-link"]')).toBeVisible();
        });

        test('paste as link button removes card and inserts text node link', async function () {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await expect(urlInput).toHaveAttribute('placeholder', 'Paste URL to add embedded content...');

            await urlInput.fill('https://ghost.org/should-convert-to-link');
            await expect(urlInput).toHaveValue('https://ghost.org/should-convert-to-link');
            await urlInput.press('Enter');

            const pasteAsLinkButton = await page.getByTestId('embed-url-error-pasteAsLink');
            await pasteAsLinkButton.click();

            await assertHTML(page, html`
                <p>
                    <a href="https://ghost.org/should-convert-to-link" dir="ltr">
                        <span data-lexical-text="true">https://ghost.org/should-convert-to-link</span>
                    </a>
                </p>
                <p><br /></p>
            `);
        });

        test('close button removes card', async function () {
            await focusEditor(page);
            await insertEmbedCard(page);

            const urlInput = await page.getByTestId('embed-url');
            await expect(urlInput).toHaveAttribute('placeholder','Paste URL to add embedded content...');

            await urlInput.fill('badurl');
            await expect(urlInput).toHaveValue('badurl');
            await urlInput.press('Enter');

            const closeButton = await page.getByTestId('embed-url-error-close');
            await closeButton.click();

            await assertHTML(page, html`<p><br /></p>`);
        });
    });

    test('can add snippet', async function () {
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

    // NOTE: tested in paste-behaviour.test.js
    // test('can convert link to embed card on paste', async function () {
    //     await focusEditor(page);
    //     await pasteText(page, 'https://ghost.org/');
    //     await expect(await page.getByTestId('embed-url-loading-container')).toBeVisible();
    //     await expect(await page.getByTestId('embed-url-loading-container')).toBeHidden();
    //     await expect(await page.getByTestId('embed-iframe')).toBeVisible();
    // });

    // flaky test
    test.skip('can delete and undo without losing caption', async function () {
        const contentParam = encodeURIComponent(JSON.stringify({
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
        }));

        await initialize({page, uri: `/#/?content=${contentParam}`});

        await focusEditor(page);
        await expect(page.getByTestId('embed-iframe')).toBeVisible();

        await page.click('[data-kg-card="embed"]');
        await page.click('[data-testid="embed-caption"]');
        await page.keyboard.type('test caption');
        await page.keyboard.press('Enter');
        await page.keyboard.press('Backspace');
        await page.keyboard.press('Backspace');
        await page.keyboard.press(`${ctrlOrCmd}+z`);

        await page.waitForSelector('[title="embed-card-iframe"][style]');

        await assertHTML(page, html`
            <div data-lexical-decorator="true" contenteditable="false">
                <div data-kg-card-editing="false" data-kg-card-selected="true" data-kg-card="embed">
                    <div>
                        <div>
                            <iframe
                                srcdoc='<iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"></iframe>'
                                tabindex="-1"
                                title="embed-card-iframe"></iframe>
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
                                            data-lexical-editor="true"
                                        >
                                            <p dir="ltr">
                                                <span data-lexical-text="true">test caption</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </figcaption>
                    </div>
                    <div data-kg-card-toolbar="embed"></div>
                </div>
            </div>
        `, {ignoreCardToolbarContents: true, ignoreInlineStyles: true});
    });

    test('escape removes url input component', async function () {
        await focusEditor(page);
        await insertEmbedCard(page);

        await page.keyboard.press('Escape');

        await assertHTML(page, html`
            <p><br /></p>
        `, {ignoreCardContents: true});
    });

    test('escape removes url error component', async function () {
        await focusEditor(page);
        await insertEmbedCard(page);

        await page.keyboard.type('badurl');
        await page.keyboard.press('Enter');

        await expect(await page.getByTestId('embed-url-error-message')).toContainText('Oops, that link didn\'t work.');

        await page.keyboard.press('Escape');

        await assertHTML(page, html`
            <p><br /></p>
        `, {ignoreCardContents: true});
    });
});

async function insertEmbedCard(page) {
    await page.keyboard.type(`/embed`);
    await expect(await page.locator('[data-kg-card-menu-item="Other..."][data-kg-cardmenu-selected="true"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(await page.locator(`[data-kg-card="embed"]`)).toBeVisible();
}
