import {E2E_PORT} from '../../playwright.config';
import {Locator, Page} from '@playwright/test';
import {MockedApi} from './MockedApi';

export const MOCKED_SITE_URL = 'https://localhost:1234';
export {MockedApi};

function escapeHtml(unsafe: string) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export async function initialize({mockedApi, page, bodyStyle, ...options}: {
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
}) {
    const sitePath = MOCKED_SITE_URL;
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

    await page.evaluate((data) => {
        const scriptTag = document.createElement('script');
        scriptTag.src = data.url;

        for (const option of Object.keys(data.options)) {
            scriptTag.dataset[option] = data.options[option];
        }
        document.body.appendChild(scriptTag);
    }, {url, options});

    await page.waitForSelector('iframe');

    return {
        frame: page.frameLocator('iframe')
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
    const os = require('os');
    let platform = os.platform();
    if (platform === 'darwin') {
        return 'Meta';
    } else {
        return 'Control';
    }
}
