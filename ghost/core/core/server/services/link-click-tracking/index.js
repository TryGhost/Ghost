const LinkClickRepository = require('./LinkClickRepository');
const PostLinkRepository = require('./PostLinkRepository');
const errors = require('@tryghost/errors');

class LinkTrackingServiceWrapper {
    async init() {
        if (this.service) {
            // Already done
            return;
        }

        const linkRedirection = require('../link-redirection');
        if (!linkRedirection.service) {
            throw new errors.InternalServerError({message: 'LinkRedirectionService should be initialised before LinkTrackingService'});
        }

        // Wire up all the dependencies
        const models = require('../../models');
        const {LinkTrackingService} = require('@tryghost/link-tracking');

        const postLinkRepository = new PostLinkRepository({
            LinkRedirect: models.LinkRedirect,
            linkRedirectRepository: linkRedirection.linkRedirectRepository
        });

        const linkClickRepository = new LinkClickRepository({
            MemberLinkClickEvent: models.MemberLinkClickEvent,
            Member: models.Member
        });

        // Expose the service
        this.service = new LinkTrackingService({
            linkRedirectService: linkRedirection.service,
            linkClickRepository,
            postLinkRepository
        });

        await this.service.init();
    }
}

module.exports = new LinkTrackingServiceWrapper();
