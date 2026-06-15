/**
 * Reads OpenGraph / standard meta tags from the host page (not the modal
 * iframe) to build the share preview and social share URLs. Pure DOM — no
 * member API, no network. Verbatim port of `apps/portal/src/components/pages/
 * share/use-share-data.js` lines 39–88, but TypeScript-typed.
 */

export interface ShareData {
    shareUrl: string;
    shareTitle: string;
    shareExcerpt: string;
    shareImage: string;
    shareFavicon: string;
    shareSiteName: string;
    shareAuthor: string;
    socialLinks: {
        twitter: string;
        facebook: string;
        linkedin: string;
        bluesky: string;
        threads: string;
        email: string;
    };
}

/**
 * The modal renders inside an iframe. To read the host page metadata we need
 * the parent window's document. Same-origin frames give us this; if we end up
 * cross-origin we fall back to our own window.
 */
function getHostDocument(): Document {
    try {
        if (window.parent && window.parent !== window && window.parent.document) {
            return window.parent.document;
        }
    } catch {
        // Cross-origin — fall through.
    }
    return document;
}

function getHostLocation(): Location {
    try {
        if (window.parent && window.parent !== window && window.parent.location) {
            return window.parent.location;
        }
    } catch {
        // Cross-origin — fall through.
    }
    return window.location;
}

function meta(doc: Document, selector: string, attr: 'content' | 'href' = 'content'): string {
    const el = doc.querySelector(selector);
    if (!el) return '';
    return el.getAttribute(attr) ?? '';
}

const URL_PROTOCOL_RE = /^https?:\/\//i;

export function useShareData(): ShareData {
    const doc = getHostDocument();
    const loc = getHostLocation();

    const shareUrl =
        meta(doc, 'link[rel="canonical"]', 'href') ||
        loc.origin + loc.pathname + loc.search;
    const shareTitle =
        meta(doc, 'meta[property="og:title"]') ||
        doc.title ||
        '';
    const shareExcerpt =
        meta(doc, 'meta[property="og:description"]') ||
        meta(doc, 'meta[name="description"]') ||
        '';
    const shareImage =
        meta(doc, 'meta[property="og:image"]') ||
        meta(doc, 'meta[name="twitter:image"]') ||
        '';
    const shareFavicon =
        meta(doc, 'link[rel="icon"]', 'href') ||
        meta(doc, 'link[rel="shortcut icon"]', 'href') ||
        meta(doc, 'link[rel="apple-touch-icon"]', 'href') ||
        '';

    // Author fallback chain matches portal: prefer meta[name=author] only if
    // it's NOT a URL (some sites put a profile URL there instead of a name);
    // otherwise fall back to the twitter:creator handle (e.g. "@username").
    const rawAuthor = meta(doc, 'meta[name="author"]');
    const shareAuthor =
        (rawAuthor && !URL_PROTOCOL_RE.test(rawAuthor) ? rawAuthor : '') ||
        meta(doc, 'meta[name="twitter:creator"]') ||
        '';

    let shareSiteName =
        meta(doc, 'meta[property="og:site_name"]') ||
        meta(doc, 'meta[name="application-name"]') ||
        '';
    if (!shareSiteName) {
        try {
            shareSiteName = new URL(shareUrl).hostname.replace(/^www\./, '');
        } catch {
            shareSiteName = '';
        }
    }

    const params = (vals: Record<string, string>): string => new URLSearchParams(vals).toString();
    const intentText = [shareTitle, shareUrl].filter(Boolean).join(' ').trim();

    return {
        shareUrl,
        shareTitle,
        shareExcerpt,
        shareImage,
        shareFavicon,
        shareSiteName,
        shareAuthor,
        socialLinks: {
            twitter: `https://twitter.com/intent/tweet?${params({url: shareUrl, text: shareTitle})}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?${params({u: shareUrl})}`,
            linkedin: `https://www.linkedin.com/shareArticle?${params({mini: 'true', url: shareUrl, title: shareTitle})}`,
            bluesky: `https://bsky.app/intent/compose?${params({text: intentText})}`,
            threads: `https://www.threads.net/intent/post?${params({text: intentText})}`,
            email: `mailto:?${params({subject: shareTitle, body: [shareTitle, shareUrl].filter(Boolean).join('\n\n')})}`
        }
    };
}
