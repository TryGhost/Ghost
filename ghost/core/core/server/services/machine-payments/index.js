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

        // x402 is registered as a second rail; agents that don't speak it ignore it.
        adapters.push(new X402Adapter({depositAddressStore}));

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
            const tempoNetwork = config.get('machinePayments:mpp:stripeNetwork') || 'tempo';
            depositAddressStore.getOrCreateAddress({network: tempoNetwork}).catch((err) => {
                logging.warn(err);
            });

            const x402Network = config.get('machinePayments:x402:stripeNetwork') || 'base';
            depositAddressStore.getOrCreateAddress({network: x402Network}).catch((err) => {
                logging.warn(err);
            });

            const x402CaipNetwork = config.get('machinePayments:x402:network') || 'eip155:8453';
            const x402FacilitatorUrl = config.get('machinePayments:x402:facilitatorUrl');
            const x402OrgFacilitator = 'https://x402.org/facilitator';
            if (x402CaipNetwork === 'eip155:8453' && (!x402FacilitatorUrl || x402FacilitatorUrl === x402OrgFacilitator)) {
                logging.warn(
                    'x402 is configured for Base mainnet but the facilitator URL is missing or set to the x402.org '
                    + 'testnet facilitator. Use the default xpay facilitator or another mainnet provider. '
                    + 'For local testing, override machinePayments.x402.network to eip155:84532 in config.'
                );
            }
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
