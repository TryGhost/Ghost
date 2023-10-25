import {ActionsResponseType} from '../../src/api/actions';
import {ConfigResponseType} from '../../src/api/config';
import {CustomThemeSettingsResponseType} from '../../src/api/customThemeSettings';
import {InvitesResponseType} from '../../src/api/invites';
import {LabelsResponseType} from '../../src/api/labels';
import {Locator, Page, expect} from '@playwright/test';
import {NewslettersResponseType} from '../../src/api/newsletters';
import {OffersResponseType} from '../../src/api/offers';
import {RecommendationResponseType} from '../../src/api/recommendations';
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
    recommendations: JSON.parse(readFileSync(`${__dirname}/responses/recommendations.json`).toString()) as RecommendationResponseType,
    incomingRecommendations: JSON.parse(readFileSync(`${__dirname}/responses/incoming_recommendations.json`).toString()) as RecommendationResponseType,
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

let defaultLabFlags = {
    audienceFeedback: false,
    collections: false,
    themeErrorsNotification: false,
    outboundLinkTagging: false,
    announcementBar: false,
    signupForm: false,
    members: false
};

// Inject defaultLabFlags into responseFixtures.settings and config
let labsSetting = responseFixtures.settings.settings.find(s => s.key === 'labs');
let configSettings = responseFixtures.config.config;

if (configSettings) {
    configSettings.labs = defaultLabFlags;
}

if (!labsSetting) {
    // If 'labs' key doesn't exist, create it
    responseFixtures.settings.settings.push({
        key: 'labs',
        value: JSON.stringify(defaultLabFlags)
    });
} else {
    // If 'labs' key exists, update its value
    labsSetting.value = JSON.stringify(defaultLabFlags);
}

interface LabsSettings {
    [key: string]: boolean;
}

export function toggleLabsFlag(flag: string, value: boolean) {
    // Update responseFixtures.settings
    labsSetting = responseFixtures.settings.settings.find(s => s.key === 'labs');

    if (!labsSetting) {
        throw new Error('Labs settings not found');
    }

    if (typeof labsSetting.value !== 'string') {
        throw new Error('Labs settings value is not a string');
    }

    let labs: LabsSettings;
    try {
        labs = JSON.parse(labsSetting.value);
    } catch (e) {
        throw new Error('Failed to parse labs settings');
    }

    labs[flag] = value;
    labsSetting.value = JSON.stringify(labs);

    // Update responseFixtures.config
    configSettings = responseFixtures.config.config;

    if (configSettings && configSettings.labs) {
        configSettings.labs[flag] = value;
    } else {
        throw new Error('Config settings or labs settings in config not found');
    }
}

export const globalDataRequests = {
    browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: responseFixtures.settings},
    browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
    browseSite: {method: 'GET', path: '/site/', response: responseFixtures.site},
    browseMe: {method: 'GET', path: '/users/me/?include=roles', response: responseFixtures.me}
};

export const limitRequests = {
    browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
    browseInvites: {method: 'GET', path: '/invites/', response: responseFixtures.invites},
    browseRoles: {method: 'GET', path: '/roles/?limit=all', response: responseFixtures.roles},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters}
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

export function meWithRole(name: string) {
    const role = responseFixtures.roles.roles.find(r => r.name === name);

    return {
        ...responseFixtures.me,
        users: [{
            ...responseFixtures.me.users[0],
            roles: [role]
        }]
    };
};

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

export async function chooseOptionInSelect(select: Locator, optionText: string | RegExp) {
    await select.click();
    await select.page().locator('[data-testid="select-option"]', {hasText: optionText}).click();
}

export async function testUrlValidation(input: Locator, textToEnter: string, expectedResult: string, expectedError?: string) {
    await input.fill(textToEnter);
    await input.blur();

    expect(input).toHaveValue(expectedResult);

    if (expectedError) {
        await expect(input.locator('xpath=../..')).toContainText(expectedError);
    }
};
