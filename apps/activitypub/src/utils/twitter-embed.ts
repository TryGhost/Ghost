const TWITTER_WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js';
export const TWITTER_EMBED_SELECTOR = 'blockquote.twitter-tweet';

export const TWITTER_EMBED_MIN_HEIGHT = 120;
const TWITTER_EMBED_INITIAL_HEIGHT = 240;
export const TWITTER_EMBED_MAX_HEIGHT = 1200;
export const TWITTER_EMBED_RESIZE_MESSAGE = 'ghost-twitter-embed-resize';
export const TWITTER_EMBED_STYLE_MESSAGE = 'ghost-twitter-embed-style';

export interface TwitterEmbedSandboxOptions {
    fontSize?: string;
    fontStyle?: 'sans' | 'serif';
    darkMode?: boolean;
    sepia?: boolean;
}

export interface TwitterEmbedSandboxStyle {
    fontSize: string;
    fontSizeMultiplier: string;
    textColor: string;
    secondaryTextColor: string;
    linkColor: string;
    bodyClass: 'has-sans-body' | 'has-serif-body';
}

export interface TwitterEmbedStyleMessage {
    type: typeof TWITTER_EMBED_STYLE_MESSAGE;
    style: TwitterEmbedSandboxStyle;
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

const buildTwitterEmbedSrcDoc = (blockquoteHtml: string, options: TwitterEmbedSandboxOptions = {}) => {
    const style = getTwitterEmbedSandboxStyle(options);

    return `<!doctype html>
<html>
<head>
    <base target="_blank">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        :root {
            --color-primary-text: ${style.textColor};
            --color-secondary-text: ${style.secondaryTextColor};
            --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
            --font-serif-alt: Georgia, Times, serif;
            --font-size: ${style.fontSize};
            --font-size-multiplier: ${style.fontSizeMultiplier};
            --twitter-link-color: ${style.linkColor};
        }

        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        * {
            margin: 0;
        }

        html {
            font-size: 62.5%;
        }

        html,
        body {
            padding: 0;
            overflow: hidden;
            background: transparent;
        }

        body {
            min-width: 0;
            color: var(--color-primary-text);
            font-family: var(--font-sans);
            font-size: calc(var(--font-size) * var(--font-size-multiplier));
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .has-serif-body blockquote.twitter-tweet {
            font-family: var(--font-serif-alt);
        }

        blockquote.twitter-tweet {
            width: 100% !important;
            max-width: none !important;
            padding: 0 !important;
            border: 0 !important;
        }

        iframe.twitter-tweet-rendered,
        .twitter-rendered-card {
            margin: 0 auto !important;
            max-width: 550px;
        }

        blockquote.twitter-tweet a:not([class]),
        .twitter-rendered-card__meta a {
            color: var(--twitter-link-color) !important;
            text-decoration: underline !important;
        }

    </style>
</head>
<body class="${style.bodyClass}">
    ${blockquoteHtml}
    <script>
        (function () {
            const minHeight = ${TWITTER_EMBED_MIN_HEIGHT};
            const maxHeight = ${TWITTER_EMBED_MAX_HEIGHT};
            const styleMessageType = '${TWITTER_EMBED_STYLE_MESSAGE}';

            function setCustomProperty(name, value) {
                if (typeof value === 'string') {
                    document.documentElement.style.setProperty(name, value);
                }
            }

            function applyStyle(style) {
                if (!style) {
                    return;
                }

                setCustomProperty('--color-primary-text', style.textColor);
                setCustomProperty('--color-secondary-text', style.secondaryTextColor);
                setCustomProperty('--font-size', style.fontSize);
                setCustomProperty('--font-size-multiplier', style.fontSizeMultiplier);
                setCustomProperty('--twitter-link-color', style.linkColor);

                if (style.bodyClass === 'has-serif-body' || style.bodyClass === 'has-sans-body') {
                    document.body.classList.remove('has-serif-body', 'has-sans-body');
                    document.body.classList.add(style.bodyClass);
                }

                sendHeight();
            }

            function getHeight() {
                const elements = Array.from(document.body.children).filter(function (element) {
                    return element.tagName !== 'SCRIPT';
                });
                const contentHeight = elements.reduce(function (maxHeight, element) {
                    return Math.max(maxHeight, element.getBoundingClientRect().bottom);
                }, 0);

                return Math.min(Math.max(
                    Math.ceil(contentHeight),
                    minHeight
                ), maxHeight);
            }

            function sendHeight() {
                window.parent.postMessage({
                    type: '${TWITTER_EMBED_RESIZE_MESSAGE}',
                    height: getHeight()
                }, '*');
            }

            if (typeof ResizeObserver === 'function') {
                new ResizeObserver(sendHeight).observe(document.body);
            }

            document.addEventListener('DOMContentLoaded', sendHeight);
            window.addEventListener('load', sendHeight);
            window.addEventListener('message', function (event) {
                const data = event.data || {};

                if (data.type === styleMessageType) {
                    applyStyle(data.style);
                }
            });

            let attempts = 0;
            const interval = window.setInterval(function () {
                sendHeight();
                attempts += 1;

                if (attempts > 20) {
                    window.clearInterval(interval);
                }
            }, 250);
        })();
    </script>
    <script async src="${TWITTER_WIDGET_SCRIPT_URL}" charset="utf-8"></script>
</body>
</html>`;
};

export const getTwitterEmbedSandboxStyle = (options: TwitterEmbedSandboxOptions = {}): TwitterEmbedSandboxStyle => ({
    fontSize: options.fontSize || '1.7rem',
    fontSizeMultiplier: options.fontStyle === 'serif' ? '1.1' : '1',
    textColor: options.darkMode ? '#fff' : '#15171a',
    secondaryTextColor: options.darkMode ? 'rgb(255 255 255 / 0.64)' : 'rgb(124 139 154)',
    linkColor: options.sepia ? '#DD6B02' : '#14B8FF',
    bodyClass: options.fontStyle === 'serif' ? 'has-serif-body' : 'has-sans-body'
});

export const getTwitterEmbedStyleMessage = (options: TwitterEmbedSandboxOptions = {}): TwitterEmbedStyleMessage => ({
    type: TWITTER_EMBED_STYLE_MESSAGE,
    style: getTwitterEmbedSandboxStyle(options)
});

export const getTwitterEmbedOptions = (style: TwitterEmbedStyleOptions): TwitterEmbedSandboxOptions => ({
    fontSize: style.fontSize,
    fontStyle: style.fontStyle === 'serif' ? 'serif' : 'sans',
    darkMode: style.darkMode,
    sepia: style.backgroundColor === 'SEPIA'
});

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
        return url.origin === twitterWidgetUrl.origin && url.pathname === twitterWidgetUrl.pathname;
    } catch {
        return false;
    }
};

export const getTwitterEmbedBridgeScript = () => `
                const twitterEmbedResizeMessageType = '${TWITTER_EMBED_RESIZE_MESSAGE}';
                const twitterEmbedStyleMessageType = '${TWITTER_EMBED_STYLE_MESSAGE}';
                let currentTwitterEmbedStyleMessage = null;

                function forwardTwitterEmbedStyle(frame) {
                    if (currentTwitterEmbedStyleMessage && frame.contentWindow) {
                        frame.contentWindow.postMessage(currentTwitterEmbedStyleMessage, '*');
                    }
                }

                function updateTwitterEmbedStyle(data) {
                    currentTwitterEmbedStyleMessage = data;
                    const frames = document.querySelectorAll('iframe[data-gh-twitter-embed]');

                    for (const frame of frames) {
                        forwardTwitterEmbedStyle(frame);
                    }

                    resizeIframe();
                }

                function resizeTwitterEmbed(event) {
                    const data = event.data || {};

                    if (data.type !== twitterEmbedResizeMessageType) {
                        return false;
                    }

                    const height = Number(data.height);

                    if (!Number.isFinite(height)) {
                        return true;
                    }

                    const boundedHeight = Math.min(Math.max(height, ${TWITTER_EMBED_MIN_HEIGHT}), ${TWITTER_EMBED_MAX_HEIGHT});
                    const frames = document.querySelectorAll('iframe[data-gh-twitter-embed]');

                    for (const frame of frames) {
                        if (frame.contentWindow === event.source) {
                            frame.style.height = boundedHeight + 'px';
                            forwardTwitterEmbedStyle(frame);
                            break;
                        }
                    }

                    resizeIframe();
                    return true;
                }

                window.addEventListener('message', (event) => {
                    const data = event.data || {};

                    if (data.type === twitterEmbedStyleMessageType) {
                        updateTwitterEmbedStyle(data);
                        return;
                    }

                    resizeTwitterEmbed(event);
                });
`;

export const renderTwitterEmbedInSandbox = (blockquoteHtml: string, options: TwitterEmbedSandboxOptions = {}) => {
    const iframe = document.createElement('iframe');

    iframe.className = 'gh-twitter-embed';
    iframe.title = 'Embedded Twitter post';
    iframe.srcdoc = buildTwitterEmbedSrcDoc(blockquoteHtml, options);
    iframe.setAttribute('data-gh-twitter-embed', '');
    iframe.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
    iframe.style.width = '100%';
    iframe.style.height = `${TWITTER_EMBED_INITIAL_HEIGHT}px`;
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.margin = '0';
    iframe.style.overflow = 'hidden';

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

    const options = getOptions();

    div.querySelectorAll('script').forEach((script) => {
        if (isTwitterWidgetScript(script)) {
            script.remove();
        }
    });

    for (const twitterEmbed of twitterEmbeds) {
        twitterEmbed.replaceWith(renderTwitterEmbedInSandbox(twitterEmbed.outerHTML, options));
    }

    return {
        hasTwitterEmbeds: true,
        html: div.innerHTML
    };
};
