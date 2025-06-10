// Source domain mapping for favicons
export const SOURCE_DOMAIN_MAP: Record<string, string> = {
    Reddit: 'reddit.com',
    'www.reddit.com': 'reddit.com',
    Facebook: 'facebook.com',
    Twitter: 'twitter.com',
    Bluesky: 'bsky.app',
    'go.bsky.app': 'bsky.app',
    Instagram: 'instagram.com',
    LinkedIn: 'linkedin.com',
    Threads: 'threads.net',
    'Brave Search': 'search.brave.com',
    Ecosia: 'ecosia.org',
    Gmail: 'gmail.com',
    Outlook: 'outlook.com',
    'Yahoo!': 'yahoo.com',
    'AOL Mail': 'aol.com',
    Flipboard: 'flipboard.com',
    Substack: 'substack.com',
    Ghost: 'ghost.org',
    'Ghost Explore': 'ghost.org',
    Buffer: 'buffer.com',
    Taboola: 'taboola.com',
    AppNexus: 'appnexus.com',
    Wikipedia: 'wikipedia.org',
    Mastodon: 'mastodon.social',
    Memeorandum: 'memeorandum.com',
    'Ground News': 'ground.news',
    'Apple News': 'apple.com',
    SmartNews: 'smartnews.com',
    'Hacker News': 'news.ycombinator.com',
    // Search engines
    Google: 'google.com',
    'Google News': 'news.google.com',
    Bing: 'bing.com',
    DuckDuckGo: 'duckduckgo.com',
    // Email/Newsletter
    'newsletter-email': 'static.ghost.org',
    newsletter: 'static.ghost.org'
};

// Helper function to extract domain from URL
export const extractDomain = (url: string): string | null => {
    try {
        const domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        return domain.replace(/^www\./, '');
    } catch {
        return null;
    }
};

// Helper function to check if a domain is the same or a subdomain
export const isDomainOrSubdomain = (sourceDomain: string, siteDomain: string): boolean => {
    // Exact match
    if (sourceDomain === siteDomain) {
        return true;
    }
    
    // Subdomain check: source should end with ".siteDomain"
    return sourceDomain.endsWith(`.${siteDomain}`);
};

// Helper function to get favicon domain and determine if it's direct traffic
export const getFaviconDomain = (source: string | number | undefined, siteUrl?: string): {domain: string | null, isDirectTraffic: boolean} => {
    if (!source || typeof source !== 'string') {
        return {domain: null, isDirectTraffic: false};
    }
    
    // Extract site domain for comparison
    const siteDomain = siteUrl ? extractDomain(siteUrl) : null;
    
    // Check if source matches site domain or is a subdomain (treat as direct traffic)
    if (siteDomain) {
        const sourceDomain = extractDomain(source);
        if (sourceDomain && isDomainOrSubdomain(sourceDomain, siteDomain)) {
            return {domain: siteDomain, isDirectTraffic: true};
        }
        
        // Also check the source string directly (in case it's already just a domain)
        if (isDomainOrSubdomain(source, siteDomain)) {
            return {domain: siteDomain, isDirectTraffic: true};
        }
    }
    
    // First check our mapping for known sources
    const mappedDomain = SOURCE_DOMAIN_MAP[source];
    if (mappedDomain) {
        return {domain: mappedDomain, isDirectTraffic: false};
    }
    
    // If not in mapping, check if it's already a domain
    const isDomain = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(source);
    if (isDomain) {
        // Clean up the domain by removing www. prefix
        const cleanDomain = source.replace(/^www\./, '');
        return {domain: cleanDomain, isDirectTraffic: false};
    }
    
    // No domain found
    return {domain: null, isDirectTraffic: false};
}; 