const {ActivityPubService} = require('@tryghost/activitypub');

module.exports = class ActivityPubServiceWrapper {
    /** @type ActivityPubService */
    static instance;

    static async init() {
        if (ActivityPubServiceWrapper.instance) {
            return;
        }
        const labs = require('../../../shared/labs');

        if (!labs.isSet('ActivityPub')) {
            return;
        }

        const urlUtils = require('../../../shared/url-utils');
        const siteUrl = new URL(urlUtils.getSiteUrl());

        const db = require('../../data/db');
        const knex = db.knex;

        const logging = require('@tryghost/logging');

        const IdentityTokenServiceWrapper = require('../identity-tokens');

        if (!IdentityTokenServiceWrapper.instance) {
            logging.error(`IdentityTokenService needs to be initialised before ActivityPubService`);
        }

        ActivityPubServiceWrapper.instance = new ActivityPubService(
            knex,
            siteUrl,
            logging,
            IdentityTokenServiceWrapper.instance
        );

        if (labs.isSet('ActivityPub') && IdentityTokenServiceWrapper.instance) {
            await ActivityPubServiceWrapper.instance.initialiseWebhooks();
        }
    }
};
