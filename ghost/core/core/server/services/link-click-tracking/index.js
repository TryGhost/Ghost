class LinkTrackingServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const LinkTrackingService = require('@tryghost/link-tracking');

        // Expose the service
        this.service = new LinkTrackingService();

        return this.service.init();
    }
}

module.exports = new LinkTrackingServiceWrapper();
