const {ActivityPubService} = require('@tryghost/activitypub');

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
        const labs = require('../../../shared/labs');
        const urlUtils = require('../../../shared/url-utils');
        const IdentityTokenServiceWrapper = require('../identity-tokens');

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

        if (labs.isSet('ActivityPub')) {
            await ActivityPubServiceWrapper.instance.initialiseWebhooks();
            ActivityPubServiceWrapper.initialised = true;
        } else {
            events.on('settings.labs.edited', async () => {
                if (labs.isSet('ActivityPub') && !ActivityPubServiceWrapper.initialised) {
                    await ActivityPubServiceWrapper.instance.initialiseWebhooks();
                    ActivityPubServiceWrapper.initialised = true;
                }
            });
        }
    }
};
