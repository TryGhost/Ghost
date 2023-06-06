import {Page} from '@playwright/test';
import {readFileSync} from 'fs';

type LastApiRequest = {
    url: null | string
    body: null | any
};

const responseFixtures = {
    settings: JSON.parse(readFileSync(`${__dirname}/responses/settings.json`).toString()),
    site: JSON.parse(readFileSync(`${__dirname}/responses/site.json`).toString())
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
}

export async function mockApi({page,responses}: {page: Page, responses?: Responses}) {
    const lastApiRequest: LastApiRequest = {
        url: null,
        body: null
    };

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/settings\/\?group=.+/,
        method: 'GET',
        response: responses?.settings?.browse ?? responseFixtures.settings,
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/site\//,
        method: 'GET',
        response: responses?.site?.browse ?? responseFixtures.site,
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/settings\/$/,
        method: 'PUT',
        response: responses?.settings?.edit ?? responseFixtures.settings,
        lastApiRequest
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/images\/upload\/$/,
        method: 'POST',
        response: responses?.images?.upload ?? {images: [{url: 'http://example.com/image.png', ref: null}]},
        lastApiRequest
    });

    return lastApiRequest;
}

async function mockApiResponse({page, path, method, response, lastApiRequest}: { page: Page; path: string | RegExp; method: string; response: any; lastApiRequest: LastApiRequest }) {
    await page.route(path, async (route) => {
        if (route.request().method() !== method) {
            return route.continue();
        }

        const requestBody = JSON.parse(route.request().postData() || 'null');
        lastApiRequest.body = requestBody;
        lastApiRequest.url = route.request().url();

        await route.fulfill({
            status: 200,
            body: JSON.stringify(response)
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
