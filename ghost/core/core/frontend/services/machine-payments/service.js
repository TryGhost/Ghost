const settingsCache = require('../../../shared/settings-cache');

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
        x402Adapter,
        mppAdapter,
        addressProvider = new StripeDepositAddressProvider()
    } = {}) {
        this.settingsCache = settings;
        this.x402Adapter = x402Adapter || new X402Adapter({addressProvider});
        this.mppAdapter = mppAdapter || new MppAdapter({addressProvider});
    }

    isEnabled() {
        return this.settingsCache.get('machine_payments_enabled') === true;
    }

    getTerms({url, description = 'Markdown content', method = 'GET', mimeType = 'text/markdown'}) {
        return {
            amount: Number(this.settingsCache.get('machine_payments_amount') || DEFAULT_AMOUNT),
            currency: (this.settingsCache.get('machine_payments_currency') || DEFAULT_CURRENCY).toUpperCase(),
            description,
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

        const terms = this.getTerms({
            url: request.url
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
            return this.#paidContentResponse(await this.x402Adapter.handle(request, terms, paidResponse));
        }

        if (this.mppAdapter.canHandle(request)) {
            return this.#paidContentResponse(await this.mppAdapter.handle(request, terms, paidResponse));
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

    #paidContentResponse(response) {
        if (response.status !== 200) {
            return response;
        }

        const headers = new Headers(response.headers);
        headers.set('Cache-Control', PAID_MARKDOWN_CACHE_CONTROL);

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
        });
    }
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
