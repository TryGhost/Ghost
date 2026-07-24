import DOMPurify from 'dompurify';

const SAFE_URL_PROTOCOLS = ['http:', 'https:', 'mailto:'];

export function isSafeUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return SAFE_URL_PROTOCOLS.includes(parsed.protocol);
    } catch {
        return false;
    }
}

export function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

export function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html);
}

// Removes any <script> unless it loads a Twitter/X embed widget from an allowed
// host; allowed scripts keep only their src, never inline code.
function stripDisallowedScript(element: Element): void {
    // Must stay in sync with allowedScriptHostnames in the backend sanitizer
    // (https://github.com/TryGhost/ActivityPub/blob/main/src/helpers/html.ts)
    const allowedScriptHostnames = ['platform.twitter.com', 'platform.x.com'];

    let hasAllowedSrc = false;
    try {
        // Relative URLs must not pass, so no base URL here
        const url = new URL(element.getAttribute('src') || '');
        hasAllowedSrc = url.protocol === 'https:' && allowedScriptHostnames.includes(url.hostname);
    } catch {
        hasAllowedSrc = false;
    }

    if (!hasAllowedSrc) {
        element.parentNode?.removeChild(element);
        return;
    }

    // Allowed scripts may only load code via src, never run inline code
    element.textContent = '';
}

// Removes iframes we can't safely embed and forces a restrictive sandbox on the rest.
function sandboxIframe(element: Element): void {
    // Only keep iframes with an absolute, cross-origin http(s) source. A relative
    // or same-origin src would run same-origin with Ghost Admin, where allow-scripts
    // + allow-same-origin can defeat the sandbox. This also rejects javascript:/data:
    // and other non-http(s) schemes.
    let isCrossOrigin = false;
    try {
        const url = new URL(element.getAttribute('src') || '', window.location.href);
        isCrossOrigin =
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.origin !== window.location.origin;
    } catch {
        isCrossOrigin = false;
    }

    if (!isCrossOrigin) {
        element.parentNode?.removeChild(element);
        return;
    }

    // Force a restrictive sandbox onto the (now verified cross-origin) frame,
    // overriding any supplied value. Omits allow-top-navigation (no tab hijacking);
    // allow-same-origin is safe here because the frame is cross-origin. Set before
    // attribute sanitization so it survives via ADD_ATTR.
    element.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms');
}

// Article content needs looser rules than sanitizeHtml (iframes for YouTube
// embeds, scripts for Twitter embeds), so it gets its own DOMPurify instance
const articlePurify = DOMPurify(window);

articlePurify.addHook('uponSanitizeElement', (node, data) => {
    const element = node as Element;

    if (data.tagName === 'script') {
        stripDisallowedScript(element);
    } else if (data.tagName === 'iframe') {
        sandboxIframe(element);
    }
});

export function sanitizeArticleContent(content: string): string {
    return articlePurify.sanitize(content, {
        ADD_TAGS: ['iframe', 'script'],
        ADD_ATTR: ['target', 'frameborder', 'allowfullscreen', 'async', 'charset', 'sandbox'],
        // Without this the HTML parser hoists leading <script>/<style> tags
        // into <head>, which DOMPurify then discards — content starting with
        // an embed script would lose it
        FORCE_BODY: true
    });
}

export function stripHtml(html: string, exclude: string[] = []): string {
    // If no exclusions, use the original logic
    if (exclude.length === 0) {
        // Replace <br> tags with spaces
        const withLineBreaks = html.replace(/<br\s*\/?>/gi, ' ');

        // Replace tags that should have a space after them
        const withSpaces = withLineBreaks.replace(/<\/p>\s*<p>|<\/div>\s*<div>|<\/h[1-6]>\s*<|<\/li>\s*<li>|<\/a>/gi, ' ');

        // Remove all HTML tags
        return withSpaces.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }

    // Convert exclusions to lowercase for case-insensitive matching
    const excludeTags = exclude.map(tag => tag.toLowerCase());

    // Create a temporary placeholder for excluded tags
    const placeholders: {[key: string]: string} = {};
    let placeholderCount = 0;

    // Convert block-level closing tags to <br> before extracting excluded tags
    // This handles headings, paragraphs, divs, list items, etc.
    const withBlockBreaks = html.replace(/<\/(h[1-6]|p|div|li|blockquote|pre)>/gi, '<br>');

    // Process each excluded tag type (including the <br> tags we just added)
    let processedWithExclusions = withBlockBreaks;
    for (const tag of excludeTags) {
        // Match both opening and closing tags, and self-closing tags
        const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>|<${tag}[^>]*\\/?>`, 'gis');

        processedWithExclusions = processedWithExclusions.replace(regex, (match) => {
            const placeholder = `__EXCLUDED_TAG_${placeholderCount += 1}__`;
            placeholders[placeholder] = match;
            return placeholder;
        });
    }

    // Replace <br> tags with spaces (only if 'br' is not in exclusions)
    let withLineBreaks = processedWithExclusions;
    if (!excludeTags.includes('br')) {
        withLineBreaks = processedWithExclusions.replace(/<br\s*\/?>/gi, ' ');
    }

    // Remove all remaining HTML tags
    let result = withLineBreaks.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

    // Restore the excluded tags
    for (const [placeholder, originalTag] of Object.entries(placeholders)) {
        result = result.replace(placeholder, originalTag);
    }

    return result;
}

export const formatArticle = (content: string, postUrl?: string) => {
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = content;

    if (postUrl) {
        // Find all audio and video card divs
        const mediaCards = div.querySelectorAll('.kg-audio-card, .kg-video-card');

        // Wrap each media card in an anchor tag
        for (let i = 0; i < mediaCards.length; i++) {
            const mediaCard = mediaCards[i] as HTMLElement;
            const wrapper = document.createElement('a');
            wrapper.href = postUrl;
            wrapper.target = '_blank';
            wrapper.rel = 'noopener noreferrer';
            wrapper.style.cursor = 'pointer';
            wrapper.style.display = 'block';
            wrapper.style.textDecoration = 'none';
            wrapper.style.color = 'inherit';

            // Move the media card into the wrapper
            mediaCard.parentNode?.insertBefore(wrapper, mediaCard);
            wrapper.appendChild(mediaCard);
        }
    }

    // Find all anchor tags
    const links = div.getElementsByTagName('a');

    // Add target="_blank" and rel attributes to each link
    for (let i = 0; i < links.length; i++) {
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener noreferrer');
    }

    return div.innerHTML;
};

export const openLinksInNewTab = (content: string) => {
    // Create a temporary div to parse the HTML
    const div = document.createElement('div');
    div.innerHTML = content;

    // Find all anchor tags
    const links = div.getElementsByTagName('a');

    // Add target="_blank" and rel attributes to each link
    for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href') || '';
        // Block javascript:, data:, and other dangerous protocols
        if (href.match(/^\s*(javascript|data|vbscript):/i)) {
            links[i].removeAttribute('href');
        }
        links[i].setAttribute('target', '_blank');
        links[i].setAttribute('rel', 'noopener noreferrer');
    }

    return div.innerHTML;
};

export const enforceVideoCardInlinePlayback = (content: string) => {
    const div = document.createElement('div');
    div.innerHTML = content;

    const videos = div.querySelectorAll('.kg-video-card video');

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i] as HTMLVideoElement;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('x5-playsinline', '');

        if (video.hasAttribute('autoplay')) {
            video.setAttribute('muted', '');
            video.muted = true;
        }
    }

    return div.innerHTML;
};

export const formatFollowNumber = (n: number) => {
    if (n < 10000) {
        return n.toLocaleString();
    }

    const kValue = n / 1000;
    // Round to 1 decimal place if needed
    const formatted = kValue % 1 === 0 ? kValue : kValue.toFixed(1);
    return `${formatted}K`;
};
