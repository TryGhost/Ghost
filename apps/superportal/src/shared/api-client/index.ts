/**
 * Shared members-api client.
 *
 * TypeScript port of apps/portal/src/utils/api.js. All endpoints typed;
 * no `any`. Stripe checkout redirect is wired but Stripe.js itself is
 * dynamically imported only when needed (see checkoutPlan / editBilling).
 *
 * Usage:
 *   const api = createMembersApiClient({ siteUrl: 'https://example.com' });
 *   const member = await api.member.sessionData();
 */

import {warn} from '../log';
import type {
    SiteApiResponse,
    MemberRecord,
    SendMagicLinkRequest,
    SendMagicLinkResponse,
    VerifyOtcRequest,
    VerifyOtcResponse,
    UpdateMemberRequest,
    FeedbackRequest,
    GiftRedemptionResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    UpdateSessionRequest,
    BillingPortalRequest,
    BillingPortalResponse,
    SubscriptionUpdateRequest,
    Offer,
    OffersResponse,
    NewslettersByKeyRequest,
    NewslettersResponse,
    UpdateNewslettersByKeyRequest,
} from './types';

export type {
    MemberRecord,
    Newsletter,
    MemberNewsletterPreference,
    Subscription,
    MemberTier,
    GiftData,
    Offer,
    OfferRecord,
    InboxLinks,
    SendMagicLinkResponse,
} from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RequestOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    body?: string;
}

function makeRequest(opts: RequestOptions): Promise<Response> {
    return fetch(opts.url, {
        method: opts.method ?? 'GET',
        headers: opts.headers,
        credentials: opts.credentials,
        body: opts.body,
    });
}

function jsonHeaders(): Record<string, string> {
    return {'Content-Type': 'application/json'};
}

/** API error carrying the server's error code (e.g. GIFT_EXPIRED). */
export class ApiError extends Error {
    code: string | null;

    constructor(message: string, code: string | null = null) {
        super(message);
        this.code = code;
    }
}

/** Parse a readable error message from a failed API response. */
async function parseApiError(res: Response, fallback: string): Promise<ApiError> {
    try {
        const body = (await res.json()) as {errors?: Array<{message?: string; code?: string}>};
        const first = body?.errors?.[0];
        if (first?.message) return new ApiError(first.message, first.code ?? null);
    } catch {
        // body wasn't JSON — fall through
    }
    return new ApiError(fallback);
}

/** Get a reference URL for attribution tracking (mirrors portal's getUrlHistory). */
function getUrlHistory(): unknown {
    try {
        const raw = window.sessionStorage.getItem('ghost-history');
        return raw ? JSON.parse(raw) : undefined;
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------
// Stripe loader (dynamic; lazy — only called when checkout is needed)
// ---------------------------------------------------------------------------

interface StripeInstance {
    redirectToCheckout(opts: {sessionId: string}): Promise<{error?: {message: string}}>;
}

interface FirstPromoter {
    data?: {tid?: string};
    init?(accountId: string, domain: string): void;
    trackSignup?(opts: {email: string; uid: string}): void;
}

declare global {
    interface Window {
        Stripe?: (publicKey: string) => StripeInstance;
        // First-party affiliate tracking used by some Ghost sites
        FPROM?: FirstPromoter;
        $FPROM?: FirstPromoter;
        // fprom.js command queue — pre-init fallback
        _fprom?: Array<[string, string]>;
    }
}

async function loadStripe(): Promise<(publicKey: string) => StripeInstance> {
    if (window.Stripe) return window.Stripe;
    await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Stripe.js'));
        document.head.appendChild(script);
    });
    if (!window.Stripe) throw new Error('Stripe.js did not expose window.Stripe');
    return window.Stripe;
}

async function redirectViaStripe(response: CheckoutSessionResponse): Promise<void> {
    if (response.url) {
        window.location.assign(response.url);
        return;
    }
    if (response.sessionId && response.publicKey) {
        const Stripe = await loadStripe();
        const stripe = Stripe(response.publicKey);
        const result = await stripe.redirectToCheckout({sessionId: response.sessionId});
        if (result.error) {
            throw new Error(result.error.message);
        }
    }
}

// ---------------------------------------------------------------------------
// Public API factory
// ---------------------------------------------------------------------------

export interface MembersApiClientOptions {
    /** Origin of the Ghost site, e.g. 'https://example.com'. Defaults to window.location.origin. */
    siteUrl?: string;
    /** Content API URL, needed for site.newsletters / site.tiers / site.settings. */
    apiUrl?: string;
    /** Content API key. */
    apiKey?: string;
}

export interface MembersApiClient {
    site: {
        read(): Promise<SiteApiResponse>;
        newsletters(): Promise<{newsletters: import('./types').Newsletter[]}>;
        tiers(): Promise<{tiers: import('./types').MemberTier[]}>;
        settings(): Promise<{settings: Record<string, unknown>}>;
        offer(opts: {offerId: string}): Promise<{offers: Offer[]}>;
        recommendations(opts?: {limit?: number}): Promise<unknown>;
    };
    member: {
        /** GET /members/api/session — returns JWT identity token string or null. */
        identity(): Promise<string | null>;
        /** GET /members/api/member — returns full member record or null. */
        sessionData(): Promise<MemberRecord | null>;
        update(data: UpdateMemberRequest): Promise<MemberRecord | null>;
        deleteSuppression(): Promise<true>;
        getIntegrityToken(): Promise<string>;
        sendMagicLink(opts: SendMagicLinkRequest): Promise<SendMagicLinkResponse>;
        verifyOTC(opts: VerifyOtcRequest): Promise<VerifyOtcResponse>;
        signout(all?: boolean): Promise<void>;
        newsletters(opts: NewslettersByKeyRequest): Promise<NewslettersResponse | null>;
        updateNewsletters(opts: UpdateNewslettersByKeyRequest): Promise<NewslettersResponse>;
        updateEmailAddress(opts: {email: string}): Promise<void>;
        checkoutPlan(opts: CheckoutSessionRequest): Promise<void>;
        editBilling(opts: UpdateSessionRequest): Promise<void>;
        manageBilling(opts: BillingPortalRequest): Promise<void>;
        updateSubscription(opts: SubscriptionUpdateRequest & {subscriptionId: string}): Promise<Response>;
        offers(): Promise<OffersResponse>;
        applyOffer(opts: {offerId: string; subscriptionId: string}): Promise<true>;
        checkoutGift(opts: {tierId: string; cadence: string; email?: string}): Promise<void>;
        continueGiftCheckout(): Promise<void>;
        checkoutDonation(opts: {successUrl?: string; cancelUrl?: string; metadata?: Record<string, unknown>; personalNote?: string}): Promise<CheckoutSessionResponse>;
    };
    feedback: {
        add(opts: FeedbackRequest): Promise<unknown>;
    };
    gift: {
        fetchRedemptionData(opts: {token: string}): Promise<GiftRedemptionResponse>;
        redeem(opts: {token: string}): Promise<GiftRedemptionResponse>;
    };
    recommendations: {
        trackClicked(opts: {recommendationId: string}): void;
        trackSubscribed(opts: {recommendationId: string}): void;
    };
}

export function createMembersApiClient(options: MembersApiClientOptions = {}): MembersApiClient {
    const siteUrl = (options.siteUrl ?? window.location.origin).replace(/\/$/, '');
    const apiUrl = options.apiUrl?.replace(/\/$/, '');
    const apiKey = options.apiKey;
    const apiPath = 'members/api';

    function membersEndpoint(resource: string): string {
        return `${siteUrl}/${apiPath}/${resource}/`;
    }

    function contentEndpoint(resource: string, params: Record<string, string> = {}): string {
        if (!apiUrl || !apiKey) return '';
        const qs = new URLSearchParams({...params, key: apiKey}).toString();
        return `${apiUrl}/${resource}/?${qs}`;
    }

    // ---------- site ----------

    const site: MembersApiClient['site'] = {
        async read() {
            const url = membersEndpoint('site');
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch site data');
            return res.json() as Promise<SiteApiResponse>;
        },

        async newsletters() {
            const url = contentEndpoint('newsletters', {limit: '100'});
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch newsletters');
            return res.json() as Promise<{newsletters: import('./types').Newsletter[]}>;
        },

        async tiers() {
            const url = contentEndpoint('tiers', {limit: '100', include: 'monthly_price,yearly_price,benefits'});
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch tiers');
            return res.json() as Promise<{tiers: import('./types').MemberTier[]}>;
        },

        async settings() {
            const url = contentEndpoint('settings');
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch settings');
            return res.json() as Promise<{settings: Record<string, unknown>}>;
        },

        async offer({offerId}) {
            const url = contentEndpoint(`offers/${offerId}`);
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch offer data');
            return res.json() as Promise<{offers: Offer[]}>;
        },

        async recommendations({limit = 100} = {}) {
            const url = contentEndpoint('recommendations', {limit: String(limit)});
            const res = await makeRequest({url, headers: jsonHeaders()});
            if (!res.ok) throw new Error('Failed to fetch recommendations');
            return res.json() as Promise<unknown>;
        },
    };

    // ---------- member ----------

    const member: MembersApiClient['member'] = {
        async identity() {
            const url = membersEndpoint('session');
            const res = await makeRequest({url, credentials: 'same-origin'});
            if (!res.ok || res.status === 204) return null;
            return res.text();
        },

        async sessionData() {
            const url = membersEndpoint('member');
            const res = await makeRequest({url, credentials: 'same-origin'});
            if (!res.ok || res.status === 204) return null;
            return res.json() as Promise<MemberRecord>;
        },

        async update(data) {
            const url = membersEndpoint('member');
            const body: Record<string, unknown> = {
                name: data.name,
                subscribed: data.subscribed,
                newsletters: data.newsletters,
            };
            if (data.enable_comment_notifications !== undefined) {
                body['enable_comment_notifications'] = data.enable_comment_notifications;
            }
            const res = await makeRequest({
                url,
                method: 'PUT',
                headers: jsonHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify(body),
            });
            if (!res.ok) return null;
            return res.json() as Promise<MemberRecord>;
        },

        async deleteSuppression() {
            const url = membersEndpoint('member/suppression');
            const res = await makeRequest({url, method: 'DELETE'});
            if (!res.ok) throw new Error('Your email has failed to resubscribe, please try again');
            return true;
        },

        async getIntegrityToken() {
            const url = membersEndpoint('integrity-token');
            const res = await makeRequest({url});
            if (res.ok) return res.text();
            throw await parseApiError(res, 'Failed to start a members session');
        },

        async sendMagicLink(opts) {
            const url = membersEndpoint('send-magic-link');
            const urlHistory = opts.urlHistory ?? getUrlHistory();
            const reqBody: Record<string, unknown> = {
                name: opts.name,
                email: opts.email,
                newsletters: opts.newsletters,
                oldEmail: opts.oldEmail,
                emailType: opts.emailType,
                labels: opts.labels,
                requestSrc: 'portal',
                redirect: opts.redirect,
                integrityToken: opts.integrityToken,
                honeypot: opts.honeypot,
                token: opts.token,
                giftToken: opts.giftToken,
                autoRedirect: opts.autoRedirect ?? true,
                includeOTC: opts.includeOTC,
            };
            if (urlHistory) reqBody['urlHistory'] = urlHistory;
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify(reqBody),
            });
            if (res.ok) {
                const ct = (res.headers.get('content-type') ?? '').toLowerCase();
                if (ct.includes('application/json')) {
                    try {
                        return (await res.json()) as SendMagicLinkResponse;
                    } catch {
                        // fall through
                    }
                }
                return {};
            }
            throw await parseApiError(res, 'Failed to send magic link email');
        },

        async verifyOTC(opts) {
            const url = membersEndpoint('verify-otc');
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    otc: opts.otc,
                    otcRef: opts.otcRef,
                    redirect: opts.redirect,
                    integrityToken: opts.integrityToken,
                }),
            });
            if (res.ok) return res.json() as Promise<VerifyOtcResponse>;
            throw await parseApiError(res, 'Failed to verify code');
        },

        async signout(all = false) {
            const url = membersEndpoint('session');
            const res = await makeRequest({
                url,
                method: 'DELETE',
                headers: jsonHeaders(),
                body: JSON.stringify({all}),
            });
            if (res.ok) {
                window.location.replace(siteUrl);
            } else {
                throw new Error('Failed to signout');
            }
        },

        async newsletters({uuid, key}) {
            const url = membersEndpoint('member/newsletters') + `?uuid=${uuid}&key=${key}`;
            const res = await makeRequest({url, credentials: 'same-origin'});
            if (!res.ok || res.status === 204) return null;
            return res.json() as Promise<NewslettersResponse>;
        },

        async updateNewsletters({uuid, key, newsletters, enable_comment_notifications}) {
            const url = membersEndpoint('member/newsletters') + `?uuid=${uuid}&key=${key}`;
            const body: Record<string, unknown> = {newsletters};
            if (enable_comment_notifications !== undefined) {
                body['enable_comment_notifications'] = enable_comment_notifications;
            }
            const res = await makeRequest({
                url,
                method: 'PUT',
                headers: jsonHeaders(),
                body: JSON.stringify(body),
            });
            if (res.ok) return res.json() as Promise<NewslettersResponse>;
            throw new Error('Failed to update email preferences');
        },

        async updateEmailAddress({email}) {
            const identity = await member.identity();
            const url = membersEndpoint('member/email');
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({email, identity}),
            });
            if (res.ok) return;
            const errData = (await res.json()) as {errors?: Array<{message?: string}>};
            const msg = errData?.errors?.[0]?.message ?? 'Failed to send email address verification email';
            throw new Error(msg);
        },

        async checkoutPlan(opts) {
            const identity = await member.identity();
            const url = membersEndpoint('create-stripe-checkout-session');
            const siteUrlObj = new URL(siteUrl);

            let cancelUrl = opts.cancelUrl;
            if (!cancelUrl) {
                const cancelUrlObj = window.location.href.startsWith(siteUrlObj.href)
                    ? new URL(window.location.href)
                    : new URL(siteUrl);
                cancelUrlObj.searchParams.set('stripe', 'cancel');
                cancelUrl = cancelUrlObj.href;
            }

            const fpTid = (window.FPROM ?? window.$FPROM)?.data?.tid;
            const metadataObj: Record<string, unknown> = {
                name: opts.metadata?.['name'],
                newsletters: opts.metadata?.['newsletters'],
                requestSrc: 'portal',
                fp_tid: fpTid,
                urlHistory: getUrlHistory(),
                ...opts.metadata,
            };

            const body: Record<string, unknown> = {
                priceId: opts.offerId ? null : opts.priceId,
                offerId: opts.offerId,
                identity,
                metadata: metadataObj,
                successUrl: opts.successUrl,
                cancelUrl,
            };

            if (opts.customerEmail) body['customerEmail'] = opts.customerEmail;

            if (opts.tierId && opts.cadence) {
                delete body['priceId'];
                body['tierId'] = opts.offerId ? null : opts.tierId;
                body['cadence'] = opts.offerId ? null : opts.cadence;
            }

            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify(body),
            });
            if (!res.ok) throw await parseApiError(res, 'Failed to signup, please try again.');
            const responseBody = (await res.json()) as CheckoutSessionResponse;
            await redirectViaStripe(responseBody);
        },

        async editBilling(opts) {
            const identity = await member.identity();
            const url = membersEndpoint('create-stripe-update-session');
            const siteUrlObj = new URL(siteUrl);

            let successUrl = opts.successUrl;
            if (!successUrl) {
                const u = new URL(siteUrl);
                u.searchParams.set('stripe', 'billing-update-success');
                successUrl = u.href;
            }

            let cancelUrl = opts.cancelUrl;
            if (!cancelUrl) {
                const u = window.location.href.startsWith(siteUrlObj.href)
                    ? new URL(window.location.href)
                    : new URL(siteUrl);
                u.searchParams.set('stripe', 'billing-update-cancel');
                cancelUrl = u.href;
            }

            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    identity,
                    subscription_id: opts.subscription_id,
                    successUrl,
                    cancelUrl,
                }),
            });
            if (!res.ok) throw new Error('Unable to create stripe checkout session');
            const result = (await res.json()) as CheckoutSessionResponse;
            await redirectViaStripe(result);
        },

        async manageBilling(opts) {
            const identity = await member.identity();
            const url = membersEndpoint('create-stripe-billing-portal-session');

            let returnUrl = opts.returnUrl;
            if (!returnUrl) {
                const u = new URL(siteUrl);
                u.searchParams.set('stripe', 'billing-portal-closed');
                returnUrl = u.href;
            }

            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({identity, subscription_id: opts.subscription_id, returnUrl}),
            });
            if (!res.ok) throw new Error('Unable to create Stripe billing portal session');
            const result = (await res.json()) as BillingPortalResponse;
            window.location.assign(result.url);
        },

        async updateSubscription({subscriptionId, tierId, cadence, priceId, smart_cancel, cancel_at_period_end, cancellation_reason}) {
            const identity = await member.identity();
            const url = membersEndpoint('subscriptions') + subscriptionId + '/';
            const body: Record<string, unknown> = {
                smart_cancel,
                cancel_at_period_end,
                cancellation_reason,
                identity,
                priceId,
            };
            if (tierId && cadence) {
                delete body['priceId'];
                body['tierId'] = tierId;
                body['cadence'] = cadence;
            }
            return makeRequest({
                url,
                method: 'PUT',
                headers: jsonHeaders(),
                body: JSON.stringify(body),
            });
        },

        async offers() {
            const identity = await member.identity();
            const url = membersEndpoint('member/offers');
            try {
                const res = await makeRequest({
                    url,
                    method: 'POST',
                    headers: jsonHeaders(),
                    body: JSON.stringify({identity}),
                });
                if (!res.ok) return {offers: []};
                return res.json() as Promise<OffersResponse>;
            } catch {
                return {offers: []};
            }
        },

        async applyOffer({offerId, subscriptionId}) {
            const identity = await member.identity();
            const url = membersEndpoint(`subscriptions/${subscriptionId}/apply-offer`);
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({identity, offer_id: offerId}),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to apply offer');
            }
            return true;
        },

        async checkoutGift({tierId, cadence, email}) {
            let identity: string | null = null;
            try {
                identity = await member.identity();
            } catch {
                // Not authenticated — that's fine for gift purchases
            }
            const url = membersEndpoint('create-stripe-checkout-session');
            const cancelUrl = new URL(window.location.href);
            cancelUrl.hash = '#/portal/gift';
            const body: Record<string, unknown> = {
                identity,
                metadata: {requestSrc: 'portal'},
                type: 'gift',
                tierId,
                cadence,
                cancelUrl: cancelUrl.href,
                ...(email ? {customerEmail: email} : {}),
            };
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify(body),
            });
            let responseJson: CheckoutSessionResponse = {};
            try {
                responseJson = (await res.json()) as CheckoutSessionResponse;
            } catch {
                // proxy might return HTML error page
            }
            if (!res.ok) {
                throw await parseApiError(res, 'Failed to process gift checkout, please try again.');
            }
            if (responseJson.url) {
                window.location.assign(responseJson.url);
                return;
            }
            throw new Error('Failed to process gift checkout, please try again.');
        },

        async continueGiftCheckout() {
            const identity = await member.identity();
            const url = membersEndpoint('create-stripe-checkout-session');
            const siteUrlObj = new URL(siteUrl);

            const successUrlObj = window.location.href.startsWith(siteUrlObj.href)
                ? new URL(window.location.href)
                : new URL(siteUrl);
            successUrlObj.searchParams.set('stripe', 'success');

            const cancelUrlObj = window.location.href.startsWith(siteUrlObj.href)
                ? new URL(window.location.href)
                : new URL(siteUrl);
            cancelUrlObj.searchParams.set('stripe', 'cancel');

            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    type: 'subscription',
                    continueFromGift: true,
                    identity,
                    successUrl: successUrlObj.href,
                    cancelUrl: cancelUrlObj.href,
                    metadata: {checkoutType: 'upgrade', requestSrc: 'portal', urlHistory: getUrlHistory()},
                }),
            });
            if (!res.ok) throw await parseApiError(res, 'Failed to continue gift subscription, please try again.');
            const responseBody = (await res.json()) as CheckoutSessionResponse;
            await redirectViaStripe(responseBody);
        },

        async checkoutDonation({successUrl, cancelUrl, metadata = {}, personalNote = ''} = {}) {
            const identity = await member.identity();
            const url = membersEndpoint('create-stripe-checkout-session');
            const fpTid = (window.FPROM ?? window.$FPROM)?.data?.tid;
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                body: JSON.stringify({
                    identity,
                    metadata: {fp_tid: fpTid, urlHistory: getUrlHistory(), ...metadata},
                    successUrl,
                    cancelUrl,
                    type: 'donation',
                    personalNote,
                }),
            });
            const responseJson = (await res.json()) as CheckoutSessionResponse & {errors?: Array<{message?: string}>};
            if (!res.ok) {
                const msg = (responseJson as {errors?: Array<{message?: string}>}).errors?.[0]?.message;
                throw new Error(msg ?? "We're unable to process your payment right now. Please try again later.");
            }
            return responseJson;
        },
    };

    // ---------- feedback ----------

    const feedback: MembersApiClient['feedback'] = {
        async add({uuid, key, postId, score}) {
            let url = membersEndpoint('feedback');
            if (uuid && key) {
                url = `${url}?uuid=${uuid}&key=${key}`;
            }
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({feedback: [{post_id: postId, score}]}),
            });
            if (res.ok) return res.json() as Promise<unknown>;
            throw await parseApiError(res, 'Failed to save feedback');
        },
    };

    // ---------- gift ----------

    const gift: MembersApiClient['gift'] = {
        async fetchRedemptionData({token}) {
            const url = membersEndpoint(`gifts/${encodeURIComponent(token)}/redeem`);
            const res = await makeRequest({
                url,
                method: 'GET',
                headers: jsonHeaders(),
                credentials: 'same-origin',
            });
            if (res.ok) return res.json() as Promise<GiftRedemptionResponse>;
            throw await parseApiError(res, 'Failed to load gift data');
        },

        async redeem({token}) {
            const url = membersEndpoint(`gifts/${encodeURIComponent(token)}/redeem`);
            const res = await makeRequest({
                url,
                method: 'POST',
                headers: jsonHeaders(),
                credentials: 'same-origin',
                body: JSON.stringify({}),
            });
            if (res.ok) return res.json() as Promise<GiftRedemptionResponse>;
            throw await parseApiError(res, 'Failed to redeem gift');
        },
    };

    // ---------- recommendations ----------

    const recommendations: MembersApiClient['recommendations'] = {
        trackClicked({recommendationId}) {
            const url = membersEndpoint(`recommendations/${recommendationId}/clicked`);
            navigator.sendBeacon(url);
        },
        trackSubscribed({recommendationId}) {
            const url = membersEndpoint(`recommendations/${recommendationId}/subscribed`);
            navigator.sendBeacon(url);
        },
    };

    return {site, member, feedback, gift, recommendations};
}

/** Create a client from the state blob's site, with content-API credentials. */
export function createApiClientFromSite(site: {url: string; content_api_url?: string; search_api_key?: string}): MembersApiClient {
    const apiUrl = site.content_api_url || `${site.url.replace(/\/$/, '')}/ghost/api/content`;
    return createMembersApiClient({siteUrl: site.url, apiUrl, apiKey: site.search_api_key});
}

// Re-export a tiny helper used by data-attributes form binding
export {warn};
