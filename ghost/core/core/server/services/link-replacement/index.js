class LinkReplacementServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const LinkReplacementService = require('@tryghost/link-replacement');
        const urlUtils = require('../../../shared/url-utils');
        const settingsCache = require('../../../shared/settings-cache');

        const store = [];

        // Expose the service
        this.service = new LinkReplacementService({
            linkRedirectService: require('../link-redirection').service,
            linkClickTrackingService: require('../link-click-tracking').service,
            attributionService: require('../member-attribution').service,
            urlUtils,
            settingsCache,
            postLinkRepository: {
                async save(postLink) {
                    store.push(postLink);
                }
            }
        });
    }
}

module.exports = new LinkReplacementServiceWrapper();
