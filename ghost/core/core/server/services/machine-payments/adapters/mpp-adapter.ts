import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import config from '../../../../shared/config';
import { Pricing, type PaymentAmountTerms } from '../pricing';
import { STRIPE_MACHINE_PAYMENTS_API_VERSION } from '../stripe/deposit-address-store';
import { getMachinePaymentsStripeOptions } from '../stripe/stripe-client-options';
import type { Fulfillment, PaymentAdapter, PaymentTerms } from '../types';

export const TEMPO_USDC = '0x20c000000000000000000000b9537d11c60e8b50';
export const TEMPO_DECIMALS = 6;
const SPT_DECIMALS = 2;

type SettingsCache = {
  get: (key: string) => unknown;
};

const settingsCache = require('../../../../shared/settings-cache') as SettingsCache;

type DepositAddressStoreLike = {
  getOrCreateAddress: (options: { network?: string }) => Promise<string>;
};

type PaymentReceipt = {
  method?: string;
  reference?: string;
  status?: unknown;
  timestamp?: unknown;
};

type MppPaymentResult = {
  status: number;
  challenge?: Response | null;
  withReceipt?: (response: Response) => Response;
};

type MppxModule = {
  Mppx: {
    create: (options: { methods: unknown[]; secretKey: unknown }) => {
      tempo: { charge: (options: unknown) => (request: Request) => Promise<MppPaymentResult> };
      stripe: { charge: (options: unknown) => (request: Request) => Promise<MppPaymentResult> };
      compose: (...entries: unknown[]) => (request: Request) => Promise<MppPaymentResult>;
    };
  };
  tempo: { charge: (config: unknown) => unknown };
  stripe: { charge: (config: unknown) => unknown };
  Store: { memory: () => unknown };
};

type MppAdapterDeps = {
  depositAddressStore: DepositAddressStoreLike;
  settingsCache?: SettingsCache;
  pricing?: Pricing;
  mppxFactory?: () => MppxModule;
  stripeClientFactory?: () => unknown | null;
};

/**
 * MPP adapter (Tempo USDC + Stripe SPT/card).
 * Implements the protocol-agnostic canHandle / challenge / fulfill contract.
 */
export class MppAdapter implements PaymentAdapter {
  depositAddressStore: DepositAddressStoreLike;
  settingsCache: SettingsCache;
  pricing: Pricing;
  mppxFactory?: () => MppxModule;
  stripeClientFactory?: () => unknown | null;
  name: string;

  #mppx: ReturnType<MppxModule['Mppx']['create']> | null = null;
  #mppxKey: string | null = null;
  #replayStore: unknown = null;

  constructor({
    depositAddressStore,
    settingsCache: settings = settingsCache,
    pricing = new Pricing({ settingsCache: settings }),
    mppxFactory,
    stripeClientFactory,
  }: MppAdapterDeps) {
    this.depositAddressStore = depositAddressStore;
    this.settingsCache = settings;
    this.pricing = pricing;
    this.mppxFactory = mppxFactory;
    this.stripeClientFactory = stripeClientFactory;
    this.name = 'mpp';
  }

  canHandle(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    return Boolean(authHeader && /^Payment\s+/i.test(authHeader));
  }

  async challenge(request: Request, terms: PaymentTerms): Promise<Response | null> {
    const payment = await this.#run(request, terms);
    if (payment.status === 402) {
      return payment.challenge ?? null;
    }
    // Unexpected success without credential — treat as challenge unavailable.
    return null;
  }

  async fulfill(request: Request, terms: PaymentTerms): Promise<Fulfillment> {
    const payment = await this.#run(request, terms);
    if (payment.status === 402) {
      throw new errors.NoPermissionError({
        message: 'Payment required',
      });
    }

    if (payment.status !== 200 || typeof payment.withReceipt !== 'function') {
      throw new errors.NoPermissionError({
        message: 'Machine payment credential rejected',
      });
    }

    const wrapped = payment.withReceipt(new Response('', { status: 200 }));
    const receiptHeader = wrapped.headers.get('payment-receipt');
    const receipt = parseReceipt(receiptHeader);
    if (!receipt.reference) {
      throw new errors.InternalServerError({
        message: 'Machine payment succeeded without a stable settlement reference',
      });
    }
    if (typeof receipt.method !== 'string' || !receipt.method) {
      throw new errors.InternalServerError({
        message: 'Machine payment succeeded without a settlement method',
      });
    }

    return {
      protocol: 'mpp',
      method: receipt.method,
      reference: receipt.reference,
      amount: terms.amount,
      currency: terms.currency,
      stripePaymentIntentId: receipt.method === 'stripe' ? receipt.reference : null,
      receiptHeaders: receiptHeader ? { 'payment-receipt': receiptHeader } : {},
    };
  }

  async #run(request: Request, terms: PaymentAmountTerms): Promise<MppPaymentResult> {
    const {
      Mppx,
      tempo,
      stripe: mppStripe,
      Store,
    } = this.mppxFactory ? this.mppxFactory() : (require('mppx/server') as MppxModule);

    const profileId =
      this.settingsCache.get('machine_payments_stripe_profile_id') ||
      config.get('machinePayments:mpp:networkId');
    const stripeClient = this.#getStripeClient();
    const hasStripe = Boolean(stripeClient && profileId);

    let recipient: string | null = null;
    try {
      recipient = await this.depositAddressStore.getOrCreateAddress({
        network: config.get('machinePayments:mpp:stripeNetwork') || 'tempo',
      });
    } catch (err) {
      logging.warn(err);
    }
    const hasTempo = Boolean(recipient);

    if (!hasTempo && !hasStripe) {
      throw new errors.InternalServerError({
        message: 'Machine payment challenges are temporarily unavailable',
      });
    }

    if (!this.#replayStore) {
      this.#replayStore = Store.memory();
    }

    const secretKey = this.#getSecretKey();
    const tempoCurrency = config.get('machinePayments:mpp:tempoCurrency') || TEMPO_USDC;
    const testnet = config.get('machinePayments:mpp:testnet') === true;
    const key = `${secretKey}:${recipient || ''}:${hasStripe ? profileId : ''}:${tempoCurrency}:${testnet}`;

    if (!this.#mppx || this.#mppxKey !== key) {
      const methods: unknown[] = [];
      if (hasTempo) {
        methods.push(
          tempo.charge({
            currency: tempoCurrency,
            recipient,
            testnet,
            decimals: TEMPO_DECIMALS,
            store: this.#replayStore,
          }),
        );
      }
      if (hasStripe) {
        methods.push(
          mppStripe.charge({
            client: stripeClient,
            networkId: profileId,
            paymentMethodTypes: ['card', 'link'],
            decimals: SPT_DECIMALS,
          }),
        );
      }
      this.#mppx = Mppx.create({ methods, secretKey });
      this.#mppxKey = key;
    }

    const scope = new URL(request.url).pathname;
    const tempoCharge = hasTempo
      ? { amount: this.pricing.forTempoUsdc(terms).majorAmount, recipient, scope }
      : null;
    const sptTerms = hasStripe ? this.pricing.forSpt(terms) : null;
    const stripeCharge = sptTerms
      ? { amount: sptTerms.majorAmount, currency: sptTerms.currency, scope }
      : null;

    if (tempoCharge && stripeCharge) {
      return await this.#mppx.compose(
        ['tempo/charge', tempoCharge],
        ['stripe/charge', stripeCharge],
      )(request);
    }

    if (stripeCharge) {
      return await this.#mppx.stripe.charge(stripeCharge)(request);
    }

    return await this.#mppx.tempo.charge(tempoCharge)(request);
  }

  #getSecretKey() {
    return (
      config.get('machinePayments:mpp:secretKey') ||
      this.settingsCache.get('machine_payments_secret')
    );
  }

  #getStripeClient(): unknown | null {
    if (this.stripeClientFactory) {
      return this.stripeClientFactory();
    }

    try {
      const settingsHelpers = require('../../settings-helpers') as {
        getActiveStripeKeys: () => { secretKey?: string } | null | undefined;
      };
      const keys = settingsHelpers.getActiveStripeKeys();
      if (!keys?.secretKey) {
        return null;
      }
      const { Stripe } = require('stripe') as typeof import('stripe');
      return new Stripe(keys.secretKey, {
        ...getMachinePaymentsStripeOptions(STRIPE_MACHINE_PAYMENTS_API_VERSION),
      } as never);
    } catch {
      return null;
    }
  }
}

/**
 * mppx serializes Payment-Receipt as unpadded base64url JSON
 * `{method, reference, status, timestamp}`.
 */
export function parseReceipt(header: string | null): PaymentReceipt {
  if (!header) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    return parsed && typeof parsed === 'object' ? (parsed as PaymentReceipt) : {};
  } catch {
    return {};
  }
}
