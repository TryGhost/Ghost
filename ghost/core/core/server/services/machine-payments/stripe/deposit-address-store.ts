import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {Stripe} from 'stripe';

// Preview API required for crypto deposit addresses / machine payments.
export const STRIPE_MACHINE_PAYMENTS_API_VERSION = '2026-05-27.preview';
const DEPOSIT_ADDRESS_SETTING = 'machine_payments_deposit_address';

type SettingsCacheFacade = {
    get: (key: string) => unknown;
};

type SettingsHelpersFacade = {
    getActiveStripeKeys: () => {secretKey?: string} | null | undefined;
};

type SettingsModel = {
    edit: (settings: Array<{key: string; value: string}>, options?: Record<string, unknown>) => Promise<unknown>;
};

type StripeDepositAddressClient = {
    crypto?: {
        depositAddresses?: {
            create: (params: {network: string}) => Promise<{address?: string} | null | undefined>;
        };
    };
    paymentIntents: {
        create: (params: Record<string, unknown>) => Promise<{
            id: string;
            next_action?: {
                crypto_display_details?: {
                    deposit_addresses?: Record<string, {address?: string} | undefined>;
                };
            };
        }>;
        cancel?: (id: string) => Promise<unknown>;
    };
};

type DepositAddressStoreDeps = {
    stripeFactory?: (secretKey: string) => StripeDepositAddressClient;
    settingsHelpersFacade?: SettingsHelpersFacade;
    settingsCacheFacade?: SettingsCacheFacade;
    settingsModel?: SettingsModel;
};

const settingsHelpers = require('../../settings-helpers') as SettingsHelpersFacade;
const settingsCache = require('../../../../shared/settings-cache') as SettingsCacheFacade;

/**
 * Durable per-network deposit-address store.
 * Persists a JSON map of network → address in settings so per-network deposit
 * addresses cannot share a single chain address.
 */
export class DepositAddressStore {
    stripeFactory: (secretKey: string) => StripeDepositAddressClient;
    settingsHelpers: SettingsHelpersFacade;
    settingsCache: SettingsCacheFacade;
    _settingsModel: SettingsModel | undefined;
    stripe: StripeDepositAddressClient | null;
    stripeSecretKey: string | null;

    #addresses: Record<string, string> = {};
    #inflight = new Map<string, Promise<string>>();

    constructor({
        stripeFactory = secretKey => new Stripe(secretKey, {
            // Preview crypto APIs are not yet in the published Stripe types.
            apiVersion: STRIPE_MACHINE_PAYMENTS_API_VERSION as never
        }) as unknown as StripeDepositAddressClient,
        settingsHelpersFacade = settingsHelpers,
        settingsCacheFacade = settingsCache,
        settingsModel
    }: DepositAddressStoreDeps = {}) {
        this.stripeFactory = stripeFactory;
        this.settingsHelpers = settingsHelpersFacade;
        this.settingsCache = settingsCacheFacade;
        this._settingsModel = settingsModel;
        this.stripe = null;
        this.stripeSecretKey = null;
    }

    get settingsModel(): SettingsModel {
        if (!this._settingsModel) {
            this._settingsModel = require('../../../models').Settings as SettingsModel;
        }
        return this._settingsModel;
    }

    async getOrCreateAddress({network = 'tempo'}: {network?: string} = {}): Promise<string> {
        const cached = this.#addresses[network] || this.#readMap()[network];
        if (cached) {
            this.#addresses[network] = cached;
            return cached;
        }

        const inflight = this.#inflight.get(network);
        if (inflight) {
            return await inflight;
        }

        const pending = this.#createAndPersist({network})
            .finally(() => {
                this.#inflight.delete(network);
            });
        this.#inflight.set(network, pending);

        return await pending;
    }

    async #createAndPersist({network}: {network: string}): Promise<string> {
        const stripe = this.#getStripe();

        // Prefer the dedicated deposit address API when available.
        if (stripe.crypto?.depositAddresses?.create) {
            try {
                const depositAddress = await stripe.crypto.depositAddresses.create({network});
                const address = depositAddress?.address;
                if (address) {
                    await this.#persist(network, address);
                    return address;
                }
            } catch (err) {
                logging.warn(err);
            }
        }

        return await this.#createViaPaymentIntent({network, stripe});
    }

    async #createViaPaymentIntent({network, stripe}: {network: string; stripe: StripeDepositAddressClient}): Promise<string> {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: 100,
            currency: 'usd',
            payment_method_types: ['crypto'],
            payment_method_data: {type: 'crypto'},
            payment_method_options: {
                crypto: {
                    mode: 'deposit',
                    deposit_options: {networks: [network]}
                }
            },
            confirm: true
        });

        const depositDetails = paymentIntent.next_action?.crypto_display_details;
        const address = depositDetails?.deposit_addresses?.[network]?.address;

        if (!address) {
            throw new errors.InternalServerError({
                message: 'PaymentIntent did not return expected crypto deposit details'
            });
        }

        try {
            // The deposit-mode PaymentIntent is only used to mint an address.
            // Cancel it so it does not linger as requires_action in Dashboard.
            if (typeof stripe.paymentIntents.cancel === 'function') {
                await stripe.paymentIntents.cancel(paymentIntent.id);
            }
        } catch (err) {
            logging.warn(err);
        }

        await this.#persist(network, address);
        return address;
    }

    #readMap(): Record<string, string> {
        const raw = this.settingsCache.get(DEPOSIT_ADDRESS_SETTING);
        if (!raw) {
            return {};
        }

        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return raw as Record<string, string>;
        }

        if (typeof raw === 'string') {
            try {
                const parsed: unknown = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    return parsed as Record<string, string>;
                }
            } catch {
                // Legacy single-address string — treat as Tempo-only.
            }

            return {tempo: raw};
        }

        return {};
    }

    async #persist(network: string, address: string) {
        this.#addresses[network] = address;
        const map = {
            ...this.#readMap(),
            ...this.#addresses,
            [network]: address
        };

        await this.settingsModel.edit([{
            key: DEPOSIT_ADDRESS_SETTING,
            value: JSON.stringify(map)
        }], {context: {internal: true}});
    }

    #getStripe(): StripeDepositAddressClient {
        const keys = this.settingsHelpers.getActiveStripeKeys();
        const secretKey = keys?.secretKey;

        if (!secretKey) {
            throw new errors.IncorrectUsageError({
                message: 'Stripe secret key is required for machine payments'
            });
        }

        if (this.stripe && this.stripeSecretKey === secretKey) {
            return this.stripe;
        }

        this.stripeSecretKey = secretKey;
        this.stripe = this.stripeFactory(secretKey);
        return this.stripe;
    }
}
