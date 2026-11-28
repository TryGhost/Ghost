import path from 'path';
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Version 2 of the renderer, served from an origin of its own, as a dedicated embeds domain
// would. Ghost Admin puts it in a host document of its own, listens there for the ready message,
// and sends renders from above.
const rendererFile = path.resolve(__dirname, '../../public/embed-renderer/v2.html');
const RENDERER = 'http://embeds.test/embed-renderer/v2.html';
const ADMIN = 'http://admin.test/';

// Admin's page: an empty host document on Admin's origin, which frames the renderer once Admin
// is listening for its messages there
const adminPage = `<!doctype html>
<body>
<iframe id="host" srcdoc="<!doctype html><body>"></iframe>
<script>
    window.messages = [];
    const host = document.getElementById('host');
    host.addEventListener('load', () => {
        host.contentWindow.addEventListener('message', (event) => {
            window.messages.push(event.data);
        });
        const renderer = host.contentDocument.createElement('iframe');
        renderer.src = ${JSON.stringify(RENDERER)};
        renderer.sandbox = 'allow-scripts allow-same-origin';
        host.contentDocument.body.append(renderer);
    }, {once: true});
    window.render = (message) => {
        host.contentDocument.querySelector('iframe').contentWindow.postMessage(message, 'http://embeds.test');
    };
</script>`;

test.describe('Embed renderer, version 2', () => {
    test.beforeEach(async ({page}) => {
        await page.route(`${ADMIN}**`, route => route.fulfill({body: adminPage, contentType: 'text/html'}));
        await page.route('http://embeds.test/**', route => route.fulfill({path: rendererFile, contentType: 'text/html'}));
    });

    async function ready(page) {
        await page.goto(ADMIN);
        await expect.poll(() => page.evaluate(() => window.messages.find(message => message.type === 'kg-embed-ready'))).toBeTruthy();
        return page.evaluate(() => window.messages.find(message => message.type === 'kg-embed-ready'));
    }

    function rendered(page) {
        return page.frameLocator('#host').frameLocator('iframe');
    }

    test('renders a page for an ancestor that heard its ready message, without card sizing', async ({page}) => {
        const {token, version} = await ready(page);
        expect(version).toBe(2);
        expect(typeof token).toBe('string');

        await page.evaluate(token => window.render({
            type: 'kg-embed-render',
            version: 2,
            token,
            sizing: false,
            html: '<!doctype html><title>Page</title><p id="page">A whole page</p>'
        }), token);

        await expect(rendered(page).locator('#page')).toHaveText('A whole page');
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => window.messages.some(message => message.type === 'kg-embed-resize'))).toBe(false);
    });

    test('sizes a card for its parent', async ({page}) => {
        const {token} = await ready(page);

        await page.evaluate(token => window.render({
            type: 'kg-embed-render',
            version: 2,
            token,
            html: '<div id="card" style="height: 240px">A card</div>'
        }), token);

        await expect(rendered(page).locator('#card')).toHaveText('A card');
        await expect.poll(() => page.evaluate(() => window.messages.find(message => message.type === 'kg-embed-resize')?.height)).toBe(240);
    });

    test('renders once, and only for a render with its token and version', async ({page}) => {
        const {token} = await ready(page);

        // each of these would win if it were accepted, as only the first render counts
        await page.evaluate(token => {
            const html = '<p id="wrong">Wrong</p>';
            window.render({type: 'kg-embed-render', version: 2, html});
            window.render({type: 'kg-embed-render', version: 2, token: `${token}x`, html});
            window.render({type: 'kg-embed-render', version: 1, token, html});
            window.render({type: 'kg-embed-render', version: 2, token, html: 42});
            window.render({type: 'kg-embed-render', version: 2, token, sizing: false, html: '<p id="right">Right</p>'});
            window.render({type: 'kg-embed-render', version: 2, token, sizing: false, html: '<p id="wrong">Second</p>'});
        }, token);

        await expect(rendered(page).locator('#right')).toHaveText('Right');
        await page.waitForTimeout(300);
        await expect(rendered(page).locator('#wrong')).toHaveCount(0);
    });

    test('ignores a window that isn\'t its ancestor, even with the token', async ({page}) => {
        await page.route('http://other.test/**', route => route.fulfill({body: '<!doctype html><body>', contentType: 'text/html'}));
        const {token} = await ready(page);

        // a sibling frame on another origin tries to render first
        await page.evaluate(() => new Promise((resolve) => {
            const sibling = document.createElement('iframe');
            sibling.src = 'http://other.test/';
            sibling.addEventListener('load', resolve, {once: true});
            document.body.append(sibling);
        }));
        const sibling = page.frames().find(frame => frame.url().startsWith('http://other.test/'));
        await sibling.evaluate(token => {
            window.top.frames[0].frames[0].postMessage({type: 'kg-embed-render', version: 2, token, sizing: false, html: '<p id="wrong">Sibling</p>'}, '*');
        }, token);
        await page.waitForTimeout(300);

        await page.evaluate(token => window.render({type: 'kg-embed-render', version: 2, token, sizing: false, html: '<p id="right">Admin</p>'}), token);

        await expect(rendered(page).locator('#right')).toHaveText('Admin');
        await expect(rendered(page).locator('#wrong')).toHaveCount(0);
    });

    test('ignores an ancestor on its own origin', async ({page}) => {
        // served from the renderer's own domain, a page could otherwise render with its access
        await page.route('http://embeds.test/page.html', route => route.fulfill({
            contentType: 'text/html',
            body: `<!doctype html><body>
                <script>
                    window.addEventListener('message', (event) => {
                        if (event.data.type === 'kg-embed-ready') {
                            event.source.postMessage({type: 'kg-embed-render', version: 2, token: event.data.token, sizing: false, html: '<p id="wrong">Same origin</p>'}, '*');
                            window.sent = true;
                        }
                    });
                </script>
                <iframe src="${RENDERER}"></iframe>`
        }));

        await page.goto('http://embeds.test/page.html');
        await expect.poll(() => page.evaluate(() => window.sent)).toBe(true);
        await page.waitForTimeout(300);
        await expect(page.frameLocator('iframe').locator('#wrong')).toHaveCount(0);
    });
});
