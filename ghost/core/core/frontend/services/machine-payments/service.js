const settingsCache = require('../../../shared/settings-cache');
const labs = require('../../../shared/labs');
const models = require('../../../server/models');
const logging = require('@tryghost/logging');

const StripeDepositAddressProvider = require('./stripe-deposit-address-provider');
const MppAdapter = require('./adapters/mpp-adapter');
const X402Adapter = require('./adapters/x402-adapter');

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_AMOUNT = 100;
const PAID_MARKDOWN_CACHE_CONTROL = 'private, no-store';

function cloneHeaders(headers = {}) {
    return Object.entries(headers).reduce((memo, [key, value]) => {
        memo[key] = value;
        return memo;
    }, {});
}

class MachinePaymentsService {
    constructor({
        settingsCache: settings = settingsCache,
        labsService = labs,
        x402Adapter,
        mppAdapter,
        addressProvider = new StripeDepositAddressProvider(),
        defaultCurrencyProvider = getDefaultTierCurrency
    } = {}) {
        this.settingsCache = settings;
        this.labs = labsService;
        this.x402Adapter = x402Adapter || new X402Adapter({addressProvider});
        this.mppAdapter = mppAdapter || new MppAdapter({addressProvider});
        this.defaultCurrencyProvider = defaultCurrencyProvider;
    }

    isEnabled() {
        return this.labs.isSet('machinePayments') && this.settingsCache.get('machine_payments_enabled') === true;
    }

    async getTerms({url, description, method = 'GET', mimeType = 'text/markdown'}) {
        return {
            amount: Number(this.settingsCache.get('machine_payments_amount') || DEFAULT_AMOUNT),
            currency: (await this.#getCurrency()).toUpperCase(),
            description: description || new URL(url).pathname,
            method,
            mimeType,
            url
        };
    }

    async handlePaidMarkdownRequest(req, res, responseData) {
        const response = await this.handleRequest(toFetchRequest(req), responseData);
        await copyFetchResponse(response, res);
        return true;
    }

    async handleRequest(request, responseData) {
        if (!this.isEnabled()) {
            return new Response('', {status: 404});
        }

        const terms = await this.getTerms({
            url: request.url,
            description: responseData.description
        });
        const headers = {
            'Content-Type': 'text/markdown; charset=utf-8',
            ...cloneHeaders(responseData.headers),
            'Cache-Control': PAID_MARKDOWN_CACHE_CONTROL
        };
        const paidResponse = {
            body: responseData.body,
            headers
        };

        if (this.x402Adapter.canHandle(request)) {
            return await this.#handleCredentialedPayment(this.x402Adapter, request, terms, paidResponse);
        }

        if (this.mppAdapter.canHandle(request)) {
            return await this.#handleCredentialedPayment(this.mppAdapter, request, terms, paidResponse);
        }

        return await this.#paymentRequiredResponse(request, terms, paidResponse);
    }

    async #paymentRequiredResponse(request, terms, paidResponse) {
        const [x402Result, mppResult] = await Promise.allSettled([
            this.x402Adapter.handle(request, terms, paidResponse),
            this.mppAdapter.handle(request, terms, paidResponse)
        ]);
        const x402Response = x402Result.status === 'fulfilled' ? x402Result.value : null;
        const mppResponse = mppResult.status === 'fulfilled' ? mppResult.value : null;
        const paymentRequired = x402Response?.headers?.get('payment-required');
        const wwwAuthenticate = mppResponse?.headers?.get('WWW-Authenticate');

        if (!paymentRequired && !wwwAuthenticate) {
            return new Response(JSON.stringify({
                type: 'https://paymentauth.org/problems/payment-unavailable',
                title: 'Machine payment challenges unavailable',
                status: 503,
                detail: 'Machine payment challenges are temporarily unavailable.'
            }), {
                status: 503,
                headers: {
                    'Cache-Control': 'no-store',
                    'Content-Type': 'application/problem+json'
                }
            });
        }

        const headers = new Headers({
            'Cache-Control': 'no-store',
            'Content-Type': 'application/problem+json'
        });

        if (paymentRequired) {
            headers.set('payment-required', paymentRequired);
        }

        if (wwwAuthenticate) {
            headers.set('WWW-Authenticate', wwwAuthenticate);
        }

        return new Response(JSON.stringify({
            type: 'https://paymentauth.org/problems/payment-required',
            title: 'Payment Required',
            status: 402,
            detail: 'Payment is required to access this markdown content.'
        }), {
            status: 402,
            headers
        });
    }

    async #handleCredentialedPayment(adapter, request, terms, paidResponse) {
        try {
            return this.#paidContentResponse(await adapter.handle(request, terms, paidResponse));
        } catch (err) {
            return this.#paymentCredentialErrorResponse(err);
        }
    }

    #paymentCredentialErrorResponse(err) {
        if (err?.statusCode === 403) {
            return this.#problemResponse({
                type: 'https://paymentauth.org/problems/payment-forbidden',
                title: 'Payment credential rejected',
                status: 403,
                detail: 'The supplied machine payment credential could not be validated.'
            });
        }

        logging.warn(err);

        return this.#problemResponse({
            type: 'https://paymentauth.org/problems/payment-unavailable',
            title: 'Machine payment temporarily unavailable',
            status: 503,
            detail: 'Machine payment verification is temporarily unavailable.'
        });
    }

    #problemResponse({type, title, status, detail}) {
        return new Response(JSON.stringify({
            type,
            title,
            status,
            detail
        }), {
            status,
            headers: {
                'Cache-Control': 'no-store',
                'Content-Type': 'application/problem+json'
            }
        });
    }

    #paidContentResponse(response) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', response.status === 200 ? PAID_MARKDOWN_CACHE_CONTROL : 'no-store');

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }

    async #getCurrency() {
        const configuredCurrency = this.settingsCache.get('machine_payments_currency');

        if (configuredCurrency) {
            return configuredCurrency;
        }

        return await this.defaultCurrencyProvider() || DEFAULT_CURRENCY;
    }
}

async function getDefaultTierCurrency() {
    const page = await models.Product.findPage({
        filter: 'type:paid+active:true',
        limit: 1,
        order: 'monthly_price asc',
        columns: ['currency']
    });
    const tier = page.data?.[0]?.toJSON?.() || page.data?.[0];

    return tier?.currency || null;
}

function toFetchRequest(req) {
    const protocol = req.protocol || 'http';
    const host = req.get?.('host') || req.headers.host;
    const url = new URL(req.originalUrl || req.url, `${protocol}://${host}`);
    const headers = new Headers();

    Object.entries(req.headers || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) {
            headers.set(key, value.join(', '));
        } else if (value !== undefined) {
            headers.set(key, value);
        }
    });

    return new Request(url.toString(), {
        method: req.method || 'GET',
        headers
    });
}

async function copyFetchResponse(fetchResponse, res) {
    res.status(fetchResponse.status);
    fetchResponse.headers.forEach((value, key) => {
        res.set(key, value);
    });

    const body = await fetchResponse.text();
    return res.send(body);
}

module.exports = new MachinePaymentsService();
module.exports.MachinePaymentsService = MachinePaymentsService;
module.exports.toFetchRequest = toFetchRequest;
module.exports.getDefaultTierCurrency = getDefaultTierCurrency;
