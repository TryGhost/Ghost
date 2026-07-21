// This file contains everything that the helpers and frontend apps require from the core of Ghost
const settingsCache = require('../../shared/settings-cache');
const config = require('../../shared/config');
const settingsHelpers = require('../../server/services/settings-helpers');
const storageUtils = require('../../server/adapters/storage/utils');
const internalKeys = require('../../server/services/internal-keys').default;
const serverEventBus = require('../../server/lib/common/events');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');

// The only server events the frontend may subscribe to. A narrow surface on
// purpose: the shared bus's own header discourages widening cross-layer
// coupling, so new event names here need the same scrutiny as new exports.
const FRONTEND_SUBSCRIBABLE_EVENTS = ['site.changed', 'url.added', 'url.removed'];

// Require from the handlebars framework
const {SafeString} = require('./handlebars');

module.exports = {
    getFrontendKey: async () => {
        try {
            const key = await internalKeys.get('ghost-internal-frontend');
            return key.secret;
        } catch (err) {
            logging.error({
                event: {name: 'frontend.load-internal-key.error'},
                err
            }, 'Unable to find the internal frontend key');
            return null;
        }
    },

    /**
     * Section two: data manipulation
     * Stuff that modifies API data (SDK layer)
     */
    socialUrls: require('@tryghost/social-urls'),
    blogIcon: require('../../server/lib/image').blogIcon,
    cachedImageSizeFromUrl: require('../../server/lib/image').cachedImageSizeFromUrl,
    // bound because isInternalImage relies on `this` to reach sibling helpers in storage utils
    isInternalImage: storageUtils.isInternalImage.bind(storageUtils),
    // Used by router service and {{get}} helper to prepare data for optimal usage in themes
    prepareContextResource(data) {
        (Array.isArray(data) ? data : [data]).forEach((resource) => {
            // feature_image_caption contains HTML, making it a SafeString spares theme devs from triple-curlies
            if (resource.feature_image_caption) {
                resource.feature_image_caption = new SafeString(resource.feature_image_caption);
            }

            // some properties are extracted to local template data to force one way of using it
            delete resource.show_title_and_feature_image;
        });
    },

    /**
     * Section three: Core API
     * Parts of Ghost core that the frontend currently needs
     */

    // Config! Keys used:
    // isPrivacyDisabled & referrerPolicy used in ghost_head
    config: {
        get: config.get.bind(config),
        isPrivacyDisabled: config.isPrivacyDisabled.bind(config)
    },

    // TODO: Only expose "get"
    settingsCache: settingsCache,

    // Settings helpers for calculated settings
    settingsHelpers: {
        isWebAnalyticsEnabled: settingsHelpers.isWebAnalyticsEnabled.bind(settingsHelpers),
        // Delegates at call time (not bound at load) so tests that stub the
        // method on the settings-helpers service are still seen through here.
        getMembersValidationKey: (...args) => settingsHelpers.getMembersValidationKey(...args)
    },

    // Member actions needed by the frontend's unsubscribe route. Lazy so that
    // loading the proxy does not pull the members service in ahead of boot.
    get members() {
        return require('../../server/services/members');
    },

    // TODO: Expose less of the API to make this safe
    api: require('../../server/api').endpoints,

    // Narrow subscription surface for server events the frontend reacts to
    serverEvents: {
        on(eventName, listener) {
            if (!FRONTEND_SUBSCRIBABLE_EVENTS.includes(eventName)) {
                throw new errors.IncorrectUsageError({
                    message: `The frontend may not subscribe to the server event "${eventName}"`,
                    context: `Allowed events: ${FRONTEND_SUBSCRIBABLE_EVENTS.join(', ')}`
                });
            }
            serverEventBus.on(eventName, listener);
        }
    },

    // Labs utils for enabling/disabling helpers
    labs: require('../../shared/labs'),
    // URGH... Yuk (unhelpful comment :D)
    urlService: require('../../server/services/url'),
    urlUtils: require('../../shared/url-utils')
};
