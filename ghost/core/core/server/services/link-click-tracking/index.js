const LinkClickRepository = require('./LinkClickRepository');
const PostLinkRepository = require('./PostLinkRepository');

class LinkTrackingServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        // Wire up all the dependencies
        const models = require('../../models');
        const {LinkTrackingService} = require('@tryghost/link-tracking');

        const postLinkRepository = new PostLinkRepository({
            LinkRedirect: models.LinkRedirect
        });

        const linkClickRepository = new LinkClickRepository({
            MemberLinkClickEvent: models.MemberLinkClickEvent,
            Member: models.Member
        });

        // Expose the service
        this.service = new LinkTrackingService({
            linkRedirectService: require('../link-redirection').service,
            linkClickRepository,
            postLinkRepository
        });

        await this.service.init();
    }
}

module.exports = new LinkTrackingServiceWrapper();
