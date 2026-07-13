// UI-prototype data layer for the Growth > Paywalls section.
//
// Frontend-only prototype: each "card" is a real Koenig Call to Action card, so
// we store its Lexical editor-state JSON (a string) per platform + audience and
// persist it to localStorage. No backend, no theme wiring.

export type Platform = 'web' | 'email';

// Web content can be gated for any of these audiences; email has no "public"
// state (emails only ever reach members).
export type Audience = 'public' | 'free' | 'paid' | 'tier';

export const PLATFORM_AUDIENCES: Record<Platform, Audience[]> = {
    web: ['public', 'free', 'paid', 'tier'],
    email: ['free', 'paid', 'tier']
};

export const AUDIENCE_LABELS: Record<Audience, string> = {
    public: 'Public visitors',
    free: 'Free members',
    paid: 'Paid members',
    tier: 'Specific tiers'
};

// Each platform holds one Lexical editor-state string per audience.
export type PaywallConfig = Record<Platform, Partial<Record<Audience, string>>>;

const PLANS_URL = 'https://example.com/#/portal/account/plans';
const SIGNUP_URL = 'https://example.com/#/portal/signup';

const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Default visibility (mirrors the shape Koenig serializes) — the editor's
// visibility panel reads/writes this.
const defaultVisibility = () => ({
    web: {nonMember: true, memberSegment: 'status:free,status:-free'},
    email: {memberSegment: 'status:free,status:-free'}
});

interface CardSeed {
    text: string;
    buttonText: string;
    buttonUrl: string;
    backgroundColor?: string;
}

// A single Koenig "call-to-action" node, matching the serialized shape Ghost
// uses (see ghost/core test fixtures / koenig renderer).
const ctaNode = ({text, buttonText, buttonUrl, backgroundColor = 'grey'}: CardSeed) => ({
    type: 'call-to-action',
    version: 1,
    layout: 'minimal',
    alignment: 'left',
    textValue: `<p dir="ltr"><span style="white-space: pre-wrap;">${escapeHtml(text)}</span></p>`,
    showButton: true,
    showDividers: true,
    buttonText,
    buttonUrl,
    buttonColor: 'accent',
    buttonTextColor: '#ffffff',
    hasSponsorLabel: false,
    sponsorLabel: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>',
    backgroundColor,
    linkColor: 'text',
    imageUrl: '',
    imageWidth: null,
    imageHeight: null,
    visibility: defaultVisibility()
});

// Wrap a CTA node in a full Lexical root document and stringify for use as the
// editor's initialEditorState.
const lexicalDoc = (seed: CardSeed) => JSON.stringify({
    root: {
        children: [ctaNode(seed)],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1
    }
});

const SEEDS: Record<Platform, Partial<Record<Audience, CardSeed>>> = {
    web: {
        public: {text: 'Sign up now to read the rest of this post and get access to members-only content.', buttonText: 'Subscribe', buttonUrl: SIGNUP_URL},
        free: {text: 'This post is for paying subscribers only. Upgrade your account to keep reading.', buttonText: 'Upgrade', buttonUrl: PLANS_URL},
        paid: {text: 'This post is for subscribers on a higher tier. Upgrade your plan to continue reading.', buttonText: 'Upgrade', buttonUrl: PLANS_URL},
        tier: {text: 'This post is for subscribers on select tiers only.', buttonText: 'View plans', buttonUrl: PLANS_URL}
    },
    email: {
        free: {text: 'This post is for paying subscribers only. Upgrade to read the full post.', buttonText: 'Upgrade', buttonUrl: PLANS_URL},
        paid: {text: 'This post is for subscribers on a higher tier. Upgrade to keep reading.', buttonText: 'Upgrade', buttonUrl: PLANS_URL},
        tier: {text: 'This post is for subscribers on select tiers only.', buttonText: 'View plans', buttonUrl: PLANS_URL}
    }
};

export const DEFAULT_CONFIG: PaywallConfig = {
    web: Object.fromEntries(PLATFORM_AUDIENCES.web.map(a => [a, lexicalDoc(SEEDS.web[a]!)])),
    email: Object.fromEntries(PLATFORM_AUDIENCES.email.map(a => [a, lexicalDoc(SEEDS.email[a]!)]))
};

const STORAGE_KEY = 'admin-x-settings:paywalls:v3';

export const loadConfig = (): PaywallConfig => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return DEFAULT_CONFIG;
        }
        const parsed = JSON.parse(raw) as Partial<PaywallConfig>;
        return {
            web: {...DEFAULT_CONFIG.web, ...parsed.web},
            email: {...DEFAULT_CONFIG.email, ...parsed.email}
        };
    } catch {
        return DEFAULT_CONFIG;
    }
};

export const saveConfig = (config: PaywallConfig): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Prototype only — ignore storage failures (e.g. private mode).
    }
};

// ----- Theme vs custom mode -----
//
// Site-level choice: leave the CTA to the theme's built-in content CTA, or
// override it with the custom CTA cards. It's a single value shared by the
// global (Settings) and post-specific editors so the two stay in lockstep —
// whichever place you set it, the other reflects it. Persisted under a neutral
// key that both the settings app and the in-post editor read (same origin, so
// localStorage is shared in this prototype).
export type PaywallMode = 'theme' | 'custom';

export const DEFAULT_MODE: PaywallMode = 'theme';

const MODE_STORAGE_KEY = 'ghost:paywall:mode';

export const loadMode = (): PaywallMode => {
    try {
        return localStorage.getItem(MODE_STORAGE_KEY) === 'custom' ? 'custom' : DEFAULT_MODE;
    } catch {
        return DEFAULT_MODE;
    }
};

export const saveMode = (mode: PaywallMode): void => {
    try {
        localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch {
        // Prototype only — ignore storage failures (e.g. private mode).
    }
};

// Raw Koenig CTA node shape (the subset we read/write).
export interface CtaNode {
    backgroundColor: string;
    buttonColor?: string;
    layout?: string;
    alignment?: string;
    [key: string]: unknown;
}

// Pull the first call-to-action node out of a Lexical editor-state string.
export const extractCtaNode = (editorState?: string): CtaNode | null => {
    if (!editorState) {
        return null;
    }
    try {
        const state = JSON.parse(editorState) as {root?: {children?: Array<{type?: string}>}};
        const node = state.root?.children?.find(child => child.type === 'call-to-action');
        return (node as CtaNode) || null;
    } catch {
        return null;
    }
};

// ----- Global / per-card design styles -----

// The design properties we expose as "global" styles (with per-card override).
export interface DesignStyles {
    backgroundColor: string;
    buttonColor: string;
    linkColor: string;
    layout: string;
    alignment: string;
}

export const DESIGN_PROPS: (keyof DesignStyles)[] = ['backgroundColor', 'buttonColor', 'linkColor', 'layout', 'alignment'];

export const DEFAULT_GLOBAL: DesignStyles = {
    backgroundColor: 'grey',
    buttonColor: 'accent',
    linkColor: 'text',
    layout: 'minimal',
    alignment: 'left'
};

// Representative solid colors for the background swatch dots.
export const BG_SWATCHES: Record<string, string> = {
    grey: '#97a3af',
    white: '#ffffff',
    blue: '#21ace8',
    green: '#34b743',
    yellow: '#f0a50f',
    red: '#d12e2e',
    pink: '#e147ae',
    purple: '#8755ec',
    none: 'transparent'
};

export const BG_ORDER = Object.keys(BG_SWATCHES);

// Read the design props from a card's editor state (falling back to defaults).
export const readDesign = (editorState?: string): DesignStyles => {
    const node = extractCtaNode(editorState);
    return {
        backgroundColor: (node?.backgroundColor as string) ?? DEFAULT_GLOBAL.backgroundColor,
        buttonColor: (node?.buttonColor as string) ?? DEFAULT_GLOBAL.buttonColor,
        linkColor: (node?.linkColor as string) ?? DEFAULT_GLOBAL.linkColor,
        layout: (node?.layout as string) ?? DEFAULT_GLOBAL.layout,
        alignment: (node?.alignment as string) ?? DEFAULT_GLOBAL.alignment
    };
};

// Set a single design prop on the CTA node inside a Lexical editor-state string.
export const setCtaProp = (editorState: string | undefined, prop: keyof DesignStyles, value: string): string | undefined => {
    if (!editorState) {
        return editorState;
    }
    try {
        const state = JSON.parse(editorState) as {root?: {children?: Array<Record<string, unknown>>}};
        const node = state.root?.children?.find(child => child.type === 'call-to-action');
        if (!node) {
            return editorState;
        }
        node[prop] = value;
        return JSON.stringify(state);
    } catch {
        return editorState;
    }
};
