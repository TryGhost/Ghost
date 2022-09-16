const ObjectID = require('bson-objectid').default;
const DomainEvents = require('@tryghost/domain-events');
const {RedirectEvent} = require('@tryghost/link-redirects');
const logging = require('@tryghost/logging');
const LinkClick = require('./LinkClick');

/**
 * @typedef {object} ILinkClickRepository
 * @prop {(event: LinkClick) => Promise<void>} save
 */

class LinkClickTrackingService {
    #initialised = false;

    /** @type ILinkClickRepository */
    #linkClickRepository;

    /**
     * @param {object} deps
     * @param {ILinkClickRepository} deps.linkClickRepository
     */
    constructor(deps) {
        this.#linkClickRepository = deps.linkClickRepository;
    }

    async init() {
        if (this.#initialised) {
            return;
        }
        this.subscribe();
        this.#initialised = true;
    }

    /**
     * @param {import('@tryghost/link-redirects').LinkRedirect} redirect
     * @param {string} id
     * @return {Promise<URL>}
     */
    async addTrackingToRedirect(redirect, id){
        const trackingUrl = new URL(redirect.from);
        trackingUrl.searchParams.set('m', id);
        return trackingUrl;
    }

    subscribe() {
        DomainEvents.subscribe(RedirectEvent, async (event) => {
            const id = event.data.url.searchParams.get('m');
            if (!id) {
                return;
            }

            let memberId;
            try {
                memberId = ObjectID.createFromHexString(id);
            } catch (err) {
                logging.warn(`Invalid member_id "${id}" found during redirect`);
                return;
            }

            const click = new LinkClick({
                member_id: memberId,
                link_id: event.data.link.link_id
            });
            await this.#linkClickRepository.save(click);
        });
    }
}

module.exports = LinkClickTrackingService;
