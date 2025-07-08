import {E2E_PORT} from '../../playwright.config';
import {Locator, Page} from '@playwright/test';
import {MockedApi} from './MockedApi';
import {expect} from '@playwright/test';

export const MOCKED_SITE_URL = 'https://localhost:1234';
export {MockedApi};

export async function waitEditorFocused(editor: Locator) {
    // Wait for focused
    const internalEditor = editor.getByTestId('editor');
    await expect(internalEditor).toBeFocused();
}

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function authFrameMain() {
    const endpoints = {
        browseComments: ['GET', ['postId'], '/comments/post/$1/'],
        getReplies: ['GET', ['commentId'], '/comments/$1/replies/'],
        readComment: ['GET', ['commentId'], '/comments/$1/'],
        getUser: ['GET', [], '/users/me/'],
        hideComment: ['PUT', ['id'], '/comments/$1/', data => ({id: data.id, status: 'hidden'})],
        showComment: ['PUT', ['id'], '/comments/$1/', data => ({id: data.id, status: 'published'})]
    };

    window.addEventListener('message', async function (event) {
        let data: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
            data = JSON.parse(event.data) || {};
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
        }

        if (!data) {
            return;
        }

        function respond(error, result) {
            event.source!.postMessage(JSON.stringify({
                uid: data.uid,
                error: error?.message,
                result
            }));
        }

        if (endpoints[data.action]) {
            try {
                const [method, routeParams, route, bodyFn] = endpoints[data.action];
                const paramData = routeParams.map(param => data[param]);
                const path = route.replace(/\$(\d+)/g, (_, index) => paramData[index - 1]);
                const url = new URL(`/ghost/api/admin${path}`, MOCKED_SITE_URL);
                if (data.params) {
                    url.search = new URLSearchParams(data.params).toString();
                }
                let body, headers;
                if (method === 'PUT' || method === 'POST') {
                    body = JSON.stringify(bodyFn(data));
                    headers = {'Content-Type': 'application/json'};
                }
                const res = await fetch(url, {method, body, headers});
                const json = await res.json();
                respond(null, json);
            } catch (err) {
                console.log('e2e Admin endpoint error:', err); // eslint-disable-line no-console
                console.log('error with', data); // eslint-disable-line no-console
                respond(err, null);
            }
        }
    });
}

export async function mockAdminAuthFrame({admin, page}) {
    await page.route(admin + 'auth-frame/', async (route) => {
        await route.fulfill({
            status: 200,
            body: `<html><head><meta charset="UTF-8" /></head><body><script>${authFrameMain.toString().replaceAll('MOCKED_SITE_URL', `'${MOCKED_SITE_URL}'`)}; authFrameMain();</script></body></html>`
        });
    });
}

export async function mockAdminAuthFrame204({admin, page}) {
    await page.route(admin + 'auth-frame/', async (route) => {
        await route.fulfill({
            status: 204
        });
    });
}

export async function initialize({mockedApi, page, bodyStyle, labs = {}, key = '12345678', api = MOCKED_SITE_URL, ...options}: {
    mockedApi: MockedApi,
    page: Page,
    path?: string;
    ghostComments?: string,
    key?: string,
    api?: string,
    admin?: string,
    colorScheme?: string,
    avatarSaturation?: string,
    accentColor?: string,
    commentsEnabled?: string,
    title?: string,
    count?: boolean,
    publication?: string,
    postId?: string,
    bodyStyle?: string,
    labs?: LabsType
}) {
    const sitePath = MOCKED_SITE_URL;

    mockedApi.setSettings({
        settings: {
            labs: {
                ...labs
            }
        }
    });

    await page.route(sitePath, async (route) => {
        await route.fulfill({
            status: 200,
            body: `<html><head><meta charset="UTF-8" /></head><body ${bodyStyle ? 'style="' + escapeHtml(bodyStyle) + '"' : ''}></body></html>`
        });
    });

    const url = `http://localhost:${E2E_PORT}/comments-ui.min.js`;
    await page.setViewportSize({width: 1000, height: 1000});

    await page.goto(sitePath);
    await mockedApi.listen({page, path: sitePath});

    if (!options.ghostComments) {
        options.ghostComments = MOCKED_SITE_URL;
    }

    if (!options.postId) {
        options.postId = mockedApi.postId;
    }

    if (!options.key) {
        options.key = key;
    }

    if (!options.api) {
        options.api = api;
    }

    await page.evaluate((data) => {
        const scriptTag = document.createElement('script');
        scriptTag.src = data.url;

        for (const option of Object.keys(data.options)) {
            scriptTag.dataset[option] = data.options[option];
        }
        document.body.appendChild(scriptTag);
    }, {url, options});

    const commentsFrameSelector = 'iframe[title="comments-frame"]';

    await page.waitForSelector('iframe');

    // wait for data to be loaded because our tests expect it
    const iframeElement = await page.locator(commentsFrameSelector).elementHandle();
    if (!iframeElement) {
        throw new Error('iframe not found');
    }
    const iframe = await iframeElement.contentFrame();
    if (!iframe) {
        throw new Error('iframe contentFrame not found');
    }
    await iframe.waitForSelector('[data-loaded="true"]');

    return {
        frame: page.frameLocator(commentsFrameSelector)
    };
}

/**
 * Select text range by RegExp.
 */
export async function selectText(locator: Locator, pattern: string | RegExp): Promise<void> {
    await locator.evaluate(
        (element, {pattern: p}) => {
            let textNode = element.childNodes[0];

            while (textNode.nodeType !== Node.TEXT_NODE && textNode.childNodes.length) {
                textNode = textNode.childNodes[0];
            }
            const match = textNode.textContent?.match(new RegExp(p));
            if (match) {
                const range = document.createRange();
                range.setStart(textNode, match.index!);
                range.setEnd(textNode, match.index! + match[0].length);
                const selection = document.getSelection();
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        },
        {pattern}
    );
}

export async function getHeight(locator: Locator) {
    return await locator.evaluate((node) => {
        return node.clientHeight;
    });
}

export async function setClipboard(page, text) {
    const modifier = getModifierKey();
    await page.setContent(`<div contenteditable>${text}</div>`);
    await page.focus('div');
    await page.keyboard.press(`${modifier}+KeyA`);
    await page.keyboard.press(`${modifier}+KeyC`);
}

export function getModifierKey() {
    const os = require('os'); // eslint-disable-line @typescript-eslint/no-var-requires
    const platform = os.platform();
    if (platform === 'darwin') {
        return 'Meta';
    } else {
        return 'Control';
    }
}

export function addMultipleComments(api, numComments) {
    for (let i = 1; i <= numComments; i++) {
        api.addComment({
            html: `<p>This is comment ${i}.</p>`
        });
    }
}

export async function waitForFrameOpacity(frameLocator, selector, timeout = 2000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
    // Evaluate the opacity of the element within the frame
        const opacity = await frameLocator.locator(selector).evaluate((element) => {
            return window.getComputedStyle(element).opacity;
        });

        // Check if opacity is 1 (100%)
        if (opacity === '1') {
            return;
        }

        // Wait a little before retrying
        await new Promise((resolve) => {
            setTimeout(resolve, 100);
        });
    }
    throw new Error(`Element ${selector} did not reach 100% opacity within ${timeout} ms`);
}
