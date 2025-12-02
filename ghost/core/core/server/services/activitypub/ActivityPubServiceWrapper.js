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

        async function configureActivityPub() {
            const socialWebEnabled = settingsCache.get('social_web_enabled');
            const isPrivate = settingsCache.get('is_private');

            try {
                if (socialWebEnabled) {
                    if (!ActivityPubServiceWrapper.initialised) {
                        // Service is being initialised - only create webhooks if site is NOT private
                        // Currently `enable` ONLY creates webhooks
                        if (!isPrivate) {
                            await ActivityPubServiceWrapper.instance.enable();
                        }

                        ActivityPubServiceWrapper.initialised = true;
                    } else if (!isPrivate) {
                        // Service is already initialised, private mode was disabled,
                        // create webhooks if they don't exist
                        await ActivityPubServiceWrapper.instance.initialiseWebhooks();
                    } else {
                        // Service is already initialised, private mode was enabled,
                        // remove webhooks but DO NOT disable the service (we just
                        // want to disable federation of posts)
                        logging.info('Removing ActivityPub webhooks - site is in private mode');

                        await ActivityPubServiceWrapper.instance.removeWebhooks();
                    }
                } else {
                    if (ActivityPubServiceWrapper.initialised) {
                        await ActivityPubServiceWrapper.instance.disable();

                        ActivityPubServiceWrapper.initialised = false;
                    }
                }
            } catch (error) {
                logging.error('Failed to configure ActivityPub', error);
            }
        }

        events.on('settings.labs.edited', configureActivityPub);
        events.on('settings.social_web.edited', configureActivityPub);
        events.on('settings.is_private.edited', configureActivityPub);

        configureActivityPub();
    }
};
