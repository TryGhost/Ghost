/**
 * Shared types for the superportal runtime.
 *
 * The shell bootstraps from data attributes on its own script tag, then fetches
 * site settings (Content API) and member state (members API). Feature chunks
 * consume state through the `Services` object the shell passes when mounting
 * them — they do NOT reach for window globals or DOM directly.
 */

export type FeatureName =
    | 'members'
    | 'share'
    | 'gift'
    | 'announcement'
    | 'search'
    | 'offers'
    | 'donations'
    | 'feedback'
    | 'unsubscribe'
    | 'recommendations';

export interface SiteNewsletter {
    id: string;
    uuid?: string;
    name: string;
    description?: string;
    status?: 'active' | 'archived';
    paid?: boolean;
    subscribe_on_signup?: boolean;
    sender_email?: string;
}

export interface SiteTier {
    id: string;
    name: string;
    description?: string;
    benefits?: Array<{id?: string; name: string} | string>;
    monthly_price?: number;
    yearly_price?: number;
    currency?: string;
    trial_days?: number;
    type?: 'free' | 'paid';
    /** 'public' tiers show in portal; 'none' are hidden (Admin tier visibility). */
    visibility?: string;
}

export interface SiteState {
    title: string;
    url: string;
    accent_color?: string;
    locale: string;
    icon?: string;
    admin_url?: string;
    search_api_key?: string;
    members_api_url?: string;
    /** Content API base, e.g. `${url}/ghost/api/content`. Used to fetch offers. */
    content_api_url?: string;
    newsletters?: SiteNewsletter[];
    tiers?: SiteTier[];
    portal_name?: boolean;
    portal_signup_terms_html?: string | null;
    portal_signup_checkbox_required?: boolean;
    members_signup_access?: 'all' | 'invite' | 'none' | 'paid';
    allow_self_signup?: boolean;
    /** Which plans portal offers: subset of 'free' | 'monthly' | 'yearly'. */
    portal_plans?: string[];
    /** False = publisher hides the portal launcher; offers then skip the landing page. */
    portal_button?: boolean;
    /** Default cadence preselected in portal ('monthly' | 'yearly'). */
    portal_default_plan?: string;
    /** True when Stripe is connected and paid signups are possible. */
    paid_members_enabled?: boolean;
    /** Stripe-gated; true when the site accepts one-time donations. */
    donations_enabled?: boolean;
    /** True when the publisher has enabled recommendations. */
    recommendations_enabled?: boolean;
    /** FirstPromoter affiliate account id; when set, the shell loads fprom.js. */
    firstpromoter_account?: string;
    /** Sentry DSN from server `client_sentry` config (Ghost(Pro)); enables error reporting. */
    sentry_dsn?: string;
    /** Sentry environment label that accompanies the DSN. */
    sentry_env?: string;
    /** Ghost version (from /members/api/site); used in the Sentry release tag. */
    version?: string;
    /** True when outbound recommendation links get a `ref` source tag. */
    outbound_link_tagging?: boolean;
    /** Who can comment: 'all' | 'paid' | 'off'. */
    comments_enabled?: 'all' | 'paid' | 'off';
    /** Launcher button settings — parsed from admin preview; unused until the launcher ships. */
    portal_button_icon?: string;
    portal_button_signup_text?: string;
    portal_button_style?: string;
    /** Preview-only tier filter (admin's unsaved visibility); null/undefined = derive from tier.visibility. */
    portal_products?: string[] | null;
    /** Server-computed: Transistor integration active AND portal toggle on. */
    transistor_portal_enabled?: boolean;
    transistor_portal_heading?: string;
    transistor_portal_description?: string;
    transistor_portal_button_text?: string;
    transistor_portal_url_template?: string;
    /** Calculated support email, used by the email-FAQ pages. */
    support_email_address?: string;
    /** Calculated default newsletter sender email. */
    default_email_address?: string;
}

export interface MemberState {
    id: string;
    uuid: string;
    email: string;
    name?: string;
    status: 'free' | 'paid' | 'comped' | 'gift';
    /** ISO timestamp; identifies just-signed-up members for affiliate tracking. */
    created_at?: string;
    /** Optional — present only when referrals ship. */
    referral_code?: string;
}

/**
 * Theme-state bag. Keys are intentionally loose because new features may
 * surface fields here without spec changes; known fields are documented below.
 */
export interface ThemeState {
    /** HTML announcement bar content. Empty/missing = no banner. */
    announcement?: string;
    /** Either a CSS colour or 'dark'/'light'/'accent' style hint. */
    announcement_background?: string;
    /** Catch-all for future theme-passed config. */
    [key: string]: unknown;
}

export interface PortalState {
    site: SiteState;
    member: MemberState | null;
    features: FeatureName[];
    theme: ThemeState;
    /** True when running inside Ghost Admin's portal-settings preview iframe. */
    preview?: boolean;
}

/**
 * Translator function. Returns the active-locale string for a key, falling back
 * to the key itself if the locale JSON hasn't loaded a value for it.
 */
export type Translator = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Modal mount handle returned to features.
 */
export interface ModalHandle {
    close(): void;
    /** Swap the panel/backdrop classes mid-session (e.g., full-screen signup → centered signin). */
    setChrome(chrome: {panelClass?: string; backdropClass?: string}): void;
}

/**
 * Notification mount handle returned to callers of `services.showNotification`.
 */
export interface NotificationHandle {
    close(): void;
}

/**
 * Notifications are the post-redirect toast surface (top-right, slide-in).
 * `type` + `status` drive the title/body copy — see the body component for the
 * mapping. The first pass only surfaces `signin` success/error; later feature
 * ports will extend the union.
 */
export interface NotificationOptions {
    type: 'signin' | 'signup' | 'signup-paid' | 'stripe:checkout' | 'support' | 'giftRedeem';
    status: 'success' | 'error' | 'warning';
    message?: string;
    /** Gift redemption failure code (GIFT_EXPIRED etc.) for the giftRedeem type. */
    giftErrorCode?: string | null;
    firstname?: string;
    siteTitle?: string;
    siteUrl?: string;
    hasMember?: boolean;
    autoHide?: boolean;
    duration?: number;
}

/**
 * Services the shell exposes to feature chunks at mount time.
 * Features should NOT reach for `window` or other globals — they consume what's here.
 */
export interface Services {
    /** Read-only snapshot accessor. Returns the current in-memory state. */
    getState(): PortalState;
    /** Update member after signin/signout. Notifies subscribers. */
    setMember(member: MemberState | null): void;
    /** Merge lazily-fetched site data (tiers/newsletters) into state.site. Notifies subscribers. */
    mergeSiteData(data: {tiers?: unknown[]; newsletters?: unknown[]}): void;
    /** Subscribe to state changes. Returns an unsubscribe function. */
    subscribe(listener: (state: PortalState) => void): () => void;
    /** Open a feature's UI inside the shared modal iframe. Returns a close handle. */
    openModal(content: import('react').ReactNode, options?: ModalOptions): ModalHandle;
    /**
     * Show the top-right toast notification. Driven primarily by URL params at
     * boot (post-redirect feedback), but features can call this programmatically
     * for in-flow flashes too.
     */
    showNotification(opts: NotificationOptions): NotificationHandle;
    /** Active-locale translator. Available after the shell has resolved locale fetch. */
    t: Translator;
    /** Text direction of the active locale ('ltr' | 'rtl'). */
    dir(): 'ltr' | 'rtl';
}

export interface ModalOptions {
    /** Optional CSS to inject into the modal iframe alongside this mount. */
    css?: string;
    /**
     * Optional class name appended to the default `.gh-modal-panel` wrapper.
     * Lets a feature override panel sizing / padding without touching the
     * shared modal CSS — e.g., share passes `gh-share-modal-panel` to widen
     * the panel from 480px to 560px.
     */
    panelClass?: string;
    /**
     * Optional class name appended to the default `.gh-modal-backdrop` wrapper.
     * Lets a feature override the backdrop's background, blur, and padding —
     * e.g., search passes `gh-search-modal-backdrop` to swap the dark scrim for
     * a blur+gradient and to anchor the panel ~140px from the top.
     */
    backdropClass?: string;
    /** Called when the modal closes for any reason (escape, click-outside, programmatic). */
    onClose?: () => void;
    /**
     * Default true. When false, backdrop clicks, Escape, and `handle.close()`
     * are no-ops; opening a different modal and error-boundary teardown still
     * work. Used by the admin preview, which must never dismiss.
     */
    dismissible?: boolean;
}

/**
 * Standard mount signature every feature chunk implements.
 * The shell calls `mount(...)` with current context when a trigger fires (or, for eager-on-mount
 * features like announcement, on shell init).
 */
export interface MountContext {
    services: Services;
    /** Trigger-specific parameters parsed from the DOM contract (e.g., `data-portal=\"signup/tier-slug/yearly\"`). */
    params?: Record<string, string>;
    /** The clicked element, when the mount was triggered by a DOM click. */
    triggerElement?: HTMLElement;
}

export type FeatureMount = (ctx: MountContext) => void | Promise<void>;
