import {ActionsResponseType} from '../../src/api/actions';
import {ConfigResponseType} from '../../src/api/config';
import {CustomThemeSettingsResponseType} from '../../src/api/customThemeSettings';
import {InvitesResponseType} from '../../src/api/invites';
import {LabelsResponseType} from '../../src/api/labels';
import {NewslettersResponseType} from '../../src/api/newsletters';
import {OffersResponseType} from '../../src/api/offers';
import {Page} from '@playwright/test';
import {RolesResponseType} from '../../src/api/roles';
import {SettingsResponseType} from '../../src/api/settings';
import {SiteResponseType} from '../../src/api/site';
import {ThemesResponseType} from '../../src/api/themes';
import {TiersResponseType} from '../../src/api/tiers';
import {UsersResponseType} from '../../src/api/users';
import {readFileSync} from 'fs';

interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
}

interface RequestRecord {
    url?: string
    body?: object | null
    headers?: {[key: string]: string}
}

const siteFixture = JSON.parse(readFileSync(`${__dirname}/responses/site.json`).toString()) as SiteResponseType;

export const responseFixtures = {
    settings: JSON.parse(readFileSync(`${__dirname}/responses/settings.json`).toString()) as SettingsResponseType,
    config: JSON.parse(readFileSync(`${__dirname}/responses/config.json`).toString()) as ConfigResponseType,
    users: JSON.parse(readFileSync(`${__dirname}/responses/users.json`).toString()) as UsersResponseType,
    me: JSON.parse(readFileSync(`${__dirname}/responses/me.json`).toString()) as UsersResponseType,
    roles: JSON.parse(readFileSync(`${__dirname}/responses/roles.json`).toString()) as RolesResponseType,
    site: siteFixture,
    invites: JSON.parse(readFileSync(`${__dirname}/responses/invites.json`).toString()) as InvitesResponseType,
    customThemeSettings: JSON.parse(readFileSync(`${__dirname}/responses/custom_theme_settings.json`).toString()) as CustomThemeSettingsResponseType,
    tiers: JSON.parse(readFileSync(`${__dirname}/responses/tiers.json`).toString()) as TiersResponseType,
    labels: JSON.parse(readFileSync(`${__dirname}/responses/labels.json`).toString()) as LabelsResponseType,
    offers: JSON.parse(readFileSync(`${__dirname}/responses/offers.json`).toString()) as OffersResponseType,
    themes: JSON.parse(readFileSync(`${__dirname}/responses/themes.json`).toString()) as ThemesResponseType,
    newsletters: JSON.parse(readFileSync(`${__dirname}/responses/newsletters.json`).toString()) as NewslettersResponseType,
    actions: JSON.parse(readFileSync(`${__dirname}/responses/actions.json`).toString()) as ActionsResponseType,
    latestPost: {posts: [{id: '1', url: `${siteFixture.site.url}/test-post/`}]}
};

export const globalDataRequests = {
    browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: responseFixtures.settings},
    browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
    browseSite: {method: 'GET', path: '/site/', response: responseFixtures.site},
    browseMe: {method: 'GET', path: '/users/me/', response: responseFixtures.me}
};

export async function mockApi<Requests extends Record<string, MockRequestConfig>>({page, requests}: {page: Page, requests: Requests}) {
    const lastApiRequests: {[key in keyof Requests]?: RequestRecord} = {};

    const namedRequests = Object.entries(requests).reduce(
        (array, [key, value]) => array.concat({name: key, ...value}),
        [] as Array<MockRequestConfig & {name: keyof Requests}>
    );

    await page.route(/\/ghost\/api\/admin\//, async (route) => {
        const apiPath = route.request().url().replace(/^.*\/ghost\/api\/admin/, '');

        const matchingMock = namedRequests.find((request) => {
            if (request.method !== route.request().method()) {
                return false;
            }

            if (typeof request.path === 'string') {
                return request.path === apiPath;
            }

            return request.path.test(apiPath);
        });

        if (!matchingMock) {
            return route.fulfill({
                status: 418,
                body: [
                    'No matching mock found. If this request is needed for the test, add it to your mockApi call',
                    '',
                    'Currently mocked:',
                    ...namedRequests.map(({method, path}) => `${method} ${path}`)
                ].join('\n')
            });
        }

        const requestBody = JSON.parse(route.request().postData() || 'null');

        lastApiRequests[matchingMock.name] = {
            body: requestBody,
            url: route.request().url(),
            headers: route.request().headers()
        };

        await route.fulfill({
            status: matchingMock.responseStatus || 200,
            body: typeof matchingMock.response === 'string' ? matchingMock.response : JSON.stringify(matchingMock.response)
        });
    });

    return {lastApiRequests};
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

export async function mockSitePreview({page, url, response}: {page: Page, url: string, response: string}) {
    let lastRequest: {previewHeader?: string} = {};

    await page.route(url, async (route) => {
        if (route.request().method() !== 'POST') {
            return route.continue();
        }

        if (!route.request().headers()['x-ghost-preview']) {
            return route.continue();
        }

        lastRequest.previewHeader = route.request().headers()['x-ghost-preview'];

        await route.fulfill({
            status: 200,
            body: response
        });
    });

    return lastRequest;
}
