class LinkTrackingServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const LinkTrackingService = require('@tryghost/link-tracking');

        // Expose the service
        this.service = new LinkTrackingService({
            linkClickRepository: {
                async save(linkClick) {
                    // eslint-disable-next-line no-console
                    console.log('Saving link click', linkClick);
                }
            }
        });

        await this.service.init();
    }
}

module.exports = new LinkTrackingServiceWrapper();
