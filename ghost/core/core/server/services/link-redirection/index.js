class LinkRedirectsServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const {LinkRedirectsService} = require('@tryghost/link-redirects');

        // Expose the service
        this.service = new LinkRedirectsService();
    }
}

module.exports = new LinkRedirectsServiceWrapper();
