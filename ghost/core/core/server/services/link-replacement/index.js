class LinkReplacementServiceWrapper {
    init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const LinkReplacementService = require('@tryghost/link-replacement');

        // Expose the service
        this.service = new LinkReplacementService({});
    }
}

module.exports = new LinkReplacementServiceWrapper();
