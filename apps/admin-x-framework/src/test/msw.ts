/**
 * MSW implementation for Ghost tests
 */

import {HttpResponse, PathParams, http} from 'msw';
import {setupServer} from 'msw/node';

// Re-export MSW types and functions
export {http, HttpResponse};

// Type for API response fixtures
type JsonResponse = Record<string, unknown>;

// Import response fixtures
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
import activitypubFeedFixture from './responses/activitypub/feed.json';

// Export response fixtures
export const responseFixtures = {
    settings: settingsFixture,
    recommendations: recommendationsFixture,
    incomingRecommendations: incomingRecommendationsFixture,
    config: configFixture,
    users: usersFixture,
    me: meFixture,
    roles: rolesFixture,
    site: siteFixture,
    invites: invitesFixture,
    customThemeSettings: customThemeSettingsFixture,
    tiers: tiersFixture,
    labels: labelsFixture,
    offers: offersFixture,
    themes: themesFixture,
    newsletters: newslettersFixture,
    actions: actionsFixture,
    latestPost: {posts: [{id: '1', url: `${siteFixture.site.url}/test-post/`}]},
    activitypubInbox: activitypubInboxFixture,
    activitypubFeed: activitypubFeedFixture
};

// Default lab flags for fixtures
const defaultLabFlags = {
    audienceFeedback: false,
    collections: false,
    themeErrorsNotification: false,
    outboundLinkTagging: false,
    announcementBar: false,
    members: false
};

// Set lab flags in config fixture
if (responseFixtures.config.config) {
    responseFixtures.config.config.labs = defaultLabFlags;
}

// Set lab flags in settings fixture
const labsSetting = responseFixtures.settings.settings.find((s: {key: string}) => s.key === 'labs');
if (labsSetting) {
    labsSetting.value = JSON.stringify(defaultLabFlags);
} else {
    responseFixtures.settings.settings.push({
        key: 'labs',
        value: JSON.stringify(defaultLabFlags)
    });
}

/**
 * Helper utilities for settings and users
 */
export function updatedSettingsResponse(
    newSettings: Array<{key: string, value: string | boolean | null, is_read_only?: boolean}>
): JsonResponse {
    return {
        ...responseFixtures.settings,
        settings: responseFixtures.settings.settings.map((setting: {key: string, value: unknown}) => {
            const newSetting = newSettings.find(({key}) => key === setting.key);
            return {
                key: setting.key,
                value: newSetting?.value !== undefined ? newSetting.value : setting.value,
                ...(newSetting?.is_read_only ? {is_read_only: true} : {})
            };
        })
    };
}

export const settingsWithStripe = updatedSettingsResponse([
    {key: 'stripe_connect_publishable_key', value: 'pk_test_123'},
    {key: 'stripe_connect_secret_key', value: 'sk_test_123'},
    {key: 'stripe_connect_display_name', value: 'Dummy'},
    {key: 'stripe_connect_account_id', value: 'acct_123'}
]);

export function meWithRole(name: string): JsonResponse {
    const role = responseFixtures.roles.roles.find((r: {name: string}) => r.name === name);
    return {
        ...responseFixtures.me,
        users: [{
            ...responseFixtures.me.users[0],
            roles: [role]
        }]
    };
}

/**
 * Standard limit requests
 */
export const limitRequests = {
    browseUsers: {method: 'GET', path: '/users/?limit=100&include=roles', response: responseFixtures.users},
    browseInvites: {method: 'GET', path: '/invites/', response: responseFixtures.invites},
    browseRoles: {method: 'GET', path: '/roles/?limit=all', response: responseFixtures.roles},
    browseNewslettersLimit: {method: 'GET', path: '/newsletters/?filter=status%3Aactive&limit=1', response: responseFixtures.newsletters}
};

/**
 * Helper functions for creating handlers
 */
export const get = (path: string, response: unknown, status = 200) => http.get(path, () => HttpResponse.json(response as Record<string, unknown>, {status}));

export const post = (path: string, response: unknown, status = 201) => http.post(path, () => HttpResponse.json(response as Record<string, unknown>, {status}));

export const put = (path: string, response: unknown, status = 200) => http.put(path, () => HttpResponse.json(response as Record<string, unknown>, {status}));

export const del = (path: string, response: unknown, status = 204) => http.delete(path, () => HttpResponse.json(response as Record<string, unknown>, {status}));

export const patch = (path: string, response: unknown, status = 200) => http.patch(path, () => HttpResponse.json(response as Record<string, unknown>, {status}));

/**
 * Create a dynamic handler that processes request data
 */
export function createDynamicHandler<P extends PathParams = PathParams>(
    method: 'get' | 'post' | 'put' | 'delete' | 'patch',
    path: string,
    handler: (info: {request: Request, params: P}) => Promise<unknown> | unknown
) {
    return http[method]<P>(path, async (info) => {
        const result = await handler(info);
        return HttpResponse.json(result as Record<string, unknown>);
    });
}

/**
 * Create handlers from requests config
 */
export interface RequestConfig {
    method: string;
    path: string | RegExp;
    response: unknown;
    status?: number;
}

export function createHandlersFromConfig(
    requests: Record<string, RequestConfig>,
    options: {useActivityPub?: boolean} = {}
) {
    return Object.entries(requests).map(([, config]) => {
        const {method, path, response, status} = config;
        const httpMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';
        
        const apiPath = options?.useActivityPub 
            ? new RegExp(`/activitypub${typeof path === 'string' ? path : path.source}`)
            : new RegExp(`/ghost/api/admin${typeof path === 'string' ? path : path.source}`);
            
        return http[httpMethod](apiPath, () => {
            return HttpResponse.json(response as Record<string, unknown>, {
                status: status || (httpMethod === 'post' ? 201 : 200)
            });
        });
    });
}

/**
 * Default Ghost API handlers 
 */
function createDefaultHandlers() {
    return [
        // Settings
        get('/ghost/api/admin/settings/', responseFixtures.settings),
        get('/ghost/api/admin/users/', responseFixtures.users),
        get('/ghost/api/admin/users/me/', responseFixtures.me),
        get('/ghost/api/admin/roles/', responseFixtures.roles),
        get('/ghost/api/admin/site/', responseFixtures.site),
        get('/ghost/api/admin/config/', responseFixtures.config),
        get('/ghost/api/admin/invites/', responseFixtures.invites),
        get('/ghost/api/admin/custom_theme_settings/', responseFixtures.customThemeSettings),
        get('/ghost/api/admin/tiers/', responseFixtures.tiers),
        get('/ghost/api/admin/labels/', responseFixtures.labels),
        get('/ghost/api/admin/offers/', responseFixtures.offers),
        get('/ghost/api/admin/themes/', responseFixtures.themes),
        get('/ghost/api/admin/newsletters/', responseFixtures.newsletters),
        get('/ghost/api/admin/actions/', responseFixtures.actions),
        get('/ghost/api/admin/recommendations/', responseFixtures.recommendations),
        get('/ghost/api/admin/recommendations/incoming/', responseFixtures.incomingRecommendations),
        get('/activitypub/inbox/', responseFixtures.activitypubInbox),
        get('/activitypub/feed/', responseFixtures.activitypubFeed)
    ];
}

/**
 * Create a server instance with default handlers
 */
export const server = setupServer(...createDefaultHandlers());

/**
 * Setup function to init MSW for tests
 */
export function setupMSW() {
    server.listen({onUnhandledRequest: 'bypass'});
    
    return {
        teardown() {
            server.close();
        },
        
        resetHandlers() {
            server.resetHandlers();
            server.use(...createDefaultHandlers());
        },
        
        use(...handlers: Parameters<typeof server.use>) {
            server.use(...handlers);
        }
    };
}

// Initialize a ready-to-use MSW setup
export const msw = setupMSW(); 