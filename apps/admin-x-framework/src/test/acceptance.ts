import {Locator, Page, expect} from '@playwright/test';

import actionsFixture from './responses/actions.json';
import configFixture from './responses/config.json';
import customThemeSettingsFixture from './responses/custom_theme_settings.json';
import incomingRecommendationsFixture from './responses/incoming_recommendations.json';
import invitesFixture from './responses/invites.json';
import labelsFixture from './responses/labels.json';
import meFixture from './responses/me.json';
import newslettersFixture from './responses/newsletters.json';
import offersFixture from './responses/offers.json';
import recommendationsFixture from './responses/recommendations.json';
import rolesFixture from './responses/roles.json';
import settingsFixture from './responses/settings.json';
import siteFixture from './responses/site.json';
import themesFixture from './responses/themes.json';
import tiersFixture from './responses/tiers.json';
import usersFixture from './responses/users.json';
import activitypubInboxFixture from './responses/activitypub/inbox.json';
import activitypubFollowingFixture from './responses/activitypub/following.json';

import {ActionsResponseType} from '../api/actions';
import {ConfigResponseType} from '../api/config';
import {CustomThemeSettingsResponseType} from '../api/customThemeSettings';
import {InvitesResponseType} from '../api/invites';
import {LabelsResponseType} from '../api/labels';
import {NewslettersResponseType} from '../api/newsletters';
import {OffersResponseType} from '../api/offers';
import {IncomingRecommendationResponseType, RecommendationResponseType} from '../api/recommendations';
import {RolesResponseType} from '../api/roles';
import {SettingsResponseType} from '../api/settings';
import {ThemesResponseType} from '../api/themes';
import {TiersResponseType} from '../api/tiers';
import {UsersResponseType} from '../api/users';
import {ExternalLink} from '../routing';

interface MockRequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    responseStatus?: number;
    responseHeaders?: {[key: string]: string};
}

interface RequestRecord {
    url?: string
    body?: object | null
    headers?: {[key: string]: string}
}

export const responseFixtures = {
    settings: settingsFixture as SettingsResponseType,
    recommendations: recommendationsFixture as RecommendationResponseType,
    incomingRecommendations: incomingRecommendationsFixture as IncomingRecommendationResponseType,
    config: configFixture as ConfigResponseType,
    users: usersFixture as UsersResponseType,
    me: meFixture as UsersResponseType,
    roles: rolesFixture as RolesResponseType,
    site: siteFixture,
    invites: invitesFixture as InvitesResponseType,
    customThemeSettings: customThemeSettingsFixture as CustomThemeSettingsResponseType,
    tiers: tiersFixture as TiersResponseType,
    labels: labelsFixture as LabelsResponseType,
    offers: offersFixture as OffersResponseType,
    themes: themesFixture as ThemesResponseType,
    newsletters: newslettersFixture as NewslettersResponseType,
    actions: actionsFixture as ActionsResponseType,
    latestPost: {posts: [{id: '1', url: `${siteFixture.site.url}/test-post/`}]},
    activitypubInbox: activitypubInboxFixture,
    activitypubFollowing: activitypubFollowingFixture
};

const defaultLabFlags = {
    audienceFeedback: false,
    collections: false,
    themeErrorsNotification: false,
    outboundLinkTagging: false,
    announcementBar: false,
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

export const settingsWithStripe = updatedSettingsResponse([
    {key: 'stripe_connect_publishable_key', value: 'pk_test_123'},
    {key: 'stripe_connect_secret_key', value: 'sk_test_123'},
    {key: 'stripe_connect_display_name', value: 'Dummy'},
    {key: 'stripe_connect_account_id', value: 'acct_123'}
]);

export const limitRequests = {
    browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
    browseInvites: {method: 'GET', path: '/invites/', response: responseFixtures.invites},
    browseRoles: {method: 'GET', path: '/roles/?limit=all', response: responseFixtures.roles},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters}
};

export async function mockApi<Requests extends Record<string, MockRequestConfig>>({page, requests, options = {}}: {page: Page, requests: Requests, options?: {useActivityPub?: boolean}}) {
    const lastApiRequests: {[key in keyof Requests]?: RequestRecord} = {};

    const namedRequests = Object.entries(requests).reduce(
        (array, [key, value]) => array.concat({name: key, ...value}),
        [] as Array<MockRequestConfig & {name: keyof Requests}>
    );

    const routeRegex = options?.useActivityPub ? /\/activitypub\// : /\/ghost\/api\/admin\//;
    const routeReplaceRegex = options.useActivityPub ? /^.*\/activitypub/ : /^.*\/ghost\/api\/admin/;

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
            body: typeof matchingMock.response === 'string' ? matchingMock.response : JSON.stringify(matchingMock.response),
            headers: matchingMock.responseHeaders || {}
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
    const lastRequest: {previewHeader?: string} = {};

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

export async function expectExternalNavigate(page: Page, link: Partial<ExternalLink>) {
    await page.waitForURL(`/external/${encodeURIComponent(JSON.stringify({isExternal: true, ...link}))}`);
};
