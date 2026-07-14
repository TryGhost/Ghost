import {Locator, Page, expect} from '@playwright/test';
import {configResponse, currentUserResponse, defaultThemesResponse, settingsResponse, siteResponse} from '@tryghost/test-data';

import actionsFixture from './responses/actions.json';
import customThemeSettingsFixture from './responses/custom_theme_settings.json';
import incomingRecommendationsFixture from './responses/incoming_recommendations.json';
import invitesFixture from './responses/invites.json';
import labelsFixture from './responses/labels.json';
import newslettersFixture from './responses/newsletters.json';
import offersFixture from './responses/offers.json';
import recommendationsFixture from './responses/recommendations.json';
import rolesFixture from './responses/roles.json';
import tiersFixture from './responses/tiers.json';
import usersFixture from './responses/users.json';
import newsletterStatsFixture from './responses/newsletter_stats.json';
import topPostsFixture from './responses/top_posts.json';

import {ActionsResponseType} from '../api/actions';
import {ConfigResponseType} from '../api/config';
import {CustomThemeSettingsResponseType} from '../api/custom-theme-settings';
import {InvitesResponseType} from '../api/invites';
import {LabelsResponseType} from '../api/labels';
import {NewslettersResponseType} from '../api/newsletters';
import {OffersResponseType} from '../api/offers';
import {IncomingRecommendationResponseType, RecommendationResponseType} from '../api/recommendations';
import {RolesResponseType} from '../api/roles';
import {SettingsResponseType} from '../api/settings';
import {SiteResponseType} from '../api/site';
import {ThemesResponseType} from '../api/themes';
import {TiersResponseType} from '../api/tiers';
import {UsersResponseType} from '../api/users';
import {ExternalLink} from '../routing';
import {NewsletterStatsResponseType, TopPostsStatsResponseType} from '../api/stats';

interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    rawResponse?: string | ArrayBuffer | Uint8Array | Buffer;
    responseStatus?: number;
    responseHeaders?: {[key: string]: string};
}

interface RequestRecord {
    url?: string
    body?: object | null
    headers?: {[key: string]: string}
}

// The boot fixtures (settings, config, site, me) live in @tryghost/test-data.
// The accessors return fresh copies, so calling them once at module load keeps
// this object shared-mutable across a test file, exactly like the old JSON
// imports (specs mutate it via toggleLabsFlag and direct pushes).
const siteFixture = siteResponse() as SiteResponseType;

export const responseFixtures = {
    settings: settingsResponse() as SettingsResponseType,
    recommendations: recommendationsFixture as RecommendationResponseType,
    incomingRecommendations: incomingRecommendationsFixture as IncomingRecommendationResponseType,
    config: configResponse() as ConfigResponseType,
    users: usersFixture as UsersResponseType,
    me: currentUserResponse() as UsersResponseType,
    roles: rolesFixture as RolesResponseType,
    site: siteFixture,
    invites: invitesFixture as InvitesResponseType,
    customThemeSettings: customThemeSettingsFixture as CustomThemeSettingsResponseType,
    tiers: tiersFixture as TiersResponseType,
    labels: labelsFixture as LabelsResponseType,
    offers: offersFixture as OffersResponseType,
    themes: defaultThemesResponse() as ThemesResponseType,
    newsletters: newslettersFixture as NewslettersResponseType,
    actions: actionsFixture as ActionsResponseType,
    latestPost: {posts: [{id: '1', url: `${siteFixture.site.url}/test-post/`}]},
    newsletterStats: newsletterStatsFixture as NewsletterStatsResponseType,
    topPosts: topPostsFixture as TopPostsStatsResponseType
};

interface LabsSettings {
    [key: string]: boolean;
}

export function toggleLabsFlag(flag: string, value: boolean) {
    // Update responseFixtures.settings
    const labsSetting = responseFixtures.settings.settings.find(s => s.key === 'labs');

    if (!labsSetting) {
        throw new Error('Labs settings not found');
    }

    if (typeof labsSetting.value !== 'string') {
        throw new Error('Labs settings value is not a string');
    }

    let labs: LabsSettings;
    try {
        labs = JSON.parse(labsSetting.value);
    } catch {
        throw new Error('Failed to parse labs settings');
    }

    labs[flag] = value;
    labsSetting.value = JSON.stringify(labs);

    // Update responseFixtures.config
    const configSettings = responseFixtures.config.config;

    if (configSettings && configSettings.labs) {
        configSettings.labs[flag] = value;
    } else {
        throw new Error('Config settings or labs settings in config not found');
    }
}

export const settingsWithStripe = updatedSettingsResponse([
    {key: 'stripe_connect_publishable_key', value: 'pk_test_123'},
    {key: 'stripe_connect_secret_key', value: 'sk_test_123'},
    {key: 'stripe_connect_display_name', value: 'Dummy'},
    {key: 'stripe_connect_account_id', value: 'acct_123'}
]);

export const limitRequests = {
    browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
    browseInvites: {method: 'GET', path: '/invites/?limit=100&include=roles', response: responseFixtures.invites},
    browseRoles: {method: 'GET', path: '/roles/?limit=100', response: responseFixtures.roles},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters}
};

export const globalDataRequests = {
    browseSettings: {method: 'GET', path: /^\/settings\/\?group=/, response: responseFixtures.settings},
    browseConfig: {method: 'GET', path: '/config/', response: responseFixtures.config},
    browseSite: {method: 'GET', path: '/site/', response: responseFixtures.site},
    browseMe: {method: 'GET', path: '/users/me/?include=roles', response: responseFixtures.me}
};

export async function mockApi<Requests extends Record<string, MockRequestConfig>>({page, requests, options = {}}: {page: Page, requests: Requests, options?: {useActivityPub?: boolean}}) {
    const lastApiRequests: {[key in keyof Requests]?: RequestRecord} = {};

    const getResponseBody = (matchingMock: MockRequestConfig) => {
        if (typeof matchingMock.rawResponse === 'string' || Buffer.isBuffer(matchingMock.rawResponse)) {
            return matchingMock.rawResponse;
        }

        if (matchingMock.rawResponse instanceof ArrayBuffer) {
            return Buffer.from(matchingMock.rawResponse);
        }

        if (matchingMock.rawResponse instanceof Uint8Array) {
            return Buffer.from(matchingMock.rawResponse);
        }

        return typeof matchingMock.response === 'string' ? matchingMock.response : JSON.stringify(matchingMock.response);
    };

    const namedRequests = Object.entries(requests).reduce(
        (array, [key, value]) => array.concat({name: key, ...value}),
        [] as Array<MockRequestConfig & {name: keyof Requests}>
    );

    const routeRegex = options?.useActivityPub ? /\/.ghost\/activitypub\// : /\/ghost\/api\/admin\//;
    const routeReplaceRegex = options?.useActivityPub ? /^.*\/.ghost\/activitypub/ : /^.*\/ghost\/api\/admin/;

    await page.route(routeRegex, async (route) => {
        const apiPath = route.request().url().replace(routeReplaceRegex, '');

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

        let requestBody = null;
        try {
            // Try to parse the post data as JSON
            requestBody = JSON.parse(route.request().postData() || 'null');
        } catch {
            // Post data isn't JSON (e.g. file upload) — use the raw post data
            requestBody = route.request().postData();
        }

        lastApiRequests[matchingMock.name] = {
            body: requestBody,
            url: route.request().url(),
            headers: route.request().headers()
        };

        await route.fulfill({
            status: matchingMock.responseStatus || 200,
            body: getResponseBody(matchingMock),
            headers: matchingMock.responseHeaders || {}
        });
    });

    return {lastApiRequests};
}

export async function waitForApiRequest<Requests extends Record<string, MockRequestConfig>>(lastApiRequests: {[key in keyof Requests]?: RequestRecord}, requestName: keyof Requests) {
    await expect.poll(() => lastApiRequests[requestName]).toBeTruthy();

    return lastApiRequests[requestName]!;
}

export function updatedSettingsResponse(newSettings: Array<{ key: string, value: string | boolean | null, is_read_only?: boolean }>) {
    return {
        ...responseFixtures.settings,
        settings: responseFixtures.settings.settings.map((setting) => {
            const newSetting = newSettings.find(({key}) => key === setting.key);

            return {
                key: setting.key,
                value: newSetting?.value !== undefined ? newSetting.value : setting.value,
                ...(newSetting?.is_read_only ? {is_read_only: true} : {})
            };
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
    const lastRequest: {previewHeader?: string} = {};
    const previewRequests: string[] = [];

    await page.route(`${url}**`, async (route) => {
        if (route.request().method() !== 'POST') {
            return route.continue();
        }

        if (!route.request().headers()['x-ghost-preview']) {
            return route.continue();
        }

        if (route.request().headers()['x-ghost-preview']) {
            previewRequests.push(route.request().headers()['x-ghost-preview']);
        }

        lastRequest.previewHeader = route.request().headers()['x-ghost-preview'];

        await route.fulfill({
            status: 200,
            body: response
        });
    });

    return {
        lastRequest,
        previewRequests
    };
}

export async function chooseOptionInSelect(select: Locator, optionText: string | RegExp) {
    await select.click();
    await select.page().locator('[data-testid="select-option"]', {hasText: optionText}).click();
}

export async function getOptionsFromSelect(select: Locator): Promise<string[]> {
    // Open the select dropdown
    await select.click();

    const options = await select.page().locator('[data-testid="select-option"]');
    const optionTexts = await options.allTextContents();

    // Close the select dropdown
    await select.press('Escape');

    return optionTexts;
}

export async function testUrlValidation(input: Locator, textToEnter: string, expectedResult: string, expectedError?: string) {
    await input.fill(textToEnter);
    await input.blur();

    await expect(input).toHaveValue(expectedResult);

    if (expectedError) {
        await expect(input.locator('xpath=../..')).toContainText(expectedError);
    }
};

export async function expectExternalNavigate(page: Page, link: Partial<ExternalLink>) {
    const expected = {isExternal: true, ...link};
    await expect.poll(() => page.locator('body').getAttribute('data-external-navigate').then(v => v && JSON.parse(v))).toEqual(expected);
    await page.locator('body').evaluate(el => delete el.dataset.externalNavigate);
};
