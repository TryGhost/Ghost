const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const settingsHelpers = require('../settings-helpers');
const models = require('../../models');

const {MachinePaymentsService, getDefaultTiersCurrency} = require('./service');
const {DepositAddressStore} = require('./stripe/deposit-address-store');
const {PaymentRecorder} = require('./stripe/payment-recorder');
const {MppAdapter} = require('./adapters/mpp-adapter');
const {MachinePaymentEventRepository} = require('./events/machine-payment-event-repository');
const {ContentLoader} = require('./content-loader');
const {Pricing} = require('./pricing');

class MachinePaymentsServiceWrapper {
    /** @type {MachinePaymentsService|null} */
    service = null;

    #initialized = false;

    init() {
        if (this.#initialized) {
            return this.service;
        }

        const depositAddressStore = new DepositAddressStore();
        const paymentRecorder = new PaymentRecorder();
        const eventRepository = new MachinePaymentEventRepository({
            MachinePaymentEventModel: models.MachinePaymentEvent
        });

        const urlService = require('../url');
        const contentLoader = new ContentLoader({
            urlServiceFacade: urlService
        });

        const pricing = new Pricing({
            settingsCache,
            defaultCurrencyProvider: getDefaultTiersCurrency
        });

        const adapters = [
            new MppAdapter({depositAddressStore, settingsCache, pricing})
        ];

        this.service = new MachinePaymentsService({
            settingsCache,
            labsService: labs,
            pricing,
            contentLoader,
            adapters,
            eventRepository,
            paymentRecorder,
            isStripeConnected: () => settingsHelpers.isStripeConnected(),
            defaultCurrencyProvider: getDefaultTiersCurrency
        });

        // Mint Tempo deposit addresses off the request path (Stripe guidance).
        // Only when machine payments is enabled — otherwise every Stripe-connected
        // boot (incl. E2E) would call Stripe. Failures leave SPT-only challenges.
        if (this.service.isEnabled()) {
            const network = config.get('machinePayments:mpp:stripeNetwork') || 'tempo';
            depositAddressStore.getOrCreateAddress({network}).catch((err) => {
                logging.warn(err);
            });
        }

        this.#initialized = true;
        return this.service;
    }

    isEnabled() {
        return this.init().isEnabled();
    }

    isPurchasable(entry) {
        return this.init().isPurchasable(entry);
    }

    async challengeOrFulfill(request, options) {
        return await this.init().challengeOrFulfill(request, options);
    }
}

module.exports = new MachinePaymentsServiceWrapper();
module.exports.MachinePaymentsServiceWrapper = MachinePaymentsServiceWrapper;
