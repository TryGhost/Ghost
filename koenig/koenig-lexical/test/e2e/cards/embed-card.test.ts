import fs from 'fs';
import path from 'path';
import {E2E_PORT} from '../../../playwright.config';
import {EMBED_RENDERER_MAX_HEIGHT} from '../../../src/utils/embed-renderer';
import {assertHTML, createSnippet, focusEditor, html, initialize, isMac, pasteText} from '../../utils/e2e';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                                srcdoc='&lt;iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"&gt;&lt;/iframe&gt;'
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

    test.describe('With an embed preview url', async () => {
        // serves the real renderer from a separate origin, as a dedicated embeds domain would
        const rendererDirectory = 'http://embeds.test/embed-renderer/';
        const rendererFile = path.resolve(__dirname, '../../../public/embed-renderer/v1.html');

        test.beforeEach(async () => {
            await page.route(`${rendererDirectory}**`, route => route.fulfill({path: rendererFile, contentType: 'text/html'}));
        });

        test.afterEach(async () => {
            await page.unroute(`${rendererDirectory}**`);
        });

        function embedContent(embedHtml) {
            return encodeURIComponent(JSON.stringify({
                root: {
                    children: [{
                        type: 'embed',
                        html: embedHtml,
                        metadata: {},
                        embedType: 'rich',
                        url: 'https://attacker.example/'
                    }],
                    direction: null,
                    format: '',
                    indent: 0,
                    type: 'root',
                    version: 1
                }
            }));
        }

        test('renders embeds in the renderer on a separate origin', async function () {
            const embedHtml = '<img src="x" onerror="document.body.dataset.ran = \'yes\'; try { window.parent.__embedEscaped = true; } catch (e) {}"><div style="height: 400px">Embedded content</div>';

            await initialize({page, uri: `/#/?embedPreviewUrl=${encodeURIComponent(rendererDirectory)}&content=${embedContent(embedHtml)}`});

            const iframe = page.getByTestId('embed-iframe');
            await expect(iframe).toHaveAttribute('src', `${rendererDirectory}v1.html`);

            // the embed's own scripts ran inside the renderer and it reported its height
            await expect(page.frameLocator('[data-testid="embed-iframe"]').locator('body[data-ran="yes"]')).toHaveCount(1);
            await expect(iframe).toHaveCSS('height', '400px');

            expect(await page.evaluate(() => (window as Window & {__embedEscaped?: boolean}).__embedEscaped)).toBeUndefined();
        });

        test('caps the height an embed can ask for', async function () {
            // the height comes from the embed itself, so a huge one must not bury the post
            const oversizedRenderer = fs.readFileSync(rendererFile, 'utf-8')
                + `<script>setTimeout(function () { window.parent.postMessage({type: 'kg-embed-resize', version: 1, height: 100000000}, '*'); }, 250);</script>`;

            await page.route(`${rendererDirectory}**`, route => route.fulfill({body: oversizedRenderer, contentType: 'text/html'}));

            await initialize({page, uri: `/#/?embedPreviewUrl=${encodeURIComponent(rendererDirectory)}&content=${embedContent('<div style="height: 400px">Embedded content</div>')}`});

            const iframe = page.getByTestId('embed-iframe');
            await expect(iframe).toHaveCSS('height', `${EMBED_RENDERER_MAX_HEIGHT}px`);
        });

        test('shows a placeholder when the renderer is on the editor origin', async function () {
            const sameOriginDirectory = `http://localhost:${E2E_PORT}/embed-renderer/`;

            await initialize({page, uri: `/#/?embedPreviewUrl=${encodeURIComponent(sameOriginDirectory)}&content=${embedContent('<p>Embedded content</p>')}`});

            await expect(page.getByTestId('embed-preview-unavailable')).toContainText('https://attacker.example/');
            await expect(page.getByTestId('embed-iframe')).toHaveCount(0);
        });
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
        await expect(page.locator('[data-kg-card="embed"]')).toHaveAttribute('data-kg-card-selected', 'true');
        await expect(page.locator('[data-kg-card="embed"]')).toHaveAttribute('data-kg-card-editing', 'false');
        await createSnippet(page);

        // can insert card from snippet
        await page.keyboard.press('Enter');
        await page.keyboard.type('/snippet');
        await expect(page.locator('[data-kg-cardmenu-selected="true"]').filter({hasText: 'snippet'})).toBeVisible();
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
                                srcdoc='&lt;iframe width="200" height="113" src="https://www.youtube.com/embed/7hCPODjJO7s?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="Project Binky - Episode 1  - Austin Mini GT-Four - Turbo Charged 4WD Mini"&gt;&lt;/iframe&gt;'
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
