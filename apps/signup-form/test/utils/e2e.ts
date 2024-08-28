import {E2E_PORT} from '../../playwright.config';
import {Page} from '@playwright/test';

const MOCKED_SITE_URL = 'https://localhost:1234';

type LastApiRequest = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body: null | any
};

export async function initialize({page, path, apiStatus, embeddedOnUrl, ...options}: {page: Page, embeddedOnUrl?: string, path?: string; title?: string, description?: string, icon?: string, backgroundColor?: string, buttonColor?: string, site?: string, 'label-1'?: string, 'label-2'?: string, apiStatus?: number}) {
    const sitePath = `${embeddedOnUrl ?? MOCKED_SITE_URL}${path ?? ''}`;
    await page.route(sitePath, async (route) => {
        await route.fulfill({
            status: 200,
            body: '<html><head><meta charset="UTF-8" /></head><body></body></html>'
        });
    });

    const url = `http://localhost:${E2E_PORT}/signup-form.min.js`;
    await page.setViewportSize({width: 1000, height: 1000});

    await page.goto(sitePath);
    const lastApiRequest = await mockApi({page, status: apiStatus});

    if (!options.site) {
        options.site = MOCKED_SITE_URL;
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
        frame: page.frameLocator('iframe'),
        lastApiRequest
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mockApi({page, status = 200}: {page: any, status?: number}) {
    const lastApiRequest: LastApiRequest = {
        body: null
    };

    await page.route(`${MOCKED_SITE_URL}/members/api/send-magic-link/`, async (route) => {
        const requestBody = JSON.parse(route.request().postData());
        lastApiRequest.body = requestBody;

        await route.fulfill({
            status,
            body: 'ok'
        });
    });

    await page.route(`${MOCKED_SITE_URL}/invalid/members/api/send-magic-link/`, async (route) => {
        await route.abort('addressunreachable');
    });

    await page.route(`${MOCKED_SITE_URL}/members/api/integrity-token/`, async (route) => {
        await route.fulfill('testtoken');
    });

    return lastApiRequest;
}
