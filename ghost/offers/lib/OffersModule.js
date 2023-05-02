/* eslint-disable max-lines */
// @TODO: Reduce file length and remove the line above

const DomainEvents = require('@tryghost/domain-events');
const OfferCodeChangeEvent = require('./domain/events/OfferCodeChangeEvent');
const OfferCreatedEvent = require('./domain/events/OfferCreatedEvent');
const OfferRepository = require('./application/OfferRepository');
const OffersAPI = require('./application/OffersAPI');

class OffersModule {
    /**
     * @param {OffersAPI} offersAPI
     * @param {import('@tryghost/express-dynamic-redirects')} redirectManager
     * @param {OfferRepository} repository
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
     * @param {any} deps.OfferModel
     * @param {any} deps.OfferRedemptionModel
     *
     * @returns {OffersModule}
     */
    static create(deps) {
        const repository = new OfferRepository(deps.OfferModel, deps.OfferRedemptionModel);
        const offersAPI = new OffersAPI(repository);
        return new OffersModule(offersAPI, deps.redirectManager, repository);
    }

    static events = {
        OfferCreatedEvent,
        OfferCodeChangeEvent
    };

    static OfferRepository = OfferRepository;

    static OffersAPI = OffersAPI;
}

module.exports = OffersModule;
