const {ActivityPubService} = require('./ActivityPubService');

module.exports = class ActivityPubServiceWrapper {
    /** @type ActivityPubService */
    static instance;

    static initialised = false;

    static async init() {
        if (ActivityPubServiceWrapper.instance) {
            return;
        }

        const logging = require('@tryghost/logging');
        const events = require('../../lib/common/events');
        const {knex} = require('../../data/db');
        const urlUtils = require('../../../shared/url-utils');
        const IdentityTokenServiceWrapper = require('../identity-tokens');
        const settingsCache = require('../../../shared/settings-cache');

        if (!IdentityTokenServiceWrapper.instance) {
            logging.error(`IdentityTokenService needs to be initialised before ActivityPubService`);
            return;
        }

        const siteUrl = new URL(urlUtils.getSiteUrl());

        ActivityPubServiceWrapper.instance = new ActivityPubService(
            knex,
            siteUrl,
            logging,
            IdentityTokenServiceWrapper.instance
        );

        if (settingsCache.get('social_web_enabled')) {
            await ActivityPubServiceWrapper.instance.initialiseWebhooks();
            ActivityPubServiceWrapper.initialised = true;
        } else {
            events.on('settings.labs.edited', async () => {
                if (settingsCache.get('social_web_enabled') && !ActivityPubServiceWrapper.initialised) {
                    await ActivityPubServiceWrapper.instance.initialiseWebhooks();
                    ActivityPubServiceWrapper.initialised = true;
                }
            });
        }
    }
};
