import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import {z} from 'zod';
import config from '../../../../shared/config';
import type {Fulfillment, PaymentAdapter, PaymentTerms} from '../types';
import type {PaymentAmountTerms} from '../pricing';

const X402_ROUTE_CACHE_LIMIT = 128;
const BASE_MAINNET = 'eip155:8453';

const settlementResponseSchema = z.object({
    transaction: z.string().optional(),
    txHash: z.string().optional(),
    hash: z.string().optional(),
    settlement: z.object({
        transaction: z.string().optional()
    }).optional()
});

type DepositAddressStoreLike = {
    getOrCreateAddress: (options: {network?: string}) => Promise<string>;
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
    HTTPFacilitatorClient: new (options?: {url?: string}) => FacilitatorClientLike;
    ExactEvmScheme: new () => unknown;
    Hono: new () => HonoLike;
};

type X402AdapterDeps = {
    depositAddressStore: DepositAddressStoreLike;
    facilitatorClient?: FacilitatorClientLike;
    maxCachedApps?: number;
    runtimeFactory?: () => X402RuntimeModules;
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

/**
 * x402 adapter (Base USDC). Second rail behind the same canHandle/challenge/fulfill boundary.
 * Reuses facilitator and ExactEvmScheme; caches per-route Hono apps keyed by payTo + price.
 */
export class X402Adapter implements PaymentAdapter {
    depositAddressStore: DepositAddressStoreLike;
    facilitatorClient?: FacilitatorClientLike;
    name: string;

    #facilitator: FacilitatorClientLike | null = null;
    #scheme: unknown = null;
    #apps: BoundedRouteCache<CachedApp>;
    #runtimeFactory?: () => X402RuntimeModules;

    constructor({
        depositAddressStore,
        facilitatorClient,
        maxCachedApps = X402_ROUTE_CACHE_LIMIT,
        runtimeFactory
    }: X402AdapterDeps) {
        this.depositAddressStore = depositAddressStore;
        this.facilitatorClient = facilitatorClient;
        this.#apps = new BoundedRouteCache(maxCachedApps);
        this.#runtimeFactory = runtimeFactory;
        this.name = 'x402';
    }

    canHandle(request: Request): boolean {
        return Boolean(request.headers.get('x-payment') || request.headers.get('payment-signature'));
    }

    async challenge(request: Request, terms: PaymentTerms): Promise<Response | null> {
        try {
            const response = await this.#dispatch(request, terms, {body: ''});
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
        const response = await this.#dispatch(request, terms, {body: 'ok'});
        if (response.status === 402) {
            throw new errors.NoPermissionError({
                message: 'Payment required'
            });
        }

        if (response.status < 200 || response.status >= 300) {
            throw new errors.NoPermissionError({
                message: 'x402 payment credential rejected'
            });
        }

        const paymentResponse = response.headers.get('payment-response')
            || response.headers.get('X-PAYMENT-RESPONSE');
        if (!paymentResponse) {
            throw new errors.InternalServerError({
                message: 'x402 payment succeeded without a stable settlement reference'
            });
        }

        const stripeNetwork = config.get('machinePayments:x402:stripeNetwork') || 'base';

        return {
            protocol: 'x402',
            method: stripeNetwork,
            reference: settlementReference(paymentResponse),
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: null,
            receiptHeaders: {'payment-response': paymentResponse}
        };
    }

    async #dispatch(request: Request, terms: PaymentTerms, responseData: DispatchOptions): Promise<Response> {
        const network = config.get('machinePayments:x402:network') || BASE_MAINNET;
        const stripeNetwork = config.get('machinePayments:x402:stripeNetwork') || 'base';
        const method = (terms.method || 'GET').toUpperCase();
        const route = `${method} ${new URL(terms.url).pathname}`;
        const payTo = await this.depositAddressStore.getOrCreateAddress({network: stripeNetwork});
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
                responseData
            });
            this.#apps.set(cacheKey, cached);
        }

        return await cached.fetch(request);
    }

    #loadRuntimeModules(): X402RuntimeModules {
        if (this.#runtimeFactory) {
            return this.#runtimeFactory();
        }

        const {paymentMiddlewareFromConfig} = require('@x402/hono') as {
            paymentMiddlewareFromConfig: X402RuntimeModules['paymentMiddlewareFromConfig'];
        };
        const {HTTPFacilitatorClient} = require('@x402/core/server') as {
            HTTPFacilitatorClient: X402RuntimeModules['HTTPFacilitatorClient'];
        };
        const {ExactEvmScheme} = require('@x402/evm/exact/server') as {
            ExactEvmScheme: X402RuntimeModules['ExactEvmScheme'];
        };
        const {Hono} = require('hono') as {
            Hono: X402RuntimeModules['Hono'];
        };

        return {paymentMiddlewareFromConfig, HTTPFacilitatorClient, ExactEvmScheme, Hono};
    }

    #createApp({
        route,
        method,
        network,
        payTo,
        price,
        terms,
        responseData
    }: {
        route: string;
        method: string;
        network: string;
        payTo: string;
        price: string;
        terms: PaymentTerms;
        responseData: DispatchOptions;
    }): CachedApp {
        const {
            paymentMiddlewareFromConfig,
            HTTPFacilitatorClient,
            ExactEvmScheme,
            Hono
        } = this.#loadRuntimeModules();

        if (!this.#facilitator) {
            const facilitatorUrl = config.get('machinePayments:x402:facilitatorUrl');
            this.#facilitator = this.facilitatorClient
                || (facilitatorUrl
                    ? new HTTPFacilitatorClient({url: facilitatorUrl})
                    : new HTTPFacilitatorClient());
        }

        if (!this.#scheme) {
            this.#scheme = new ExactEvmScheme();
        }

        const app = new Hono();
        app.use(paymentMiddlewareFromConfig({
            [route]: {
                accepts: [{
                    scheme: 'exact',
                    price,
                    network,
                    payTo
                }],
                description: terms.description,
                mimeType: terms.mimeType
            }
        }, this.#facilitator, [{
            network,
            server: this.#scheme
        }]));

        const handler = () => new Response(responseData.body, {
            status: 200,
            headers: {'Content-Type': 'text/markdown; charset=utf-8'}
        });

        if (method === 'GET') {
            app.get('*', handler);
        } else if (method === 'HEAD') {
            app.on('HEAD', '*', handler);
        } else {
            app.on(method, '*', handler);
        }

        return {fetch: request => app.fetch(request)};
    }
}

export function formatPrice(terms: PaymentAmountTerms): string {
    if (terms.currency.toUpperCase() !== 'USD') {
        throw new errors.ValidationError({
            message: 'x402 machine payments currently support USD only'
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
        ? parsed.data.transaction
            || parsed.data.txHash
            || parsed.data.hash
            || parsed.data.settlement?.transaction
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
