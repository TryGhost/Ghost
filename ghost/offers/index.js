const DomainEvents = require('@tryghost/domain-events');
const OfferCodeChangeEvent = require('./lib/events/OfferCodeChange');
const OfferRepository = require('./lib/OfferRepository');
const OffersAPI = require('./lib/OffersAPI');

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
            if (event.data.previousCodes) {
                for (const previousCode of event.data.previousCodes) {
                    this.redirectManager.removeRedirect(`/${previousCode}`);
                }
            }
            this.redirectManager.addRedirect(
                `/${event.data.currentCode}`,
                `/#/portal/offers/${event.data.offerId}`,
                {permanent: false}
            );
        });

        const offers = await this.api.listOffers();

        for (const offer of offers) {
            this.redirectManager.addRedirect(
                `/${offer.code}`,
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
