const TWITTER_WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';
const TWITTER_DIRECT_EMBED_URL = 'https://platform.twitter.com/embed/Tweet.html';
const TWITTER_DIRECT_EMBED_ORIGIN = 'https://platform.twitter.com';
const TWITTER_DIRECT_EMBED_PATH = '/embed/Tweet.html';
const TWITTER_WIDGET_SCRIPT_HOSTS = new Set(['platform.twitter.com', 'platform.x.com']);
export const TWITTER_EMBED_SELECTOR = 'blockquote.twitter-tweet';

export const TWITTER_EMBED_MIN_HEIGHT = 120;
const TWITTER_EMBED_INITIAL_HEIGHT = 720;
export const TWITTER_EMBED_MAX_HEIGHT = 2000;
export const TWITTER_EMBED_STYLE_MESSAGE = 'ghost-twitter-embed-style';

export interface TwitterEmbedSandboxOptions {
    fontSize?: string;
    fontStyle?: 'sans' | 'serif';
    darkMode?: boolean;
    sepia?: boolean;
}

export interface TwitterEmbedStyleMessage {
    type: typeof TWITTER_EMBED_STYLE_MESSAGE;
    style: TwitterEmbedSandboxOptions;
}

export interface TwitterEmbedStyleOptions {
    backgroundColor: string;
    darkMode: boolean;
    fontSize: string;
    fontStyle: string;
}

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

export const getTwitterEmbedStyleMessage = (options: TwitterEmbedSandboxOptions = {}): TwitterEmbedStyleMessage => ({
    type: TWITTER_EMBED_STYLE_MESSAGE,
    style: options
});

export const getTwitterEmbedOptions = (style: TwitterEmbedStyleOptions): TwitterEmbedSandboxOptions => ({
    fontSize: style.fontSize,
    fontStyle: style.fontStyle === 'serif' ? 'serif' : 'sans',
    darkMode: style.darkMode,
    sepia: style.backgroundColor === 'SEPIA'
});

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

const getTweetIdFromBlockquote = (blockquoteHtml: string) => {
    const div = document.createElement('div');
    div.innerHTML = blockquoteHtml;

    const links = Array.from(div.querySelectorAll('a[href]'));

    for (const link of links) {
        const tweetId = getTweetIdFromUrl(link.getAttribute('href') || '');

        if (tweetId) {
            return tweetId;
        }
    }

    return null;
};

const getDirectTwitterEmbedUrl = (tweetId: string, options: TwitterEmbedSandboxOptions = {}) => {
    const url = new URL(TWITTER_DIRECT_EMBED_URL);

    url.searchParams.set('dnt', 'true');
    url.searchParams.set('id', tweetId);
    url.searchParams.set('theme', options.darkMode ? 'dark' : 'light');

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

const getDirectTwitterEmbedFrameFromMessage = (doc: Document, event: MessageEvent, tweetId: string | null) => {
    const frames = Array.from(doc.querySelectorAll<HTMLIFrameElement>('iframe[data-gh-twitter-direct-embed]'));

    for (const frame of frames) {
        if (!isDirectTwitterEmbedFrame(frame)) {
            continue;
        }

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

export const hasTwitterEmbed = (content: string) => {
    if (!content.includes('twitter-tweet')) {
        return false;
    }

    const div = document.createElement('div');
    div.innerHTML = content;

    return div.querySelector(TWITTER_EMBED_SELECTOR) !== null;
};

export const postTwitterEmbedStyleMessage = (iframe: HTMLIFrameElement | null, options: TwitterEmbedSandboxOptions = {}) => {
    iframe?.contentWindow?.postMessage(getTwitterEmbedStyleMessage(options), '*');
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

export const getTwitterEmbedBridgeScript = () => `
                const twitterEmbedStyleMessageType = '${TWITTER_EMBED_STYLE_MESSAGE}';
                const twitterDirectEmbedOrigin = '${TWITTER_DIRECT_EMBED_ORIGIN}';
                const twitterDirectEmbedPath = '${TWITTER_DIRECT_EMBED_PATH}';

                function parseTwitterEmbedMessageData(data) {
                    if (typeof data === 'string') {
                        try {
                            return JSON.parse(data);
                        } catch {
                            return null;
                        }
                    }

                    if (data && typeof data === 'object') {
                        return data;
                    }

                    return null;
                }

                function getDirectTwitterEmbedTheme(style) {
                    return style && style.darkMode ? 'dark' : 'light';
                }

                function isDirectTwitterEmbedFrame(frame) {
                    try {
                        const url = new URL(frame.getAttribute('src') || '', window.location.href);
                        return url.origin === twitterDirectEmbedOrigin && url.pathname === twitterDirectEmbedPath;
                    } catch {
                        return false;
                    }
                }

                function getDirectTwitterEmbedFrameFromMessage(event, tweetId) {
                    const frames = document.querySelectorAll('iframe[data-gh-twitter-direct-embed]');

                    for (const frame of frames) {
                        if (!isDirectTwitterEmbedFrame(frame)) {
                            continue;
                        }

                        if (frame.contentWindow === event.source) {
                            return frame;
                        }

                        if (event.origin === twitterDirectEmbedOrigin && tweetId && frame.getAttribute('data-tweet-id') === String(tweetId)) {
                            return frame;
                        }
                    }

                    return null;
                }

                function updateTwitterEmbedStyle(data) {
                    const theme = getDirectTwitterEmbedTheme(data.style);
                    const frames = document.querySelectorAll('iframe[data-gh-twitter-direct-embed]');

                    for (const frame of frames) {
                        try {
                            const url = new URL(frame.getAttribute('src') || '', window.location.href);

                            if (url.origin !== twitterDirectEmbedOrigin || url.pathname !== twitterDirectEmbedPath) {
                                continue;
                            }

                            if (url.searchParams.get('theme') === theme) {
                                continue;
                            }

                            url.searchParams.set('theme', theme);
                            frame.style.height = '${TWITTER_EMBED_INITIAL_HEIGHT}px';
                            frame.setAttribute('src', url.toString());
                        } catch {
                            continue;
                        }
                    }

                    if (typeof resizeIframe === 'function') {
                        resizeIframe();
                    }
                }

                function resizeDirectTwitterEmbed(event) {
                    const data = parseTwitterEmbedMessageData(event.data);
                    const embedMessage = data && data.twttr && data.twttr.embed;

                    if (!embedMessage || embedMessage.method !== 'twttr.private.resize') {
                        return false;
                    }

                    const params = embedMessage.params && embedMessage.params[0] || {};
                    const tweetId = params.data && params.data.tweet_id;
                    const height = Number(params.height);

                    if (!Number.isFinite(height)) {
                        return true;
                    }

                    const frame = getDirectTwitterEmbedFrameFromMessage(event, tweetId);

                    if (frame) {
                        const boundedHeight = Math.min(Math.max(height, ${TWITTER_EMBED_MIN_HEIGHT}), ${TWITTER_EMBED_MAX_HEIGHT});
                        frame.style.height = boundedHeight + 'px';
                    }

                    if (typeof resizeIframe === 'function') {
                        resizeIframe();
                    }
                    return true;
                }

                window.addEventListener('message', (event) => {
                    const data = event.data || {};

                    if (data.type === twitterEmbedStyleMessageType) {
                        updateTwitterEmbedStyle(data);
                        return;
                    }

                    if (resizeDirectTwitterEmbed(event)) {
                        return;
                    }
                });
`;

export const renderTwitterEmbedInSandbox = (blockquoteHtml: string, options: TwitterEmbedSandboxOptions = {}) => {
    const tweetId = getTweetIdFromBlockquote(blockquoteHtml);

    if (!tweetId) {
        return null;
    }

    return buildDirectTwitterEmbedIframe(tweetId, options);
};

const buildDirectTwitterEmbedIframe = (tweetId: string, options: TwitterEmbedSandboxOptions = {}) => {
    const iframe = document.createElement('iframe');

    iframe.className = 'gh-twitter-embed';
    iframe.title = 'Embedded Twitter post';
    iframe.src = getDirectTwitterEmbedUrl(tweetId, options);
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

export const renderTwitterEmbedsInArticle = (content: string, getOptions: () => TwitterEmbedSandboxOptions): TwitterEmbeddedArticle => {
    const div = document.createElement('div');
    div.innerHTML = content;

    const twitterEmbeds = Array.from(div.querySelectorAll(TWITTER_EMBED_SELECTOR));

    if (twitterEmbeds.length === 0) {
        return {
            hasTwitterEmbeds: false,
            html: content
        };
    }

    let options: TwitterEmbedSandboxOptions | null = null;
    let hasRenderedTwitterEmbeds = false;

    div.querySelectorAll('script').forEach((script) => {
        if (isTwitterWidgetScript(script)) {
            script.remove();
        }
    });

    for (const twitterEmbed of twitterEmbeds) {
        const tweetId = getTweetIdFromBlockquote(twitterEmbed.outerHTML);

        if (!tweetId) {
            continue;
        }

        options = options || getOptions();
        twitterEmbed.replaceWith(buildDirectTwitterEmbedIframe(tweetId, options));
        hasRenderedTwitterEmbeds = true;
    }

    return {
        hasTwitterEmbeds: hasRenderedTwitterEmbeds,
        html: div.innerHTML
    };
};
