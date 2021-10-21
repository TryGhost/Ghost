const labs = require('../../../shared/labs');
const events = require('../../lib/common/events');

const DynamicRedirectManager = require('@tryghost/express-dynamic-redirects');
const OffersModule = require('@tryghost/members-offers');

const stripeService = require('../stripe');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../models');

const redirectManager = new DynamicRedirectManager({
    permanentMaxAge: config.get('caching:customRedirects:maxAge'),
    getSubdirectoryURL: (pathname) => {
        return urlUtils.urlJoin(urlUtils.getSubdir(), pathname);
    }
});

module.exports = {
    async init() {
        const offersModule = OffersModule.create({
            OfferModel: models.Offer,
            OfferRedemptionModel: models.OfferRedemption,
            redirectManager: redirectManager,
            stripeAPIService: stripeService.api
        });

        this.api = offersModule.api;

        let initCalled = false;
        if (labs.isSet('offers')) {
            // handles setting up redirects
            const promise = offersModule.init();
            initCalled = true;
            await promise;
        }

        // TODO: Delete after GA
        let offersEnabled = labs.isSet('offers');
        events.on('settings.labs.edited', async () => {
            if (labs.isSet('offers') && !initCalled) {
                const promise = offersModule.init();
                initCalled = true;
                await promise;
            } else if (labs.isSet('offers') !== offersEnabled) {
                offersEnabled = labs.isSet('offers');

                if (offersEnabled) {
                    const offers = await this.api.listOffers({});
                    for (const offer of offers) {
                        redirectManager.addRedirect(`/${offer.code}`, `/#/portal/offers/${offer.id}`, {permanent: false});
                    }
                } else {
                    redirectManager.removeAllRedirects();
                }
            }
        });
    },

    api: null,

    middleware: redirectManager.handleRequest
};
