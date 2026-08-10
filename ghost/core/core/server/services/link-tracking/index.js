const LinkClickRepository = require('./link-click-repository');
const PostLinkRepository = require('./post-link-repository');
const errors = require('@tryghost/errors');
const urlUtils = require('../../../shared/url-utils').default;

class LinkTrackingServiceWrapper {
    #initPromise;
    #automationsApi;

    constructor({
        automationsApi = require('../automations/automations-api')
    } = {}) {
        this.#automationsApi = automationsApi;
    }

    async init() {
        if (this.service) {
            // Already done
            return;
        }

        if (!this.#initPromise) {
            this.#initPromise = this.#initialise();
        }

        const initPromise = this.#initPromise;
        try {
            await initPromise;
        } catch (error) {
            if (this.#initPromise === initPromise) {
                this.#initPromise = undefined;
            }
            throw error;
        }
    }

    async #initialise() {
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

        const linkClickRepository = new LinkClickRepository({
            MemberLinkClickEventModel: models.MemberClickEvent,
            Member: models.Member,
            MemberLinkClickEvent: MemberLinkClickEvent,
            DomainEvents
        });

        const service = new LinkClickTrackingService({
            linkRedirectService: linkRedirection.service,
            linkClickRepository,
            postLinkRepository,
            DomainEvents,
            urlUtils,
            automationsApi: this.#automationsApi,
            runInTransaction: callback => models.Base.transaction(callback)
        });

        await service.init();

        // Expose the service only after it has finished initialising
        this.linkClickRepository = linkClickRepository;
        this.service = service;
    }
}

module.exports = new LinkTrackingServiceWrapper();
// Exposed for testing purposes only
module.exports.LinkTrackingServiceWrapper = LinkTrackingServiceWrapper;
