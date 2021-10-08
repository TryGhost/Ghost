const DomainEvents = require('@tryghost/domain-events');
const OfferCodeChangeEvent = require('./lib/domain/events/OfferCodeChange');
const OfferRepository = require('./lib/application/OfferRepository');
const OffersAPI = require('./lib/application/OffersAPI');

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
     * @param {import('@tryghost/members-stripe-service')} deps.stripeAPIService
     * @param {any} deps.OfferModel
     *
     * @returns {OffersModule}
     */
    static create(deps) {
        const repository = new OfferRepository(deps.OfferModel, deps.stripeAPIService);
        const offersAPI = new OffersAPI(repository);
        return new OffersModule(offersAPI, deps.redirectManager, repository);
    }
}

module.exports = OffersModule;
