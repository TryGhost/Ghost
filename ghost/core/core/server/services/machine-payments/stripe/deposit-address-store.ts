import errors from '@tryghost/errors';
import {Stripe} from 'stripe';
import {getMachinePaymentsStripeOptions} from './stripe-client-options';

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

type DepositAddress = {
    address?: string;
};

type StripeDepositAddressClient = {
    crypto?: {
        depositAddresses?: {
            create: (params: {network: string}) => Promise<DepositAddress | null | undefined>;
        };
    };
    /**
     * stripe@8 has no crypto namespace; we attach a StripeResource-backed helper
     * that POSTs /v1/crypto/deposit_addresses with the preview API version.
     */
    createCryptoDepositAddress?: (params: {network: string}) => Promise<DepositAddress | null | undefined>;
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
 * Build a client that can mint crypto deposit addresses on stripe@8, which
 * lacks the typed `crypto.depositAddresses` namespace.
 */
export function createStripeDepositAddressClient(secretKey: string): StripeDepositAddressClient {
    const stripe = new Stripe(secretKey, {
        // Preview crypto APIs are not yet in the published Stripe types.
        ...getMachinePaymentsStripeOptions(STRIPE_MACHINE_PAYMENTS_API_VERSION)
    } as never);

    const DepositAddresses = Stripe.StripeResource.extend({
        path: 'crypto/deposit_addresses',
        includeBasic: ['create']
    });
    const depositAddresses = new DepositAddresses(stripe) as unknown as {
        create: (params: {network: string}) => Promise<DepositAddress | null | undefined>;
    };

    return {
        crypto: (stripe as unknown as StripeDepositAddressClient).crypto,
        createCryptoDepositAddress: params => depositAddresses.create(params)
    };
}

/**
 * Durable per-network deposit-address store.
 * Persists a JSON map of network → address in settings so per-network deposit
 * addresses cannot share a single chain address.
 *
 * Stripe's machine-payments docs recommend minting deposit addresses off the
 * request path via POST /v1/crypto/deposit_addresses — never by confirming a
 * PaymentIntent from an anonymous GET.
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
        stripeFactory = createStripeDepositAddressClient,
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

        let depositAddress: DepositAddress | null | undefined;
        if (typeof stripe.crypto?.depositAddresses?.create === 'function') {
            depositAddress = await stripe.crypto.depositAddresses.create({network});
        } else if (typeof stripe.createCryptoDepositAddress === 'function') {
            depositAddress = await stripe.createCryptoDepositAddress({network});
        } else {
            throw new errors.InternalServerError({
                message: 'Stripe crypto deposit address API is unavailable'
            });
        }

        const address = depositAddress?.address;
        if (!address) {
            throw new errors.InternalServerError({
                message: 'Stripe did not return a crypto deposit address'
            });
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
