/**
 * Request/response types for the members API client.
 *
 * MemberState from types.ts covers the base shape; these extend it with
 * fields the API returns that are not needed in the shell's in-memory store.
 */

export interface Newsletter {
    id: string;
    uuid: string;
    name: string;
    description?: string;
    status: 'active' | 'archived';
    /** True when the member is subscribed to this newsletter. */
    subscribed?: boolean;
}

export interface SubscriptionPrice {
    id: string;
    price_id: string;
    currency: string;
    amount: number;
    interval: 'month' | 'year';
}

export interface Subscription {
    id: string;
    status: string;
    start_date: string;
    expiry_at?: string;
    cancel_at_period_end: boolean;
    cancellation_reason?: string;
    current_period_end?: string;
    trial_end_at?: string;
    default_payment_card_last4?: string;
    price: SubscriptionPrice;
    tier?: MemberTier;
}

export interface MemberTier {
    id: string;
    name: string;
    description?: string;
    benefits?: Array<{id?: string; name: string} | string>;
    monthly_price?: number;
    yearly_price?: number;
    currency?: string;
    trial_days?: number;
    type?: 'free' | 'paid';
    visibility?: string;
    /** On subscription tiers: when access expires (gift/comped subscriptions). */
    expiry_at?: string;
}

/** Full member record returned by GET /members/api/member */
export interface MemberRecord {
    id: string;
    uuid: string;
    email: string;
    name?: string;
    firstname?: string;
    avatar_image?: string;
    status: 'free' | 'paid' | 'comped' | 'gift';
    subscribed: boolean;
    subscriptions: Subscription[];
    newsletters: Newsletter[];
    paid?: boolean;
    created_at?: string;
    enable_comment_notifications?: boolean;
    email_suppression?: {suppressed: boolean; info?: string};
}

/** Response from GET /members/api/site */
export interface SiteApiResponse {
    site: {
        title: string;
        url: string;
        version?: string;
        sentry_dsn?: string;
        sentry_env?: string;
        icon?: string;
        accent_color?: string;
        locale?: string;
        allow_self_signup?: boolean;
        members_signup_access?: 'all' | 'invite' | 'none';
        members_enabled?: boolean;
        portal_name?: boolean;
        portal_plans?: string[];
        portal_default_plan?: string;
        portal_signup_terms_html?: string | null;
        portal_signup_checkbox_required?: boolean;
        comments_enabled?: 'all' | 'paid' | 'off';
        recommendations_enabled?: boolean;
        donations_enabled?: boolean;
        gift_subscriptions_enabled?: boolean;
        newsletters?: Newsletter[];
        tiers?: MemberTier[];
    };
}

export interface SendMagicLinkRequest {
    email: string;
    emailType?: string;
    name?: string;
    labels?: string[];
    newsletters?: Array<{id?: string; name: string}>;
    redirect?: string;
    integrityToken?: string;
    honeypot?: string;
    token?: string;
    giftToken?: string;
    autoRedirect?: boolean;
    includeOTC?: boolean;
    urlHistory?: unknown;
    oldEmail?: string;
    requestSrc?: string;
}

export interface InboxLinks {
    desktop: string;
    android: string;
    provider: 'gmail' | 'yahoo' | 'outlook' | 'proton' | 'icloud' | 'hey' | 'aol' | 'mailru' | 'feedbin' | 'dev-mailpit';
}

export interface SendMagicLinkResponse {
    inboxLinks?: InboxLinks;
    otc_ref?: string;
}

export interface VerifyOtcRequest {
    otc: string;
    otcRef: string;
    redirect?: string;
    integrityToken?: string;
}

export interface VerifyOtcResponse {
    token?: string;
    redirectUrl?: string;
}

export interface UpdateMemberRequest {
    name?: string;
    subscribed?: boolean;
    newsletters?: Array<{id: string}>;
    enable_comment_notifications?: boolean;
}

export interface FeedbackRequest {
    postId: string;
    score: number;
    uuid?: string;
    key?: string;
}

/** Gift DTO from /members/api/gifts/:token/redeem — wrapped as `{gifts: [...]}`. */
export interface GiftData {
    token: string;
    cadence: 'month' | 'year';
    /** Number of cadence periods the gift covers (e.g. 1 = one month/year). */
    duration: number;
    currency: string;
    amount: number;
    expires_at?: string | null;
    consumes_at?: string | null;
    tier: {
        id: string;
        name: string;
        description?: string | null;
        benefits?: string[];
    };
}

export interface GiftRedemptionResponse {
    gifts: GiftData[];
}

export interface CheckoutSessionRequest {
    priceId?: string | null;
    offerId?: string | null;
    tierId?: string | null;
    cadence?: string | null;
    identity?: string | null;
    metadata?: Record<string, unknown>;
    successUrl?: string;
    cancelUrl?: string;
    customerEmail?: string;
    type?: 'subscription' | 'gift' | 'donation';
    continueFromGift?: boolean;
    personalNote?: string;
}

export interface CheckoutSessionResponse {
    url?: string;
    sessionId?: string;
    publicKey?: string;
}

export interface UpdateSessionRequest {
    identity?: string | null;
    subscription_id?: string;
    successUrl?: string;
    cancelUrl?: string;
}

export interface BillingPortalRequest {
    identity?: string | null;
    subscription_id?: string;
    returnUrl?: string;
}

export interface BillingPortalResponse {
    url: string;
}

export interface SubscriptionUpdateRequest {
    identity?: string | null;
    smart_cancel?: boolean;
    cancel_at_period_end?: boolean;
    cancellation_reason?: string;
    priceId?: string;
    tierId?: string;
    cadence?: string;
}

export interface Offer {
    id: string;
    name: string;
    code?: string;
    display_title?: string;
    display_description?: string;
    type: 'percent' | 'fixed' | 'trial';
    cadence: 'month' | 'year';
    /** Cents for fixed offers, 0-100 for percent, day-count for trial. */
    amount: number;
    duration: 'once' | 'forever' | 'repeating' | 'trial';
    duration_in_months?: number | null;
    currency?: string;
    status?: 'active' | 'archived';
    redemption_type?: 'signup' | 'retention';
    tier?: {id: string; name: string};
}

/** @deprecated use {@link Offer}. Kept as an alias for back-compat. */
export type OfferRecord = Offer;

export interface OffersResponse {
    offers: Offer[];
}

/** Newsletter-management by uuid+key (unauth path, e.g., from email link). */
export interface NewslettersByKeyRequest {
    uuid: string;
    key: string;
}

/** Newsletter item returned by the keyed member/newsletters endpoints. */
export interface MemberNewsletterPreference {
    id: string;
    uuid?: string;
    name: string;
    description?: string | null;
    sort_order?: number;
}

/** GET/PUT /members/api/member/newsletters — fields are top-level, no wrapper. */
export interface NewslettersResponse {
    uuid: string;
    email: string;
    name?: string | null;
    newsletters: MemberNewsletterPreference[];
    enable_comment_notifications?: boolean;
    status?: 'free' | 'paid' | 'comped' | 'gift';
}

export interface UpdateNewslettersByKeyRequest extends NewslettersByKeyRequest {
    newsletters: Array<{id: string}>;
    enable_comment_notifications?: boolean;
}
