const LinkClickRepository = require('./link-click-repository');
const PostLinkRepository = require('./post-link-repository');
const LinkClickTrackingService = require('./link-click-tracking-service');
const {MemberLinkClickEvent} = require('../../../shared/events');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.urlUtils
 * @param {object} deps.domainEvents
 * @param {object} deps.linkRedirection
 */
module.exports = function createLinkTrackingService({models, urlUtils, domainEvents, linkRedirection}) {
    const postLinkRepository = new PostLinkRepository({
        LinkRedirect: models.Redirect,
        linkRedirectRepository: linkRedirection.linkRedirectRepository
    });

    const linkClickRepository = new LinkClickRepository({
        MemberLinkClickEventModel: models.MemberClickEvent,
        Member: models.Member,
        MemberLinkClickEvent,
        DomainEvents: domainEvents
    });

    const service = new LinkClickTrackingService({
        linkRedirectService: linkRedirection.service,
        linkClickRepository,
        postLinkRepository,
        DomainEvents: domainEvents,
        urlUtils
    });

    let initialized = false;

    return {
        service,
        linkClickRepository,
        async init() {
            if (initialized) {
                return;
            }
            initialized = true;
            await service.init();
        }
    };
};
