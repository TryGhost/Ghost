import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import config from '../../../../shared/config';
import type { Fulfillment, PaymentAdapter, PaymentTerms } from '../types';
import { BoundedRouteCache, formatPrice, settlementReference } from './x402-adapter';

/**
 * Casper x402 adapter. A third rail behind the same canHandle/challenge/fulfill
 * boundary, speaking the x402 `exact` scheme on the Casper Network.
 *
 * It is a sibling of the EVM/Base rail in `x402-adapter.ts` rather than an
 * extension of it, because Casper settlement differs in three ways that cannot
 * be expressed as configuration of the EVM rail:
 *
 * 1. `payTo` cannot come from the Stripe `DepositAddressStore` — Stripe mints no
 *    Casper deposit addresses. The Casper rail therefore takes an explicit,
 *    publisher-configured `payTo` Casper address and takes no deposit address
 *    store dependency at all.
 * 2. The scheme server is `ExactCasperScheme` from
 *    `@make-software/casper-x402/exact/server`, and settlement happens in wCSPR,
 *    a CEP-18 token, via `transfer_with_authorization` authorized by EIP-712
 *    typed-data signatures. The asset identifier is a CEP-18 contract package
 *    hash (64 hex chars), not an `0x` EVM contract address, so `accepts` carries
 *    an explicit `asset` alongside scheme/price/network/payTo.
 * 3. `Fulfillment.method` is `casper`, because Casper is not a Stripe crypto
 *    network. The `protocol` stays `x402`.
 *
 * The rail is off by default and disables itself (init resolves false, warning
 * logged) on any invalid config or missing runtime module — the EVM x402 and MPP
 * rails are unaffected either way.
 */

const CASPER_ROUTE_CACHE_LIMIT = 128;
const CASPER_MAINNET = 'casper:casper';
const CASPER_TESTNET = 'casper:casper-test';
const DEFAULT_CASPER_FACILITATOR_URL = 'https://x402-facilitator.cspr.cloud';

const casperConfigSchema = z
  .object({
    enabled: z.boolean(),
    network: z.string().regex(/^casper:[a-z0-9-]+$/, {
      message: 'machinePayments.casper.network must be a CAIP-2 Casper network (casper:<chainName>)',
    }),
    facilitatorUrl: z.string().url({
      message: 'machinePayments.casper.facilitatorUrl must be a valid URL',
    }),
    payTo: z.string().min(1, {
      message: 'machinePayments.casper.payTo must be a Casper address',
    }),
    asset: z.string().regex(/^[0-9a-fA-F]{64}$/, {
      message:
        'machinePayments.casper.asset must be a 64-character CEP-18 contract package hash (wCSPR)',
    }),
  })
  .superRefine((value, ctx) => {
    if (![CASPER_MAINNET, CASPER_TESTNET].includes(value.network)) {
      ctx.addIssue({
        code: 'custom',
        message: `machinePayments.casper.network must be ${CASPER_MAINNET} or ${CASPER_TESTNET}`,
      });
    }

    let parsedFacilitatorUrl: URL;
    try {
      parsedFacilitatorUrl = new URL(value.facilitatorUrl);
    } catch {
      return;
    }

    if (parsedFacilitatorUrl.protocol !== 'https:') {
      ctx.addIssue({
        code: 'custom',
        message: 'machinePayments.casper.facilitatorUrl must use HTTPS',
      });
    }
  });

export type CasperX402Config = z.infer<typeof casperConfigSchema>;

type FacilitatorClientLike = {
  // @x402/core HTTPFacilitatorClient — kept loose for test doubles.
  [key: string]: unknown;
};

type DispatchOptions = {
  body: string;
};

type CachedApp = {
  fetch: (request: Request) => Promise<Response>;
};

type HonoLike = {
  use: (middleware: unknown) => void;
  get: (path: string, handler: () => Response) => void;
  on: (method: string, path: string, handler: () => Response) => void;
  fetch: (request: Request) => Promise<Response>;
};

type CasperRuntimeModules = {
  paymentMiddlewareFromConfig: (...args: unknown[]) => unknown;
  HTTPFacilitatorClient: new (options?: { url?: string }) => FacilitatorClientLike;
  ExactCasperScheme: new () => unknown;
  Hono: new () => HonoLike;
};

type CasperX402AdapterDeps = {
  facilitatorClient?: FacilitatorClientLike;
  maxCachedApps?: number;
  runtimeFactory?: () => CasperRuntimeModules;
  configProvider?: () => {
    enabled?: unknown;
    network?: unknown;
    facilitatorUrl?: unknown;
    payTo?: unknown;
    asset?: unknown;
  };
};

export function parseCasperX402Config(raw: {
  enabled?: unknown;
  network?: unknown;
  facilitatorUrl?: unknown;
  payTo?: unknown;
  asset?: unknown;
}): CasperX402Config | null {
  const parsed = casperConfigSchema.safeParse({
    enabled: raw.enabled ?? false,
    network: raw.network ?? CASPER_MAINNET,
    facilitatorUrl: raw.facilitatorUrl ?? DEFAULT_CASPER_FACILITATOR_URL,
    payTo: raw.payTo ?? '',
    asset: raw.asset ?? '',
  });

  if (!parsed.success) {
    logging.warn(
      `Invalid machinePayments.casper config: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
    return null;
  }

  if (!parsed.data.enabled) {
    return null;
  }

  return parsed.data;
}

export class CasperX402Adapter implements PaymentAdapter {
  facilitatorClient?: FacilitatorClientLike;
  name: string;

  #config: CasperX402Config | null = null;
  #facilitator: FacilitatorClientLike | null = null;
  #scheme: unknown = null;
  #runtime: CasperRuntimeModules | null = null;
  #apps: BoundedRouteCache<CachedApp>;
  #runtimeFactory?: () => CasperRuntimeModules;
  #configProvider?: CasperX402AdapterDeps['configProvider'];
  #ready = false;
  #initAttempted = false;

  constructor({
    facilitatorClient,
    maxCachedApps = CASPER_ROUTE_CACHE_LIMIT,
    runtimeFactory,
    configProvider,
  }: CasperX402AdapterDeps = {}) {
    this.facilitatorClient = facilitatorClient;
    this.#apps = new BoundedRouteCache(maxCachedApps);
    this.#runtimeFactory = runtimeFactory;
    this.#configProvider = configProvider;
    this.name = 'x402-casper';
  }

  get isReady(): boolean {
    return this.#ready;
  }

  /**
   * Boot-owned initialization. Never throws: an unconfigured, misconfigured or
   * uninstallable Casper rail simply stays out of the adapter list.
   */
  async init(): Promise<boolean> {
    if (this.#initAttempted) {
      return this.#ready;
    }

    this.#initAttempted = true;

    const rawConfig = this.#configProvider
      ? this.#configProvider()
      : {
          enabled: config.get('machinePayments:casper:enabled'),
          network: config.get('machinePayments:casper:network'),
          facilitatorUrl: config.get('machinePayments:casper:facilitatorUrl'),
          payTo: config.get('machinePayments:casper:payTo'),
          asset: config.get('machinePayments:casper:asset'),
        };

    const parsedConfig = parseCasperX402Config(rawConfig);
    if (!parsedConfig) {
      return false;
    }

    try {
      const runtime = this.#loadRuntimeModules();
      const { HTTPFacilitatorClient, ExactCasperScheme } = runtime;

      this.#config = parsedConfig;
      this.#runtime = runtime;
      this.#facilitator =
        this.facilitatorClient || new HTTPFacilitatorClient({ url: parsedConfig.facilitatorUrl });
      this.#scheme = new ExactCasperScheme();
      this.#ready = true;
      return true;
    } catch (err) {
      logging.warn(err);
      this.#config = null;
      this.#runtime = null;
      this.#facilitator = null;
      this.#scheme = null;
      this.#ready = false;
      return false;
    }
  }

  canHandle(request: Request): boolean {
    return Boolean(request.headers.get('x-payment') || request.headers.get('payment-signature'));
  }

  async challenge(request: Request, terms: PaymentTerms): Promise<Response | null> {
    if (!this.#ready) {
      return null;
    }

    try {
      const response = await this.#dispatch(request, terms, { body: '' });
      if (response.status === 402) {
        return response;
      }

      logging.warn(`Casper x402 challenge unavailable for ${terms.url}: HTTP ${response.status}`);
      return null;
    } catch (err) {
      logging.warn(err);
      return null;
    }
  }

  async fulfill(request: Request, terms: PaymentTerms): Promise<Fulfillment> {
    if (!this.#ready || !this.#config) {
      throw new errors.NoPermissionError({
        message: 'Casper x402 payment credential rejected',
      });
    }

    const response = await this.#dispatch(request, terms, { body: 'ok' });
    if (response.status === 402) {
      throw new errors.NoPermissionError({
        message: 'Payment required',
      });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new errors.NoPermissionError({
        message: 'Casper x402 payment credential rejected',
      });
    }

    const paymentResponse =
      response.headers.get('payment-response') || response.headers.get('X-PAYMENT-RESPONSE');
    if (!paymentResponse) {
      throw new errors.InternalServerError({
        message: 'Casper x402 payment succeeded without a stable settlement reference',
      });
    }

    return {
      protocol: 'x402',
      method: 'casper',
      reference: settlementReference(paymentResponse),
      amount: terms.amount,
      currency: terms.currency,
      stripePaymentIntentId: null,
      receiptHeaders: { 'payment-response': paymentResponse },
    };
  }

  async #dispatch(
    request: Request,
    terms: PaymentTerms,
    responseData: DispatchOptions,
  ): Promise<Response> {
    if (!this.#config || !this.#runtime || !this.#facilitator || !this.#scheme) {
      throw new errors.InternalServerError({
        message: 'Casper x402 adapter used before boot initialization',
      });
    }

    const { network, payTo, asset } = this.#config;
    const method = (terms.method || 'GET').toUpperCase();
    const route = `${method} ${new URL(terms.url).pathname}`;
    const price = formatPrice(terms);
    const cacheKey = `${route}:${payTo}:${price}:${network}:${asset}:${responseData.body ? 'fulfill' : 'challenge'}`;

    let cached = this.#apps.get(cacheKey);
    if (!cached) {
      cached = this.#createApp({
        route,
        method,
        network,
        payTo,
        asset,
        price,
        terms,
        responseData,
      });
      this.#apps.set(cacheKey, cached);
    }

    return await cached.fetch(request);
  }

  #loadRuntimeModules(): CasperRuntimeModules {
    if (this.#runtimeFactory) {
      return this.#runtimeFactory();
    }

    const { paymentMiddlewareFromConfig } = require('@x402/hono') as {
      paymentMiddlewareFromConfig: CasperRuntimeModules['paymentMiddlewareFromConfig'];
    };
    const { HTTPFacilitatorClient } = require('@x402/core/server') as {
      HTTPFacilitatorClient: CasperRuntimeModules['HTTPFacilitatorClient'];
    };
    const { ExactCasperScheme } = require('@make-software/casper-x402/exact/server') as {
      ExactCasperScheme: CasperRuntimeModules['ExactCasperScheme'];
    };
    const { Hono } = require('hono') as {
      Hono: CasperRuntimeModules['Hono'];
    };

    return { paymentMiddlewareFromConfig, HTTPFacilitatorClient, ExactCasperScheme, Hono };
  }

  #createApp({
    route,
    method,
    network,
    payTo,
    asset,
    price,
    terms,
    responseData,
  }: {
    route: string;
    method: string;
    network: string;
    payTo: string;
    asset: string;
    price: string;
    terms: PaymentTerms;
    responseData: DispatchOptions;
  }): CachedApp {
    if (!this.#runtime || !this.#facilitator || !this.#scheme) {
      throw new errors.InternalServerError({
        message: 'Casper x402 adapter used before boot initialization',
      });
    }

    const { paymentMiddlewareFromConfig, Hono } = this.#runtime;

    const app = new Hono();
    app.use(
      paymentMiddlewareFromConfig(
        {
          [route]: {
            accepts: [
              {
                scheme: 'exact',
                price,
                network,
                payTo,
                asset,
              },
            ],
            description: terms.description,
            mimeType: terms.mimeType,
          },
        },
        this.#facilitator,
        [
          {
            network,
            server: this.#scheme,
          },
        ],
      ),
    );

    const handler = () =>
      new Response(responseData.body, {
        status: 200,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      });

    if (method === 'GET') {
      app.get('*', handler);
    } else if (method === 'HEAD') {
      app.on('HEAD', '*', handler);
    } else {
      app.on(method, '*', handler);
    }

    return { fetch: (request) => app.fetch(request) };
  }
}
