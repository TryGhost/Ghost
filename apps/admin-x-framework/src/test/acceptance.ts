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
import memberCountHistoryFixture from './responses/member_count_history.json';
import mrrHistoryFixture from './responses/mrr_history.json';
import newsletterStatsFixture from './responses/newsletter_stats.json';
import linksFixture from './responses/links.json';
import topPostsFixture from './responses/top_posts.json';
import postReferrersFixture from './responses/post_referrers.json';

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
import {ThemesResponseType} from '../api/themes';
import {TiersResponseType} from '../api/tiers';
import {UsersResponseType} from '../api/users';
import {ExternalLink} from '../routing';
import {MemberCountHistoryResponseType, MrrHistoryResponseType, NewsletterStatsResponseType, TopPostsStatsResponseType, PostReferrersResponseType} from '../api/stats';
import {LinkResponseType} from '../api/links';

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
    memberCountHistory: memberCountHistoryFixture as MemberCountHistoryResponseType,
    mrrHistory: mrrHistoryFixture as MrrHistoryResponseType,
    newsletterStats: newsletterStatsFixture as NewsletterStatsResponseType,
    links: linksFixture as LinkResponseType,
    topPosts: topPostsFixture as TopPostsStatsResponseType,
    postReferrers: postReferrersFixture as PostReferrersResponseType
};

const defaultLabFlags = {
    collections: false,
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
    } catch {
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

export const statsRequests = {
    browseMemberCountHistory: {method: 'GET', path: /^\/stats\/member_count\//, response: responseFixtures.memberCountHistory},
    browseMrrHistory: {method: 'GET', path: '/stats/mrr/', response: responseFixtures.mrrHistory},
    browseNewsletterStats: {method: 'GET', path: /^\/stats\/newsletter-stats\//, response: responseFixtures.newsletterStats},
    browseTopPosts: {method: 'GET', path: /^\/stats\/top-posts\//, response: responseFixtures.topPosts},
    browsePostReferrers: {method: 'GET', path: /^\/stats\/posts\/[^/]+\/top-referrers/, response: responseFixtures.postReferrers},
    browseLinks: {method: 'GET', path: /^\/links\//, response: responseFixtures.links}
};

export const postsRequests = {
    browsePost: {method: 'GET', path: /^\/posts\/[^/]+\//, response: {posts: [{
        id: '64d623b64676110001e897d9',
        newsletter: {id: 'newsletter-123'},
        email: {email_count: 1000, opened_count: 450},
        count: {clicks: 120}
    }]}},
    browseNewsletterStats: {method: 'GET', path: /^\/stats\/newsletter-stats\//, response: responseFixtures.newsletterStats},
    browseLinks: {method: 'GET', path: /^\/links\//, response: responseFixtures.links}
};

/**
 * Default mock requests that include all common endpoints.
 * Apps can use this directly or override specific requests as needed.
 */
export const defaultRequests = {
    ...globalDataRequests,
    ...limitRequests,
    ...statsRequests,
    ...postsRequests
};

/**
 * Helper function to create mock requests with optional overrides
 * @param overrides - Optional overrides for specific requests
 * @returns Combined request configuration
 */
export function createMockRequests(overrides: Record<string, MockRequestConfig> = {}) {
    return {
        ...defaultRequests,
        ...overrides
    };
}

export async function mockApi<Requests extends Record<string, MockRequestConfig>>({page, requests, options = {}}: {page: Page, requests: Requests, options?: {useActivityPub?: boolean}}) {
    const lastApiRequests: {[key in keyof Requests]?: RequestRecord} = {};

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
            body: typeof matchingMock.response === 'string' ? matchingMock.response : JSON.stringify(matchingMock.response),
            headers: matchingMock.responseHeaders || {}
        });
    });

    return {lastApiRequests};
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

    await page.route(url, async (route) => {
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

    expect(input).toHaveValue(expectedResult);

    if (expectedError) {
        await expect(input.locator('xpath=../..')).toContainText(expectedError);
    }
};

export async function expectExternalNavigate(page: Page, link: Partial<ExternalLink>) {
    const expected = {isExternal: true, ...link};
    await expect.poll(() => page.locator('body').getAttribute('data-external-navigate').then(v => v && JSON.parse(v))).toEqual(expected);
    await page.locator('body').evaluate(el => delete el.dataset.externalNavigate);
};
