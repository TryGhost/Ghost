// @TODO: Reduce file length and remove the line above

const DomainEvents = require('@tryghost/domain-events');
const OfferCodeChangeEvent = require('./domain/events/offer-code-change-event');
const OfferCreatedEvent = require('./domain/events/offer-created-event');
const Offer = require('./domain/models/offer');
const OffersAPI = require('./application/offers-api');

class OffersModule {
    /**
     * @param {OffersAPI} offersAPI
     * @param {import('@tryghost/express-dynamic-redirects')} redirectManager
     * @param {any} repository
     */
    constructor(offersAPI, redirectManager, repository) {
        this.api = offersAPI;
        this.repository = repository;
        this.redirectManager = redirectManager;
    }

    /**
     * @returns {Promise<void>}
     */
    async init() {
        DomainEvents.subscribe(OfferCodeChangeEvent, (event) => {
            if (event.data.previousCode) {
                this.redirectManager.removeRedirect(`/${event.data.previousCode.value}`);
            }
            this.redirectManager.addRedirect(
                `/${event.data.currentCode.value}`,
                `/#/portal/offers/${event.data.offerId}`,
                {permanent: false}
            );
        });

        DomainEvents.subscribe(OfferCreatedEvent, (event) => {
            this.redirectManager.addRedirect(
                `/${event.data.offer.code.value}`,
                `/#/portal/offers/${event.data.offer.id}`,
                {permanent: false}
            );
        });

        const offers = await this.repository.getAll();

        for (const offer of offers) {
            this.redirectManager.addRedirect(
                `/${offer.code.value}`,
                `/#/portal/offers/${offer.id}`,
                {permanent: false}
            );
        }
    }

    /**
     * @param {object} deps
     * @param {import('@tryghost/express-dynamic-redirects')} deps.redirectManager
     * @param {any} deps.repository
     *
     * @returns {OffersModule}
     */
    static create(deps) {
        const offersAPI = new OffersAPI(deps.repository);
        return new OffersModule(offersAPI, deps.redirectManager, deps.repository);
    }

    static events = {
        OfferCreatedEvent,
        OfferCodeChangeEvent
    };

    static Offer = Offer;

    static OffersAPI = OffersAPI;
}

module.exports = OffersModule;
