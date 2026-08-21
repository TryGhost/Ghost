import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import config from '../../../../shared/config';
import type { Fulfillment, PaymentAdapter, PaymentTerms } from '../types';
import type { PaymentAmountTerms } from '../pricing';

const X402_ROUTE_CACHE_LIMIT = 128;
const BASE_MAINNET = 'eip155:8453';
const BASE_SEPOLIA = 'eip155:84532';
const X402_ORG_FACILITATOR = 'https://x402.org/facilitator';
const DEFAULT_FACILITATOR_URL = 'https://facilitator.xpay.sh';

function normalizeFacilitatorUrl(urlString: string): string {
  const parsed = new URL(urlString);
  const origin = parsed.origin.toLowerCase();
  const pathname = parsed.pathname.replace(/\/+$/, '') || '/';
  return `${origin}${pathname}`;
}

const x402ConfigSchema = z
  .object({
    network: z.string().regex(/^eip155:\d+$/, {
      message: 'machinePayments.x402.network must be a CAIP-2 EVM network (eip155:<chainId>)',
    }),
    stripeNetwork: z.enum(['base'], {
      message: 'machinePayments.x402.stripeNetwork must be "base"',
    }),
    facilitatorUrl: z.string().url({
      message: 'machinePayments.x402.facilitatorUrl must be a valid URL',
    }),
  })
  .superRefine((value, ctx) => {
    if (![BASE_MAINNET, BASE_SEPOLIA].includes(value.network)) {
      ctx.addIssue({
        code: 'custom',
        message: `machinePayments.x402.network must be ${BASE_MAINNET} or ${BASE_SEPOLIA}`,
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
        message: 'machinePayments.x402.facilitatorUrl must use HTTPS',
      });
      return;
    }

    if (
      value.network === BASE_MAINNET &&
      normalizeFacilitatorUrl(value.facilitatorUrl) === X402_ORG_FACILITATOR
    ) {
      ctx.addIssue({
        code: 'custom',
        message:
          'machinePayments.x402.facilitatorUrl cannot be the x402.org testnet facilitator on Base mainnet',
      });
    }
  });

export type X402Config = z.infer<typeof x402ConfigSchema>;

const settlementResponseSchema = z.object({
  transaction: z.string().optional(),
  txHash: z.string().optional(),
  hash: z.string().optional(),
  settlement: z
    .object({
      transaction: z.string().optional(),
    })
    .optional(),
});

type DepositAddressStoreLike = {
  getOrCreateAddress: (options: { network?: string }) => Promise<string>;
};

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

type X402RuntimeModules = {
  paymentMiddlewareFromConfig: (...args: unknown[]) => unknown;
  HTTPFacilitatorClient: new (options?: { url?: string }) => FacilitatorClientLike;
  ExactEvmScheme: new () => unknown;
  Hono: new () => HonoLike;
};

type X402AdapterDeps = {
  depositAddressStore: DepositAddressStoreLike;
  facilitatorClient?: FacilitatorClientLike;
  maxCachedApps?: number;
  runtimeFactory?: () => X402RuntimeModules;
  configProvider?: () => {
    network?: unknown;
    stripeNetwork?: unknown;
    facilitatorUrl?: unknown;
  };
};

/**
 * Bounded LRU cache for per-route Hono apps. Prevents unbounded growth when many
 * paid markdown URLs are challenged over the lifetime of the process.
 */
export class BoundedRouteCache<V> {
  #maxSize: number;
  #entries = new Map<string, V>();

  constructor(maxSize: number) {
    this.#maxSize = Math.max(1, maxSize);
  }

  get size(): number {
    return this.#entries.size;
  }

  get(key: string): V | undefined {
    const value = this.#entries.get(key);
    if (value === undefined) {
      return undefined;
    }

    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key: string, value: V): void {
    if (this.#entries.has(key)) {
      this.#entries.delete(key);
    } else if (this.#entries.size >= this.#maxSize) {
      const oldest = this.#entries.keys().next().value;
      if (oldest !== undefined) {
        this.#entries.delete(oldest);
      }
    }

    this.#entries.set(key, value);
  }
}

export function parseX402Config(raw: {
  network?: unknown;
  stripeNetwork?: unknown;
  facilitatorUrl?: unknown;
}): X402Config | null {
  const parsed = x402ConfigSchema.safeParse({
    network: raw.network ?? BASE_MAINNET,
    stripeNetwork: raw.stripeNetwork ?? 'base',
    facilitatorUrl: raw.facilitatorUrl ?? DEFAULT_FACILITATOR_URL,
  });

  if (!parsed.success) {
    logging.warn(
      `Invalid machinePayments.x402 config: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`,
    );
    return null;
  }

  return parsed.data;
}

/**
 * x402 adapter (Base USDC). Second rail behind the same canHandle/challenge/fulfill boundary.
 * Reuses facilitator and ExactEvmScheme; caches per-route Hono apps keyed by payTo + price.
 */
export class X402Adapter implements PaymentAdapter {
  depositAddressStore: DepositAddressStoreLike;
  facilitatorClient?: FacilitatorClientLike;
  name: string;

  #config: X402Config | null = null;
  #facilitator: FacilitatorClientLike | null = null;
  #scheme: unknown = null;
  #runtime: X402RuntimeModules | null = null;
  #apps: BoundedRouteCache<CachedApp>;
  #runtimeFactory?: () => X402RuntimeModules;
  #configProvider?: X402AdapterDeps['configProvider'];
  #ready = false;
  #initAttempted = false;

  constructor({
    depositAddressStore,
    facilitatorClient,
    maxCachedApps = X402_ROUTE_CACHE_LIMIT,
    runtimeFactory,
    configProvider,
  }: X402AdapterDeps) {
    this.depositAddressStore = depositAddressStore;
    this.facilitatorClient = facilitatorClient;
    this.#apps = new BoundedRouteCache(maxCachedApps);
    this.#runtimeFactory = runtimeFactory;
    this.#configProvider = configProvider;
    this.name = 'x402';
  }

  get isReady(): boolean {
    return this.#ready;
  }

  /**
   * Boot-owned initialization: validate config, load x402 runtime modules, and
   * construct the shared facilitator/scheme before the first paid markdown request.
   */
  async init(): Promise<boolean> {
    if (this.#initAttempted) {
      return this.#ready;
    }

    this.#initAttempted = true;

    const rawConfig = this.#configProvider
      ? this.#configProvider()
      : {
          network: config.get('machinePayments:x402:network'),
          stripeNetwork: config.get('machinePayments:x402:stripeNetwork'),
          facilitatorUrl: config.get('machinePayments:x402:facilitatorUrl'),
        };

    const parsedConfig = parseX402Config(rawConfig);
    if (!parsedConfig) {
      return false;
    }

    try {
      const runtime = this.#loadRuntimeModules();
      const { HTTPFacilitatorClient, ExactEvmScheme } = runtime;

      this.#config = parsedConfig;
      this.#runtime = runtime;
      this.#facilitator =
        this.facilitatorClient || new HTTPFacilitatorClient({ url: parsedConfig.facilitatorUrl });
      this.#scheme = new ExactEvmScheme();
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

      logging.warn(`x402 challenge unavailable for ${terms.url}: HTTP ${response.status}`);
      return null;
    } catch (err) {
      logging.warn(err);
      return null;
    }
  }

  async fulfill(request: Request, terms: PaymentTerms): Promise<Fulfillment> {
    if (!this.#ready || !this.#config) {
      throw new errors.NoPermissionError({
        message: 'x402 payment credential rejected',
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
        message: 'x402 payment credential rejected',
      });
    }

    const paymentResponse =
      response.headers.get('payment-response') || response.headers.get('X-PAYMENT-RESPONSE');
    if (!paymentResponse) {
      throw new errors.InternalServerError({
        message: 'x402 payment succeeded without a stable settlement reference',
      });
    }

    return {
      protocol: 'x402',
      method: this.#config.stripeNetwork,
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
        message: 'x402 adapter used before boot initialization',
      });
    }

    const { network, stripeNetwork } = this.#config;
    const method = (terms.method || 'GET').toUpperCase();
    const route = `${method} ${new URL(terms.url).pathname}`;
    const payTo = await this.depositAddressStore.getOrCreateAddress({ network: stripeNetwork });
    const price = formatPrice(terms);
    const cacheKey = `${route}:${payTo}:${price}:${network}:${responseData.body ? 'fulfill' : 'challenge'}`;

    let cached = this.#apps.get(cacheKey);
    if (!cached) {
      cached = this.#createApp({
        route,
        method,
        network,
        payTo,
        price,
        terms,
        responseData,
      });
      this.#apps.set(cacheKey, cached);
    }

    return await cached.fetch(request);
  }

  #loadRuntimeModules(): X402RuntimeModules {
    if (this.#runtimeFactory) {
      return this.#runtimeFactory();
    }

    const { paymentMiddlewareFromConfig } = require('@x402/hono') as {
      paymentMiddlewareFromConfig: X402RuntimeModules['paymentMiddlewareFromConfig'];
    };
    const { HTTPFacilitatorClient } = require('@x402/core/server') as {
      HTTPFacilitatorClient: X402RuntimeModules['HTTPFacilitatorClient'];
    };
    const { ExactEvmScheme } = require('@x402/evm/exact/server') as {
      ExactEvmScheme: X402RuntimeModules['ExactEvmScheme'];
    };
    const { Hono } = require('hono') as {
      Hono: X402RuntimeModules['Hono'];
    };

    return { paymentMiddlewareFromConfig, HTTPFacilitatorClient, ExactEvmScheme, Hono };
  }

  #createApp({
    route,
    method,
    network,
    payTo,
    price,
    terms,
    responseData,
  }: {
    route: string;
    method: string;
    network: string;
    payTo: string;
    price: string;
    terms: PaymentTerms;
    responseData: DispatchOptions;
  }): CachedApp {
    if (!this.#runtime || !this.#facilitator || !this.#scheme) {
      throw new errors.InternalServerError({
        message: 'x402 adapter used before boot initialization',
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

export function formatPrice(terms: PaymentAmountTerms): string {
  if (terms.currency.toUpperCase() !== 'USD') {
    throw new errors.ValidationError({
      message: 'x402 machine payments currently support USD only',
    });
  }

  return `$${(terms.amount / 100).toFixed(2)}`;
}

/**
 * Stable ledger reference from an x402 PAYMENT-RESPONSE header.
 * The raw header is base64 JSON and overflows varchar(255); prefer the
 * settlement transaction hash, and hash the header if that is missing.
 */
export function settlementReference(paymentResponse: string): string {
  const decoded = decodeJsonHeader(paymentResponse);
  const parsed = settlementResponseSchema.safeParse(decoded);
  const reference = parsed.success
    ? parsed.data.transaction ||
      parsed.data.txHash ||
      parsed.data.hash ||
      parsed.data.settlement?.transaction
    : undefined;

  if (typeof reference === 'string' && reference.length > 0 && reference.length <= 255) {
    return reference;
  }

  if (decoded !== null && !parsed.success) {
    return crypto.createHash('sha256').update(String(paymentResponse)).digest('hex');
  }

  if (typeof paymentResponse === 'string' && paymentResponse.length <= 255) {
    return paymentResponse;
  }

  return crypto.createHash('sha256').update(String(paymentResponse)).digest('hex');
}

function decodeJsonHeader(header: string): unknown {
  if (!header) {
    return null;
  }

  for (const encoding of ['base64url', 'base64'] as const) {
    try {
      return JSON.parse(Buffer.from(header, encoding).toString('utf8'));
    } catch {
      // try the next encoding
    }
  }

  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}
