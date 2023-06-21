import {Page} from '@playwright/test';
import {readFileSync} from 'fs';

type LastApiRequest = {
    url: null | string
    body: null | any
};

const responseFixtures = {
    settings: JSON.parse(readFileSync(`${__dirname}/responses/settings.json`).toString()),
    site: JSON.parse(readFileSync(`${__dirname}/responses/site.json`).toString()),
    custom_theme_settings: JSON.parse(readFileSync(`${__dirname}/responses/custom_theme_settings.json`).toString())
};

interface Responses {
    settings?: {
        browse?: any
        edit?: any
    }
    site?: {
        browse?: any
    }
    images?: {
        upload?: any
    }
    custom_theme_settings?: {
        browse?: any
        edit?: any
    }
    previewHtml: {
        homepage?: string
    }
}

export async function mockApi({page,responses}: {page: Page, responses?: Responses}) {
    const lastApiRequest: LastApiRequest = {
        url: null,
        body: null
    };

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/settings\//,
        responses: {
            GET: {body: responses?.settings?.browse ?? responseFixtures.settings},
            PUT: {body: responses?.settings?.edit ?? responseFixtures.settings}
        },
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/site\//,
        responses: {
            GET: {body: responses?.site?.browse ?? responseFixtures.site}
        },
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/images\/upload\/$/,
        responses: {
            POST: {body: responses?.images?.upload ?? {images: [{url: 'http://example.com/image.png', ref: null}]}}
        },
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/custom_theme_settings\/$/,
        responses: {
            GET: {body: responses?.custom_theme_settings?.browse ?? responseFixtures.custom_theme_settings},
            PUT: {body: responses?.custom_theme_settings?.edit ?? responseFixtures.custom_theme_settings}
        },
        lastApiRequest
    });

    await page.route(responseFixtures.site.site.url, async (route) => {
        if (!route.request().headers()['x-ghost-preview']) {
            return route.continue();
        }

        await route.fulfill({
            status: 200,
            body: responses?.previewHtml?.homepage ?? '<html><head><style></style></head><body><div>test</div></body></html>'
        });
    });

    return lastApiRequest;
}

interface MockResponse {
    body: any
    status?: number
}

async function mockApiResponse({page, path, lastApiRequest, responses}: { page: Page; path: string | RegExp; lastApiRequest: LastApiRequest, responses: { [method: string]: MockResponse } }) {
    await page.route(path, async (route) => {
        const response = responses[route.request().method()];

        if (!response) {
            return route.continue();
        }

        const requestBody = JSON.parse(route.request().postData() || 'null');
        lastApiRequest.body = requestBody;
        lastApiRequest.url = route.request().url();

        await route.fulfill({
            status: response.status || 200,
            body: JSON.stringify(response.body)
        });
    });
}

export function updatedSettingsResponse(newSettings: Array<{ key: string, value: string | boolean | null }>) {
    return {
        ...responseFixtures.settings,
        settings: responseFixtures.settings.settings.map((setting) => {
            const newSetting = newSettings.find(({key}) => key === setting.key);

            return {key: setting.key, value: newSetting?.value || setting.value};
        })
    };
}
