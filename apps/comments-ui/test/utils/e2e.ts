import {E2E_PORT} from '../../playwright.config';
import {MockedApi} from './MockedApi';
import {Page} from '@playwright/test';

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
