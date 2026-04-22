const {ActivityPubService} = require('./activity-pub-service');

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

        async function configureActivityPub() {
            if (settingsCache.get('social_web_enabled')) {
                if (!ActivityPubServiceWrapper.initialised) {
                    await ActivityPubServiceWrapper.instance.enable();
                    ActivityPubServiceWrapper.initialised = true;
                }
            } else {
                if (ActivityPubServiceWrapper.initialised) {
                    await ActivityPubServiceWrapper.instance.disable();
                    ActivityPubServiceWrapper.initialised = false;
                }
            }
        }

        events.on('settings.labs.edited', configureActivityPub);
        events.on('settings.social_web.edited', configureActivityPub);
        events.on('settings.is_private.edited', configureActivityPub);

        configureActivityPub();
    }
};
