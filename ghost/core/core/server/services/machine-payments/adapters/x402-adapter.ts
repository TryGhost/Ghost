import crypto from 'node:crypto';
import errors from '@tryghost/errors';
import config from '../../../../shared/config';
import type {Fulfillment, PaymentAdapter, PaymentTerms} from '../types';
import type {PaymentAmountTerms} from '../pricing';

type DepositAddressStoreLike = {
    getOrCreateAddress: (options: {network?: string}) => Promise<string>;
};

type FacilitatorClientLike = {
    // @x402/core HTTPFacilitatorClient — kept loose for test doubles.
    [key: string]: unknown;
};

type X402AdapterDeps = {
    depositAddressStore: DepositAddressStoreLike;
    facilitatorClient?: FacilitatorClientLike;
};

type DispatchOptions = {
    body: string;
};

type CachedApp = {
    fetch: (request: Request) => Promise<Response>;
};

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
    #apps = new Map<string, CachedApp>();

    constructor({depositAddressStore, facilitatorClient}: X402AdapterDeps) {
        this.depositAddressStore = depositAddressStore;
        this.facilitatorClient = facilitatorClient;
        this.name = 'x402';
    }

    canHandle(request: Request): boolean {
        return Boolean(request.headers.get('x-payment') || request.headers.get('payment-signature'));
    }

    async challenge(request: Request, terms: PaymentTerms): Promise<Response | null> {
        const response = await this.#dispatch(request, terms, {body: ''});
        if (response.status === 402) {
            return response;
        }
        return null;
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

        return {
            protocol: 'x402',
            method: 'base',
            reference: settlementReference(paymentResponse),
            amount: terms.amount,
            currency: terms.currency,
            stripePaymentIntentId: null,
            receiptHeaders: {'payment-response': paymentResponse}
        };
    }

    async #dispatch(request: Request, terms: PaymentTerms, responseData: DispatchOptions): Promise<Response> {
        const network = config.get('machinePayments:x402:network') || 'eip155:8453';
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
        const {paymentMiddlewareFromConfig} = require('@x402/hono') as {
            paymentMiddlewareFromConfig: (...args: unknown[]) => unknown;
        };
        const {HTTPFacilitatorClient} = require('@x402/core/server') as {
            HTTPFacilitatorClient: new (options?: {url?: string}) => FacilitatorClientLike;
        };
        const {ExactEvmScheme} = require('@x402/evm/exact/server') as {
            ExactEvmScheme: new () => unknown;
        };
        const {Hono} = require('hono') as {
            Hono: new () => {
                use: (middleware: unknown) => void;
                get: (path: string, handler: () => Response) => void;
                on: (method: string, path: string, handler: () => Response) => void;
                fetch: (request: Request) => Promise<Response>;
            };
        };

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
    const decoded = decodeJsonHeader(paymentResponse) as {
        transaction?: string;
        txHash?: string;
        hash?: string;
        settlement?: {transaction?: string};
    } | null;
    const reference = decoded?.transaction
        || decoded?.txHash
        || decoded?.hash
        || decoded?.settlement?.transaction;

    if (typeof reference === 'string' && reference.length > 0 && reference.length <= 255) {
        return reference;
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
