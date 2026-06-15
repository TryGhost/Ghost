import type {PortalState, MemberState, FeatureName, SiteNewsletter, SiteTier, SiteState} from '../types';

const SHELL_SELECTOR = 'script[data-superportal-shell]';

/**
 * Read boot config from the shell script tag's data attributes (written by
 * ghost_head). Site settings and member state are fetched separately at boot.
 */
export function readBootConfig(doc: Document = document): PortalState {
    const node = doc.querySelector(SHELL_SELECTOR) as HTMLElement | null;
    if (!node) {
        throw new Error(`superportal: missing ${SHELL_SELECTOR} tag`);
    }
    const ds = node.dataset;
    if (!ds.ghost) {
        throw new Error('superportal: shell tag is missing data-ghost');
    }
    return {
        site: {
            title: '',
            url: ds.ghost,
            locale: ds.locale || 'en',
            admin_url: ds.adminUrl || undefined,
            search_api_key: ds.key || undefined
        },
        member: null,
        features: (ds.features ?? '').split(',').filter(isFeatureName),
        theme: {}
    };
}

/** Map a /members/api/member/ record (which has no `id` field) to MemberState. */
export function memberFromApiRecord(input: unknown): MemberState | null {
    if (!input || typeof input !== 'object') return null;
    const m = input as Record<string, unknown>;
    if (typeof m.email !== 'string') return null;
    const uuid = typeof m.uuid === 'string' ? m.uuid : undefined;
    const id = typeof m.id === 'string' ? m.id : uuid;
    if (!id) return null;
    const status = m.status === 'paid' || m.status === 'comped' || m.status === 'gift' ? m.status : 'free';
    return {
        id,
        uuid: uuid ?? id,
        email: m.email,
        name: typeof m.name === 'string' ? m.name : undefined,
        status,
        created_at: typeof m.created_at === 'string' ? m.created_at : undefined,
        referral_code: typeof m.referral_code === 'string' ? m.referral_code : undefined
    };
}

function stringArray(input: unknown): string[] | undefined {
    if (!Array.isArray(input)) return undefined;
    return input.filter((v): v is string => typeof v === 'string');
}

function validateNewsletter(input: unknown): SiteNewsletter | null {
    if (!input || typeof input !== 'object') return null;
    const n = input as Record<string, unknown>;
    if (typeof n.id !== 'string' || typeof n.name !== 'string') return null;
    const status = n.status === 'active' || n.status === 'archived' ? n.status : undefined;
    return {
        id: n.id,
        uuid: typeof n.uuid === 'string' ? n.uuid : undefined,
        name: n.name,
        description: typeof n.description === 'string' ? n.description : undefined,
        status,
        paid: typeof n.paid === 'boolean' ? n.paid : undefined,
        subscribe_on_signup: typeof n.subscribe_on_signup === 'boolean' ? n.subscribe_on_signup : undefined,
        sender_email: typeof n.sender_email === 'string' ? n.sender_email : undefined
    };
}

function validateTier(input: unknown): SiteTier | null {
    if (!input || typeof input !== 'object') return null;
    const t = input as Record<string, unknown>;
    if (typeof t.id !== 'string' || typeof t.name !== 'string') return null;
    return {
        id: t.id,
        name: t.name,
        description: typeof t.description === 'string' ? t.description : undefined,
        benefits: validateBenefits(t.benefits),
        monthly_price: typeof t.monthly_price === 'number' ? t.monthly_price : undefined,
        yearly_price: typeof t.yearly_price === 'number' ? t.yearly_price : undefined,
        currency: typeof t.currency === 'string' ? t.currency : undefined,
        trial_days: typeof t.trial_days === 'number' ? t.trial_days : undefined,
        type: t.type === 'free' || t.type === 'paid' ? t.type : undefined,
        visibility: typeof t.visibility === 'string' ? t.visibility : undefined
    };
}

function validateBenefits(input: unknown): SiteTier['benefits'] {
    if (!Array.isArray(input)) return undefined;
    const benefits = input
        .map((b): {id?: string; name: string} | null => {
            if (typeof b === 'string') return {name: b};
            if (b && typeof b === 'object' && typeof (b as {name?: unknown}).name === 'string') {
                const obj = b as {id?: unknown; name: string};
                return typeof obj.id === 'string' ? {id: obj.id, name: obj.name} : {name: obj.name};
            }
            return null;
        })
        .filter((b): b is {id?: string; name: string} => b !== null);
    return benefits.length ? benefits : undefined;
}

const KNOWN_FEATURES = new Set<FeatureName>(['members', 'share', 'gift', 'announcement', 'search', 'offers', 'donations', 'feedback', 'unsubscribe', 'recommendations']);

function isFeatureName(value: unknown): value is FeatureName {
    return typeof value === 'string' && KNOWN_FEATURES.has(value as FeatureName);
}

/**
 * Tiny pub-sub store wrapping the hydrated state. Features subscribe via Services.subscribe.
 * Mutation is intentionally narrow: setMember and mergeSiteData; other fields are server-truth.
 */
export class StateStore {
    private state: PortalState;
    private listeners = new Set<(state: PortalState) => void>();

    constructor(initial: PortalState) {
        this.state = initial;
    }

    get(): PortalState {
        return this.state;
    }

    setMember(member: MemberState | null): void {
        if (this.state.member === member) return;
        this.state = {...this.state, member};
        this.notify();
    }

    /** Merge the Content API settings payload into state.site. */
    mergeSettings(settings: Record<string, unknown>): void {
        const s = settings;
        const access = s.members_signup_access;
        const commentsAccess = s.comments_enabled;
        const site: SiteState = {
            ...this.state.site,
            title: typeof s.title === 'string' ? s.title : this.state.site.title,
            locale: typeof s.locale === 'string' ? s.locale : this.state.site.locale,
            icon: typeof s.icon === 'string' ? s.icon : undefined,
            accent_color: typeof s.accent_color === 'string' ? s.accent_color : undefined,
            portal_name: typeof s.portal_name === 'boolean' ? s.portal_name : undefined,
            portal_signup_terms_html: typeof s.portal_signup_terms_html === 'string' ? s.portal_signup_terms_html : null,
            portal_signup_checkbox_required: typeof s.portal_signup_checkbox_required === 'boolean' ? s.portal_signup_checkbox_required : undefined,
            portal_plans: stringArray(s.portal_plans),
            portal_button: typeof s.portal_button === 'boolean' ? s.portal_button : undefined,
            portal_default_plan: typeof s.portal_default_plan === 'string' ? s.portal_default_plan : undefined,
            paid_members_enabled: typeof s.paid_members_enabled === 'boolean' ? s.paid_members_enabled : undefined,
            members_signup_access: access === 'all' || access === 'invite' || access === 'none' || access === 'paid' ? access : undefined,
            allow_self_signup: typeof s.allow_self_signup === 'boolean' ? s.allow_self_signup : undefined,
            donations_enabled: typeof s.donations_enabled === 'boolean' ? s.donations_enabled : undefined,
            recommendations_enabled: typeof s.recommendations_enabled === 'boolean' ? s.recommendations_enabled : undefined,
            firstpromoter_account: typeof s.firstpromoter_account === 'string' ? s.firstpromoter_account : undefined,
            outbound_link_tagging: typeof s.outbound_link_tagging === 'boolean' ? s.outbound_link_tagging : undefined,
            comments_enabled: commentsAccess === 'all' || commentsAccess === 'paid' || commentsAccess === 'off' ? commentsAccess : undefined,
            transistor_portal_enabled: typeof s.transistor_portal_enabled === 'boolean' ? s.transistor_portal_enabled : undefined,
            transistor_portal_heading: typeof s.transistor_portal_heading === 'string' ? s.transistor_portal_heading : undefined,
            transistor_portal_description: typeof s.transistor_portal_description === 'string' ? s.transistor_portal_description : undefined,
            transistor_portal_button_text: typeof s.transistor_portal_button_text === 'string' ? s.transistor_portal_button_text : undefined,
            transistor_portal_url_template: typeof s.transistor_portal_url_template === 'string' ? s.transistor_portal_url_template : undefined,
            support_email_address: typeof s.support_email_address === 'string' ? s.support_email_address : undefined,
            default_email_address: typeof s.default_email_address === 'string' ? s.default_email_address : undefined
        };
        this.state = {...this.state, site};
        this.notify();
    }

    /** Apply admin-preview URL overrides on top of fetched settings. */
    mergePreviewSite(overrides: Partial<SiteState>): void {
        this.state = {...this.state, site: {...this.state.site, ...overrides}};
        this.notify();
    }

    /** Merge fields only GET /members/api/site provides (sentry config, Ghost version). */
    mergeMembersSite(input: unknown): void {
        if (!input || typeof input !== 'object') return;
        const s = input as Record<string, unknown>;
        const site: SiteState = {
            ...this.state.site,
            sentry_dsn: typeof s.sentry_dsn === 'string' ? s.sentry_dsn : undefined,
            sentry_env: typeof s.sentry_env === 'string' ? s.sentry_env : undefined,
            version: typeof s.version === 'string' ? s.version : undefined
        };
        this.state = {...this.state, site};
        this.notify();
    }

    /** Merge lazily-fetched tiers/newsletters into state.site, validated like the blob. */
    mergeSiteData(data: {tiers?: unknown[]; newsletters?: unknown[]}): void {
        const site = {...this.state.site};
        if (Array.isArray(data.tiers)) {
            site.tiers = data.tiers.map(validateTier).filter((t): t is SiteTier => t !== null);
        }
        if (Array.isArray(data.newsletters)) {
            site.newsletters = data.newsletters.map(validateNewsletter).filter((n): n is SiteNewsletter => n !== null);
        }
        this.state = {...this.state, site};
        this.notify();
    }

    /**
     * Drop a feature from the active list at runtime — used for defense-in-depth when
     * a dependency check fails (e.g., gift configured on but members off).
     */
    removeFeature(name: FeatureName): void {
        if (!this.state.features.includes(name)) return;
        this.state = {...this.state, features: this.state.features.filter(f => f !== name)};
        this.notify();
    }

    subscribe(listener: (state: PortalState) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        for (const listener of this.listeners) listener(this.state);
    }
}
