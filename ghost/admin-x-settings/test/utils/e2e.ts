import {Page, Request} from '@playwright/test';
import {readFileSync} from 'fs';

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
    previewHtml?: {
        homepage?: string
    }
}

interface RequestRecord {
    url?: string
    body?: any
    headers?: {[key: string]: string}
}

type LastRequests = {
    settings: {
        browse: RequestRecord
        edit: RequestRecord
    }
    site: {
        browse: RequestRecord
    }
    images: {
        upload: RequestRecord
    }
    custom_theme_settings: {
        browse: RequestRecord
        edit: RequestRecord
    }
    previewHtml: {
        homepage: RequestRecord
    }
};

export async function mockApi({page,responses}: {page: Page, responses?: Responses}) {
    const lastApiRequests: LastRequests = {
        settings: {browse: {}, edit: {}},
        site: {browse: {}},
        images: {upload: {}},
        custom_theme_settings: {browse: {}, edit: {}},
        previewHtml: {homepage: {}}
    };

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/settings\//,
        respondTo: {
            GET: {
                body: responses?.settings?.browse ?? responseFixtures.settings,
                updateLastRequest: lastApiRequests.settings.browse
            },
            PUT: {
                body: responses?.settings?.edit ?? responseFixtures.settings,
                updateLastRequest: lastApiRequests.settings.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/site\//,
        respondTo: {
            GET: {
                body: responses?.site?.browse ?? responseFixtures.site,
                updateLastRequest: lastApiRequests.site.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/images\/upload\/$/,
        respondTo: {
            POST: {
                body: responses?.images?.upload ?? {images: [{url: 'http://example.com/image.png', ref: null}]},
                updateLastRequest: lastApiRequests.images.upload
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/custom_theme_settings\/$/,
        respondTo: {
            GET: {
                body: responses?.custom_theme_settings?.browse ?? responseFixtures.custom_theme_settings,
                updateLastRequest: lastApiRequests.custom_theme_settings.browse
            },
            PUT: {
                body: responses?.custom_theme_settings?.edit ?? responseFixtures.custom_theme_settings,
                updateLastRequest: lastApiRequests.custom_theme_settings.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: responseFixtures.site.site.url,
        respondTo: {
            POST: {
                condition: request => !!request.headers()['x-ghost-preview'],
                body: responses?.previewHtml?.homepage ?? '<html><head><style></style></head><body><div>test</div></body></html>',
                updateLastRequest: lastApiRequests.previewHtml.homepage
            }
        }
    });

    return lastApiRequests;
}

interface ResponseOptions {
    condition?: (request: Request) => boolean
    body: any
    status?: number
    updateLastRequest: RequestRecord
}

async function mockApiResponse({page, path, respondTo}: { page: Page; path: string | RegExp; respondTo: { [method: string]: ResponseOptions } }) {
    await page.route(path, async (route) => {
        const response = respondTo[route.request().method()];

        if (!response || (response.condition && !response.condition(route.request()))) {
            return route.continue();
        }

        const requestBody = JSON.parse(route.request().postData() || 'null');
        response.updateLastRequest.body = requestBody;
        response.updateLastRequest.url = route.request().url();
        response.updateLastRequest.headers = route.request().headers();

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
