/**
 * Response fixtures for Ghost API tests
 * 
 * This file collects all API response fixtures used in testing
 */

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

const defaultLabFlags = {
    audienceFeedback: false,
    collections: false,
    themeErrorsNotification: false,
    outboundLinkTagging: false,
    announcementBar: false,
    members: false
};

// Export all response fixtures with proper type assertions
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
    activitypubFeed: activitypubFeedFixture
};

// Inject defaultLabFlags into config
const configSettings = responseFixtures.config.config;
if (configSettings) {
    configSettings.labs = defaultLabFlags;
}

// Inject defaultLabFlags into settings
const labsSetting = responseFixtures.settings.settings.find(s => s.key === 'labs');
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

/**
 * Create an updated settings response with new settings
 */
export function updatedSettingsResponse(
    newSettings: Array<{key: string, value: string | boolean | null, is_read_only?: boolean}>
) {
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

/**
 * Create an updated user response with a specific role
 */
export function meWithRole(name: string) {
    const role = responseFixtures.roles.roles.find(r => r.name === name);

    return {
        ...responseFixtures.me,
        users: [{
            ...responseFixtures.me.users[0],
            roles: [role]
        }]
    };
}

// Common test data
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