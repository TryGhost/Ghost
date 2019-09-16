const MembersSSR = require('@tryghost/members-ssr');

const createMembersApiInstance = require('./api');
const common = require('../../lib/common');
const urlUtils = require('../../lib/url-utils');
const settingsCache = require('../settings/cache');

let membersApi;

// Bind to events to automatically keep subscription info up-to-date from settings
common.events.on('settings.edited', function updateSettingFromModel(settingModel) {
    if (!['members_subscription_settings'].includes(settingModel.get('key'))) {
        return;
    }

    const reconfiguredMembersAPI = createMembersApiInstance();
    reconfiguredMembersAPI.bus.on('ready', function () {
        membersApi = reconfiguredMembersAPI;
    });
    reconfiguredMembersAPI.bus.on('error', function (err) {
        common.logging.error(err);
    });
});

const membersService = {
    isPaymentConfigured() {
        const settings = settingsCache.get('members_subscription_settings');
        return !!settings && settings.isPaid && settings.paymentProcessors.length !== 0;
    },

    get api() {
        if (!membersApi) {
            membersApi = createMembersApiInstance();

            membersApi.bus.on('error', function (err) {
                common.logging.error(err);
            });
        }
        return membersApi;
    },

    ssr: MembersSSR({
        cookieSecure: urlUtils.isSSL(urlUtils.getSiteUrl()),
        cookieKeys: [settingsCache.get('theme_session_secret')],
        cookieName: 'ghost-members-ssr',
        cookieCacheName: 'ghost-members-ssr-cache',
        getMembersApi: () => membersService.api
    })
};

module.exports = membersService;
