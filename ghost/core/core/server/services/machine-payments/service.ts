/**
 * Protocol-agnostic machine payments orchestrator.
 *
 * Adapters implement canHandle / challenge / fulfill. Membership and content
 * gating stay outside this service — we only authorize emitting markdown bytes.
 */

import logging from '@tryghost/logging';
import { Pricing } from './pricing';
import { isPurchasableEntry, isMachinePaymentsEnabled } from './eligibility';
import { ContentLoader } from './content-loader';
import type { Fulfillment, PaymentAdapter, PaymentTerms } from './types';

export type { Fulfillment, PaymentAdapter, PaymentTerms } from './types';

export const PAID_MARKDOWN_CACHE_CONTROL = 'private, no-store';

type SettingsCache = {
  get: (key: string) => unknown;
};

type LabsService = {
  isSet: (flag: string) => boolean;
};

const settingsCache = require('../../../shared/settings-cache') as SettingsCache;
const labs = require('../../../shared/labs') as LabsService;

type EventRepository = {
  save: (data: {
    postId: string;
    amount: number;
    currency: string;
    protocol: string;
    method: string;
    stripePaymentIntentId?: string | null;
    reference: string;
  }) => Promise<{ created?: boolean; event?: unknown } | null | undefined>;
};

type PaymentRecorderLike = {
  record: (payment: Record<string, unknown>) => Promise<string | null | undefined>;
};

type ChallengeOrFulfillOptions = {
  entryId: string;
  resourceType: 'posts' | 'pages';
  description?: string;
  renderMarkdown: (entry: Record<string, unknown>) => string;
  contentLocation: string;
};

type MachinePaymentsServiceDeps = {
  settingsCache?: SettingsCache;
  labsService?: LabsService;
  pricing?: Pricing;
  contentLoader?: ContentLoader & { isPurchasable?: ContentLoader['isPurchasable'] };
  adapters?: PaymentAdapter[];
  eventRepository?: EventRepository | null;
  paymentRecorder?: PaymentRecorderLike | null;
  isStripeConnected?: () => boolean;
  defaultCurrencyProvider?: () => Promise<string | null>;
};

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

type PaymentCredentialError = {
  statusCode?: number;
};

export class MachinePaymentsService {
  settingsCache: SettingsCache;
  labs: LabsService;
  pricing: Pricing;
  contentLoader: ContentLoader & { isPurchasable?: ContentLoader['isPurchasable'] };
  adapters: PaymentAdapter[];
  eventRepository: EventRepository | null;
  paymentRecorder: PaymentRecorderLike | null;
  isStripeConnected: () => boolean;
  defaultCurrencyProvider: () => Promise<string | null>;

  constructor({
    settingsCache: settings = settingsCache,
    labsService = labs,
    pricing,
    contentLoader = new ContentLoader(),
    adapters = [],
    eventRepository = null,
    paymentRecorder = null,
    isStripeConnected = () => false,
    defaultCurrencyProvider = getDefaultTiersCurrency,
  }: MachinePaymentsServiceDeps = {}) {
    this.settingsCache = settings;
    this.labs = labsService;
    this.pricing = pricing || new Pricing({ settingsCache: settings, defaultCurrencyProvider });
    this.contentLoader = contentLoader;
    this.adapters = adapters;
    this.eventRepository = eventRepository;
    this.paymentRecorder = paymentRecorder;
    this.isStripeConnected = isStripeConnected;
    this.defaultCurrencyProvider = defaultCurrencyProvider;
  }

  isEnabled(): boolean {
    return isMachinePaymentsEnabled({
      labs: this.labs,
      settingsCache: this.settingsCache,
      isStripeConnected: this.isStripeConnected,
    });
  }

  isPurchasable(entry: { visibility?: string; tiers?: Array<{ type?: string }> }): boolean {
    return this.isEnabled() && isPurchasableEntry(entry);
  }

  async getTerms({
    url,
    description,
    method = 'GET',
    mimeType = 'text/markdown',
  }: {
    url: string;
    description?: string;
    method?: string;
    mimeType?: string;
  }): Promise<PaymentTerms> {
    const { amount, currency } = await this.pricing.getTerms();
    return {
      amount,
      currency,
      description: description || safePathname(url),
      method,
      mimeType,
      url,
    };
  }

  /**
   * Challenge or fulfill a paid markdown request.
   * Does not load full HTML until payment fulfills successfully.
   */
  async challengeOrFulfill(
    request: Request,
    options: ChallengeOrFulfillOptions,
  ): Promise<Response> {
    if (!this.isEnabled()) {
      return this.#problemResponse({
        type: 'https://paymentauth.org/problems/payment-unavailable',
        title: 'Machine payments unavailable',
        status: 404,
        detail: 'Machine payments are not enabled.',
      });
    }

    if (!this.adapters.length) {
      return this.#problemResponse({
        type: 'https://paymentauth.org/problems/payment-unavailable',
        title: 'Machine payment challenges unavailable',
        status: 503,
        detail: 'Machine payment challenges are temporarily unavailable.',
      });
    }

    // Check raw model eligibility before challenging or charging. Content API
    // serialization strips free tiers, which would otherwise 402 a mixed post
    // and 403 after settlement.
    if (typeof this.contentLoader.isPurchasable === 'function') {
      const purchasable = await this.contentLoader.isPurchasable(
        options.resourceType,
        options.entryId,
      );
      if (!purchasable) {
        return this.#problemResponse({
          type: 'https://paymentauth.org/problems/payment-forbidden',
          title: 'Content unavailable',
          status: 403,
          detail: 'This content is not available for machine payment.',
        });
      }
    }

    const terms = await this.getTerms({
      url: request.url,
      description: options.description,
    });

    const credentialed = this.adapters.find((adapter) => adapter.canHandle(request));

    if (credentialed) {
      return await this.#handleFulfill(credentialed, request, terms, options);
    }

    return await this.#paymentRequiredResponse(request, terms);
  }

  async #handleFulfill(
    adapter: PaymentAdapter,
    request: Request,
    terms: PaymentTerms,
    options: ChallengeOrFulfillOptions,
  ): Promise<Response> {
    // Confirm we can deliver before settling. Charging first then failing the
    // load burns the agent’s money and (with a ledger write) their credential.
    const entry = await this.contentLoader.loadFullEntry(options.resourceType, options.entryId);
    if (!entry) {
      return this.#problemResponse({
        type: 'https://paymentauth.org/problems/payment-forbidden',
        title: 'Content unavailable',
        status: 403,
        detail: 'This content is not available for machine payment.',
      });
    }

    let fulfillment: Fulfillment;
    try {
      fulfillment = await adapter.fulfill(request, terms);
    } catch (err) {
      return this.#paymentCredentialErrorResponse(err);
    }

    // Ledger next: Stripe idempotency keys can expire (~24h), so a durable
    // protocol+reference check must gate PaymentIntent creation on replay.
    if (this.eventRepository) {
      let saved: { created?: boolean; event?: unknown } | null | undefined;
      try {
        saved = await this.eventRepository.save({
          postId: options.entryId,
          amount: fulfillment.amount ?? terms.amount,
          currency: fulfillment.currency ?? terms.currency,
          protocol: fulfillment.protocol || 'mpp',
          method: fulfillment.method,
          stripePaymentIntentId: fulfillment.stripePaymentIntentId || null,
          reference: fulfillment.reference,
        });
      } catch (err) {
        logging.warn(err);
        return this.#problemResponse({
          type: 'https://paymentauth.org/problems/payment-unavailable',
          title: 'Machine payment temporarily unavailable',
          status: 503,
          detail: 'Machine payment verification is temporarily unavailable.',
        });
      }

      if (saved && saved.created === false) {
        return this.#problemResponse({
          type: 'https://paymentauth.org/problems/payment-forbidden',
          title: 'Payment credential already used',
          status: 403,
          detail: 'This machine payment credential has already been used.',
        });
      }
    }

    if (this.paymentRecorder) {
      try {
        const stripePaymentIntentId = await this.paymentRecorder.record({
          ...fulfillment,
          postId: options.entryId,
          amount: terms.amount,
          currency: terms.currency,
        });
        if (stripePaymentIntentId) {
          fulfillment.stripePaymentIntentId = stripePaymentIntentId;
        }
      } catch (err) {
        logging.warn(err);
      }
    }

    const body = options.renderMarkdown(entry);
    const headers = new Headers({
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': PAID_MARKDOWN_CACHE_CONTROL,
      'Content-Location': options.contentLocation,
    });

    if (fulfillment.receiptHeaders) {
      Object.entries(fulfillment.receiptHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
    }

    return new Response(body, { status: 200, headers });
  }

  async #paymentRequiredResponse(request: Request, terms: PaymentTerms): Promise<Response> {
    const results = await Promise.allSettled(
      this.adapters.map((adapter) => adapter.challenge(request, terms)),
    );

    const challenges = results
      .filter(
        (result): result is PromiseFulfilledResult<Response> =>
          result.status === 'fulfilled' && Boolean(result.value),
      )
      .map((result) => result.value);

    if (!challenges.length) {
      return this.#problemResponse({
        type: 'https://paymentauth.org/problems/payment-unavailable',
        title: 'Machine payment challenges unavailable',
        status: 503,
        detail: 'Machine payment challenges are temporarily unavailable.',
      });
    }

    const headers = new Headers({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/problem+json',
    });

    for (const challenge of challenges) {
      if (challenge.headers) {
        challenge.headers.forEach((value, key) => {
          // Preserve every WWW-Authenticate (mpp compose can emit several)
          // and keep distinct payment challenge headers.
          if (key.toLowerCase() === 'www-authenticate') {
            headers.append(key, value);
          } else if (!headers.has(key)) {
            headers.set(key, value);
          }
        });
      }
    }

    return new Response(
      JSON.stringify({
        type: 'https://paymentauth.org/problems/payment-required',
        title: 'Payment Required',
        status: 402,
        detail: 'Payment is required to access this markdown content.',
      }),
      {
        status: 402,
        headers,
      },
    );
  }

  #paymentCredentialErrorResponse(err: unknown): Response {
    if ((err as PaymentCredentialError)?.statusCode === 403) {
      return this.#problemResponse({
        type: 'https://paymentauth.org/problems/payment-forbidden',
        title: 'Payment credential rejected',
        status: 403,
        detail: 'The supplied machine payment credential could not be validated.',
      });
    }

    logging.warn(err);

    return this.#problemResponse({
      type: 'https://paymentauth.org/problems/payment-unavailable',
      title: 'Machine payment temporarily unavailable',
      status: 503,
      detail: 'Machine payment verification is temporarily unavailable.',
    });
  }

  #problemResponse({ type, title, status, detail }: ProblemDetails): Response {
    return new Response(JSON.stringify({ type, title, status, detail }), {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/problem+json',
      },
    });
  }
}

export async function getDefaultTiersCurrency(): Promise<string | null> {
  const models = require('../../models') as {
    Product: {
      findPage: (options: Record<string, unknown>) => Promise<{
        data?: Array<{ toJSON?: () => { currency?: string }; currency?: string }>;
      }>;
    };
  };
  const page = await models.Product.findPage({
    filter: 'type:paid+active:true',
    limit: 1,
    order: 'monthly_price asc',
  });
  const tier = page.data?.[0]?.toJSON?.() || page.data?.[0];
  return tier?.currency || null;
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
