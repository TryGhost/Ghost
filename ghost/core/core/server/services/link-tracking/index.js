const LinkClickRepository = require('./link-click-repository');
const PostLinkRepository = require('./post-link-repository');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils');

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
        const {MemberLinkClickEvent} = require('../../../shared/events');
        const DomainEvents = require('@tryghost/domain-events');

        const LinkClickTrackingService = require('./link-click-tracking-service');

        const postLinkRepository = new PostLinkRepository({
            LinkRedirect: models.Redirect,
            linkRedirectRepository: linkRedirection.linkRedirectRepository
        });

        this.linkClickRepository = new LinkClickRepository({
            MemberLinkClickEventModel: models.MemberClickEvent,
            Member: models.Member,
            MemberLinkClickEvent: MemberLinkClickEvent,
            DomainEvents
        });

        // Expose the service
        this.service = new LinkClickTrackingService({
            linkRedirectService: linkRedirection.service,
            linkClickRepository: this.linkClickRepository,
            postLinkRepository,
            DomainEvents,
            urlUtils
        });

        await this.service.init();
    }
}

module.exports = new LinkTrackingServiceWrapper();
