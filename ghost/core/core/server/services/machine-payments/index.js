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
const {X402Adapter} = require('./adapters/x402-adapter');
const {MachinePaymentEventRepository} = require('./events/machine-payment-event-repository');
const {ContentLoader} = require('./content-loader');
const {Pricing} = require('./pricing');

class MachinePaymentsServiceWrapper {
    /** @type {MachinePaymentsService|null} */
    service = null;

    #initialized = false;
    /** @type {Promise<MachinePaymentsService>|null} */
    #initPromise = null;

    init() {
        if (this.#initialized) {
            return Promise.resolve(this.service);
        }

        if (!this.#initPromise) {
            this.#initPromise = this.#doInit();
        }

        return this.#initPromise;
    }

    async #doInit() {
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

        const x402Adapter = new X402Adapter({depositAddressStore});
        if (await x402Adapter.init()) {
            adapters.push(x402Adapter);
        }

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

        // Mint deposit addresses off the request path (Stripe guidance).
        // Only when machine payments is enabled — otherwise every Stripe-connected
        // boot (incl. E2E) would call Stripe. Failures leave SPT-only challenges.
        if (this.service.isEnabled()) {
            const tempoNetwork = config.get('machinePayments:mpp:stripeNetwork') || 'tempo';
            const x402Network = config.get('machinePayments:x402:stripeNetwork') || 'base';

            const prewarmResults = await Promise.allSettled([
                depositAddressStore.getOrCreateAddress({network: tempoNetwork}),
                depositAddressStore.getOrCreateAddress({network: x402Network})
            ]);

            for (const result of prewarmResults) {
                if (result.status === 'rejected') {
                    logging.warn(result.reason);
                }
            }
        }

        this.#initialized = true;
        return this.service;
    }

    isEnabled() {
        if (!this.#initialized || !this.service) {
            return false;
        }

        return this.service.isEnabled();
    }

    isPurchasable(entry) {
        if (!this.#initialized || !this.service) {
            return false;
        }

        return this.service.isPurchasable(entry);
    }

    async challengeOrFulfill(request, options) {
        const service = await this.init();
        return await service.challengeOrFulfill(request, options);
    }
}

module.exports = new MachinePaymentsServiceWrapper();
module.exports.MachinePaymentsServiceWrapper = MachinePaymentsServiceWrapper;
