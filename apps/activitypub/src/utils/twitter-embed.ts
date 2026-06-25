const TWITTER_WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';
const TWITTER_DIRECT_EMBED_URL = 'https://platform.twitter.com/embed/Tweet.html';
const TWITTER_DIRECT_EMBED_ORIGIN = 'https://platform.twitter.com';
const TWITTER_DIRECT_EMBED_PATH = '/embed/Tweet.html';
const TWITTER_WIDGET_SCRIPT_HOSTS = new Set(['platform.twitter.com', 'platform.x.com']);
const TWITTER_EMBED_SELECTOR = 'blockquote.twitter-tweet';

const TWITTER_EMBED_MIN_HEIGHT = 120;
const TWITTER_EMBED_INITIAL_HEIGHT = 720;
const TWITTER_EMBED_MAX_HEIGHT = 2000;

export interface TwitterEmbeddedArticle {
    hasTwitterEmbeds: boolean;
    html: string;
}

interface TwitterEmbedResizeMessage {
    height: number;
    tweetId: string | null;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object';
};

const getTweetIdFromUrl = (href: string) => {
    try {
        const url = new URL(href, window.location.href);

        if (url.hostname !== 'twitter.com' && url.hostname !== 'www.twitter.com' && url.hostname !== 'x.com' && url.hostname !== 'www.x.com') {
            return null;
        }

        return url.pathname.match(/^\/[^/]+\/status(?:es)?\/(\d+)/)?.[1] || null;
    } catch {
        return null;
    }
};

const getTweetIdFromElement = (element: Element) => {
    for (const link of Array.from(element.querySelectorAll('a[href]'))) {
        const tweetId = getTweetIdFromUrl(link.getAttribute('href') || '');

        if (tweetId) {
            return tweetId;
        }
    }

    return null;
};

const getDirectTwitterEmbedUrl = (tweetId: string, darkMode: boolean) => {
    const url = new URL(TWITTER_DIRECT_EMBED_URL);

    url.searchParams.set('dnt', 'true');
    url.searchParams.set('id', tweetId);
    url.searchParams.set('theme', darkMode ? 'dark' : 'light');

    return url.toString();
};

const parseTwitterEmbedMessageData = (data: unknown): Record<string, unknown> | null => {
    if (typeof data === 'string') {
        try {
            const parsedData: unknown = JSON.parse(data);
            return isObjectRecord(parsedData) ? parsedData : null;
        } catch {
            return null;
        }
    }

    if (isObjectRecord(data)) {
        return data;
    }

    return null;
};

const getTwitterEmbedResizeMessage = (data: unknown): TwitterEmbedResizeMessage | null => {
    const messageData = parseTwitterEmbedMessageData(data);
    const twttr = isObjectRecord(messageData?.twttr) ? messageData.twttr : null;
    const embedMessage = isObjectRecord(twttr?.embed) ? twttr.embed : null;

    if (!embedMessage || embedMessage.method !== 'twttr.private.resize') {
        return null;
    }

    const paramsList = Array.isArray(embedMessage.params) ? embedMessage.params : [];
    const params = isObjectRecord(paramsList[0]) ? paramsList[0] : {};
    const height = Number(params.height);

    if (!Number.isFinite(height)) {
        return null;
    }

    const dataObject = isObjectRecord(params.data) ? params.data : null;
    const tweetId = dataObject?.tweet_id;

    return {
        height,
        tweetId: tweetId === undefined || tweetId === null ? null : String(tweetId)
    };
};

const isDirectTwitterEmbedFrame = (frame: HTMLIFrameElement) => {
    try {
        const url = new URL(frame.getAttribute('src') || '', window.location.href);
        return url.origin === TWITTER_DIRECT_EMBED_ORIGIN && url.pathname === TWITTER_DIRECT_EMBED_PATH;
    } catch {
        return false;
    }
};

const getDirectTwitterEmbedFrames = (doc: Document) => {
    return Array.from(doc.querySelectorAll<HTMLIFrameElement>('iframe[data-gh-twitter-direct-embed]')).filter(isDirectTwitterEmbedFrame);
};

const getDirectTwitterEmbedFrameFromMessage = (doc: Document, event: MessageEvent, tweetId: string | null) => {
    for (const frame of getDirectTwitterEmbedFrames(doc)) {
        if (frame.contentWindow === event.source) {
            return frame;
        }

        if (event.origin === TWITTER_DIRECT_EMBED_ORIGIN && tweetId && frame.getAttribute('data-tweet-id') === tweetId) {
            return frame;
        }
    }

    return null;
};

const setDirectTwitterEmbedHeight = (frame: HTMLIFrameElement, height: number) => {
    const boundedHeight = Math.min(Math.max(height, TWITTER_EMBED_MIN_HEIGHT), TWITTER_EMBED_MAX_HEIGHT);
    frame.style.height = `${boundedHeight}px`;
};

// Twitter posts `twttr.private.resize` messages so the embed can size itself. Depending on the
// browser these arrive at either the article iframe window or the outer reader window, so the
// reader listens on both and routes the message here. The article iframe is a same-origin srcdoc,
// so we can size the embedded frame inside it directly.
export const resizeTwitterEmbedFromMessage = (articleIframe: HTMLIFrameElement | null, event: MessageEvent) => {
    const resizeMessage = getTwitterEmbedResizeMessage(event.data);
    const articleDocument = articleIframe?.contentDocument;

    if (!resizeMessage || !articleDocument) {
        return false;
    }

    const frame = getDirectTwitterEmbedFrameFromMessage(articleDocument, event, resizeMessage.tweetId);

    if (!frame) {
        return false;
    }

    setDirectTwitterEmbedHeight(frame, resizeMessage.height);
    articleIframe.contentWindow?.postMessage({type: 'triggerResize'}, '*');

    return true;
};

// The reader theme (light/dark) is the only customizer setting Twitter's embed honours. When it
// changes we reload each embed with the matching `theme` param — direct DOM access works because
// the article iframe is a same-origin srcdoc.
export const applyTwitterEmbedTheme = (articleIframe: HTMLIFrameElement | null, darkMode: boolean) => {
    const articleDocument = articleIframe?.contentDocument;

    if (!articleDocument) {
        return;
    }

    const theme = darkMode ? 'dark' : 'light';
    let changed = false;

    for (const frame of getDirectTwitterEmbedFrames(articleDocument)) {
        const url = new URL(frame.getAttribute('src') || '', window.location.href);

        if (url.searchParams.get('theme') === theme) {
            continue;
        }

        url.searchParams.set('theme', theme);
        frame.style.height = `${TWITTER_EMBED_INITIAL_HEIGHT}px`;
        frame.setAttribute('src', url.toString());
        changed = true;
    }

    if (changed) {
        articleIframe.contentWindow?.postMessage({type: 'triggerResize'}, '*');
    }
};

export const isTwitterWidgetScript = (script: HTMLScriptElement) => {
    const src = script.getAttribute('src');

    if (!src) {
        return false;
    }

    try {
        const url = new URL(src, window.location.href);
        const twitterWidgetUrl = new URL(TWITTER_WIDGET_SCRIPT_URL);
        return TWITTER_WIDGET_SCRIPT_HOSTS.has(url.hostname) && url.pathname === twitterWidgetUrl.pathname;
    } catch {
        return false;
    }
};

const buildDirectTwitterEmbedIframe = (tweetId: string, darkMode: boolean) => {
    const iframe = document.createElement('iframe');

    iframe.className = 'gh-twitter-embed';
    iframe.title = 'Embedded Twitter post';
    iframe.src = getDirectTwitterEmbedUrl(tweetId, darkMode);
    iframe.loading = 'lazy';
    iframe.setAttribute('data-gh-twitter-direct-embed', '');
    iframe.setAttribute('data-tweet-id', tweetId);
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox');
    iframe.setAttribute('scrolling', 'auto');
    iframe.style.width = '100%';
    iframe.style.maxWidth = '550px';
    iframe.style.height = `${TWITTER_EMBED_INITIAL_HEIGHT}px`;
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.margin = '0 auto';
    iframe.style.overflow = 'auto';

    return iframe;
};

// ActivityPub serves sanitized remote HTML with Twitter widget scripts stripped, so the original
// `blockquote.twitter-tweet` markup never hydrates into a tweet. We replace each blockquote that
// has a resolvable tweet ID with a sandboxed direct embed iframe and drop the now-useless widget
// loader script. Blockquotes without a tweet ID are left untouched as a sanitized fallback.
export const renderTwitterEmbedsInArticle = (content: string, darkMode: boolean): TwitterEmbeddedArticle => {
    if (!content.includes('twitter-tweet')) {
        return {hasTwitterEmbeds: false, html: content};
    }

    const div = document.createElement('div');
    div.innerHTML = content;

    const twitterEmbeds = Array.from(div.querySelectorAll(TWITTER_EMBED_SELECTOR));

    if (twitterEmbeds.length === 0) {
        return {hasTwitterEmbeds: false, html: content};
    }

    let hasRenderedTwitterEmbeds = false;

    div.querySelectorAll('script').forEach((script) => {
        if (isTwitterWidgetScript(script)) {
            script.remove();
        }
    });

    for (const twitterEmbed of twitterEmbeds) {
        const tweetId = getTweetIdFromElement(twitterEmbed);

        if (!tweetId) {
            continue;
        }

        twitterEmbed.replaceWith(buildDirectTwitterEmbedIframe(tweetId, darkMode));
        hasRenderedTwitterEmbeds = true;
    }

    return {
        hasTwitterEmbeds: hasRenderedTwitterEmbeds,
        html: div.innerHTML
    };
};
