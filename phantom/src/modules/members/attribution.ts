// Signup attribution (PRD section 16): resolves the portal's url history
// (written by the member-attribution script) into the converting page and
// referrer source, mirroring Ghost's referrer translation rules.

export type UrlHistoryEntry = {
    time?: number;
    path?: string;
    referrerSource?: string | null;
    referrerMedium?: string | null;
    referrerUrl?: string | null;
};

export type ResolvedAttribution = {
    source: string | null;
    medium: string | null;
    referrerUrl: string | null;
    url: string | null;
    title: string | null;
    type: string | null;
};

const KNOWN_SOURCES: Record<string, string> = {
    twitter: 'Twitter',
    x: 'Twitter',
    facebook: 'Facebook',
    google: 'Google',
    duckduckgo: 'DuckDuckGo',
    bing: 'Bing',
    reddit: 'Reddit'
};

const translateSource = (raw: string): string => {
    const normalized = raw.trim().toLowerCase();
    if (normalized.endsWith('-newsletter')) {
        return normalized.replaceAll('-', ' ');
    }
    return KNOWN_SOURCES[normalized] ?? raw;
};

const sourceFromReferrerUrl = (referrerUrl: string): string | null => {
    try {
        const hostname = new URL(referrerUrl).hostname.replace(/^www\./, '');
        const label = hostname.split('.')[0];
        if (!label) {
            return null;
        }
        return KNOWN_SOURCES[label] ?? label.charAt(0).toUpperCase() + label.slice(1);
    } catch {
        return null;
    }
};

const isSameHost = (referrerUrl: string, siteUrl?: string) => {
    if (!siteUrl) {
        return false;
    }
    try {
        return new URL(referrerUrl).hostname === new URL(siteUrl).hostname;
    } catch {
        return false;
    }
};

export const resolveAttribution = async (
    history: UrlHistoryEntry[],
    resolvePage: (path: string) => Promise<{title: string; type: string} | null>,
    siteUrl?: string
): Promise<ResolvedAttribution> => {
    const entries = [...history].sort((left, right) => (right.time ?? 0) - (left.time ?? 0));

    // Ghost stores the literal 'Direct' for unattributed signups; the admin
    // only renders the Source row when referrer_source is set.
    let source: string | null = entries.length > 0 ? 'Direct' : null;
    let medium: string | null = null;
    let referrerUrl: string | null = null;
    for (const entry of entries) {
        if (entry.referrerSource) {
            source = translateSource(entry.referrerSource);
            medium = entry.referrerMedium ?? null;
            referrerUrl = entry.referrerUrl ?? null;
            break;
        }
        if (entry.referrerUrl && !isSameHost(entry.referrerUrl, siteUrl)) {
            source = sourceFromReferrerUrl(entry.referrerUrl);
            medium = entry.referrerMedium ?? null;
            referrerUrl = entry.referrerUrl;
            break;
        }
    }

    // Ghost prefers the newest visited resource (post/page) over generic
    // urls; the homepage only wins when no resource was visited at all.
    let url: string | null = null;
    let title: string | null = null;
    let type: string | null = null;
    for (const entry of entries) {
        if (typeof entry.path !== 'string') {
            continue;
        }
        const path = entry.path;
        if (path === '/' || path === '') {
            continue;
        }
        const page = await resolvePage(path);
        if (page) {
            url = path;
            title = page.title;
            type = page.type;
            break;
        }
    }
    if (!url) {
        const newest = entries.find((entry) => typeof entry.path === 'string');
        if (newest) {
            const path = newest.path!;
            url = path === '' ? '/' : path;
            title = url === '/' ? 'homepage' : url;
            type = 'url';
        }
    }

    return {source, medium, referrerUrl, url, title, type};
};
