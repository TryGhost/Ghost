class LinkReplacementServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const LinkReplacementService = require('@tryghost/link-replacement');

        // Expose the service
        this.service = new LinkReplacementService({
            linkRedirectService: require('../link-redirection').service,
            linkClickTrackingService: require('../link-click-tracking').service
        });
    }
}

module.exports = new LinkReplacementServiceWrapper();
