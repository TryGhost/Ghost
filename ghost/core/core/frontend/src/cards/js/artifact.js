(function () {
    const CARD_SELECTOR = '.kg-artifact-card';
    // JSON escaping can expand a valid 5 MiB HTML payload by up to six times.
    const MAX_PAYLOAD_CHARACTERS = 32 * 1024 * 1024;
    const MAX_HEIGHT = 20_000;
    const STARTUP_TIMEOUT = 10_000;

    function artifactFrameBootstrap(artifactId, startupTimeout) {
        const send = window.parent.postMessage.bind(window.parent);
        let startupFailed = false;
        let criticalStartupTimer = null;

        function clearCriticalStartupTimer() {
            if (criticalStartupTimer) {
                window.clearTimeout(criticalStartupTimer);
                criticalStartupTimer = null;
            }
        }

        function stopMonitoringRuntimeStartup() {
            window.removeEventListener('error', reportRuntimeFailure);
            window.removeEventListener('unhandledrejection', reportFailure);
        }

        function stopMonitoringResourceStartup() {
            window.removeEventListener('error', reportResourceFailure, {capture: true});
        }

        function reportFailure() {
            if (startupFailed) {
                return;
            }
            startupFailed = true;
            clearCriticalStartupTimer();
            stopMonitoringRuntimeStartup();
            stopMonitoringResourceStartup();
            send({type: 'ghost-artifact', artifactId, action: 'failed'}, '*');
        }

        function reportRuntimeFailure(event) {
            if (event.target === window) {
                reportFailure();
            }
        }

        function reportResourceFailure(event) {
            const target = event.target;
            if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement) {
                reportFailure();
            }
        }

        window.addEventListener('error', reportRuntimeFailure);
        window.addEventListener('error', reportResourceFailure, {capture: true});
        window.addEventListener('unhandledrejection', reportFailure);

        function reportHeight() {
            const body = document.body;
            const root = document.documentElement;
            const height = Math.max(
                body ? body.scrollHeight : 0,
                root ? root.scrollHeight : 0
            );
            send({type: 'ghost-artifact', artifactId, action: 'height', height}, '*');
        }

        function criticalResourcePending() {
            return Array.from(document.querySelectorAll('script[src], link[rel~="stylesheet"][href]')).some((resource) => {
                const url = resource instanceof HTMLScriptElement ? resource.src : resource.href;
                if (resource instanceof HTMLLinkElement && resource.sheet) {
                    return false;
                }
                return !performance.getEntriesByName?.(url).length;
            });
        }

        function prepareLinks(root) {
            const links = [];
            if (root instanceof HTMLAnchorElement) {
                links.push(root);
            }
            root.querySelectorAll?.('a[href]').forEach(link => links.push(link));
            links.forEach((link) => {
                if (link.target !== '_blank') {
                    link.setAttribute('target', '_top');
                } else {
                    link.rel = `${link.rel} noopener noreferrer`.trim();
                }
            });
        }

        document.addEventListener('DOMContentLoaded', function () {
            prepareLinks(document.documentElement);
            new MutationObserver((records) => {
                records.forEach(record => record.addedNodes.forEach((node) => {
                    if (node instanceof Element) {
                        prepareLinks(node);
                    }
                }));
                reportHeight();
            }).observe(document.documentElement, {childList: true, subtree: true});

            if (typeof ResizeObserver === 'function') {
                new ResizeObserver(reportHeight).observe(document.documentElement);
            }
            reportHeight();
            criticalStartupTimer = window.setTimeout(() => {
                criticalStartupTimer = null;
                if (criticalResourcePending()) {
                    reportFailure();
                } else {
                    stopMonitoringRuntimeStartup();
                    stopMonitoringResourceStartup();
                }
            }, startupTimeout);
            window.setTimeout(() => {
                if (!startupFailed) {
                    send({type: 'ghost-artifact', artifactId, action: 'ready'}, '*');
                }
            }, 0);
        }, {once: true});
        window.addEventListener('load', function () {
            clearCriticalStartupTimer();
            reportHeight();
            window.setTimeout(() => {
                stopMonitoringRuntimeStartup();
                stopMonitoringResourceStartup();
            }, 0);
        }, {once: true});
    }

    function injectedDocument(html, artifactId, card) {
        const cardStyles = window.getComputedStyle(card);
        const rootStyles = window.getComputedStyle(document.documentElement);
        const accent = rootStyles.getPropertyValue('--ghost-accent-color').trim();
        const declarations = [];

        if (accent && window.CSS?.supports('color', accent)) {
            declarations.push(`--ghost-accent-color:${accent}`);
        }
        if (window.CSS?.supports('color', cardStyles.color)) {
            declarations.push(`--ghost-text-color:${cardStyles.color}`);
        }
        if (window.CSS?.supports('color', cardStyles.backgroundColor)) {
            declarations.push(`--ghost-background-color:${cardStyles.backgroundColor}`);
        }
        const fontFamily = cardStyles.fontFamily.slice(0, 200).replace(/[<>{};]/g, '');
        if (fontFamily) {
            declarations.push(`--ghost-font-family:${fontFamily}`);
        }

        const tokens = declarations.length ? `<style>:root{${declarations.join(';')}}</style>` : '';
        const bootstrap = `<script>(${artifactFrameBootstrap.toString()})(${JSON.stringify(artifactId)},${STARTUP_TIMEOUT});</script>`;
        const injection = `${tokens}${bootstrap}`;
        const head = /<head(?:\s[^>]*)?>/i.exec(html);
        if (head?.index !== undefined) {
            const offset = head.index + head[0].length;
            return `${html.slice(0, offset)}${injection}${html.slice(offset)}`;
        }
        return `${injection}${html}`;
    }

    function parsePayload(card) {
        const source = card.querySelector('.kg-artifact-card-data');
        const text = source?.textContent || '';
        if (!text || text.length > MAX_PAYLOAD_CHARACTERS) {
            return null;
        }
        try {
            const payload = JSON.parse(text);
            if (!payload
                || typeof payload.id !== 'string'
                || !payload.id.trim()
                || payload.id.length > 256
                || payload.version !== 1
                || typeof payload.title !== 'string'
                || payload.title.length > 200
                || typeof payload.description !== 'string'
                || payload.description.length > 500
                || typeof payload.html !== 'string'
                || payload.html.length > 5 * 1024 * 1024
                || new TextEncoder().encode(payload.html).byteLength > 5 * 1024 * 1024
                || !/^\s*<!doctype\s+html\b/i.test(payload.html)
                || !/<html\b/i.test(payload.html)
                || !/<head\b/i.test(payload.html)
                || !/<title\b[^>]*>\s*[^<\s][\s\S]*?<\/title\s*>/i.test(payload.html)
                || !/<body\b/i.test(payload.html)) {
                return null;
            }
            return payload;
        } catch {
            return null;
        }
    }

    const cleanupByCard = new WeakMap();

    function runtimeControls(fallback) {
        const loading = document.createElement('p');
        loading.className = 'kg-artifact-card-loading';
        loading.textContent = 'Loading embed…';
        fallback?.append(loading);

        const error = document.createElement('p');
        error.className = 'kg-artifact-card-error';
        error.textContent = 'This embed couldn’t load';
        fallback?.append(error);

        const retry = document.createElement('button');
        retry.className = 'kg-artifact-card-retry';
        retry.type = 'button';
        retry.textContent = 'Try again';
        fallback?.append(retry);

        return {loading, error, retry};
    }

    function initialize(card) {
        if (card.dataset.artifactRuntime === 'true') {
            return;
        }
        card.dataset.artifactRuntime = 'true';
        const payload = parsePayload(card);
        const fallback = card.querySelector('.kg-artifact-card-fallback');
        if (!payload) {
            card.dataset.state = 'failed';
            card.setAttribute('aria-busy', 'false');
            return;
        }
        const {loading, error, retry} = runtimeControls(fallback);
        let iframe = null;
        let startupTimer = null;
        let startupFailed = false;

        function setState(state) {
            card.dataset.state = state;
            card.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
            if (fallback) {
                fallback.hidden = state === 'ready';
            }
            if (loading) {
                loading.hidden = state !== 'loading';
            }
            if (error) {
                error.hidden = state !== 'failed';
            }
            if (retry) {
                retry.hidden = state !== 'failed';
            }
        }

        function fail() {
            startupFailed = true;
            if (startupTimer) {
                window.clearTimeout(startupTimer);
                startupTimer = null;
            }
            if (iframe) {
                iframe.hidden = true;
                iframe.remove();
                iframe = null;
            }
            setState('failed');
        }

        function start() {
            if (startupTimer) {
                window.clearTimeout(startupTimer);
            }
            iframe?.remove();
            iframe = document.createElement('iframe');
            startupFailed = false;
            iframe.className = 'kg-artifact-card-frame';
            iframe.title = payload.title || 'Interactive embed';
            iframe.loading = 'eager';
            iframe.hidden = true;
            iframe.referrerPolicy = 'strict-origin-when-cross-origin';
            iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation');
            iframe.srcdoc = injectedDocument(payload.html, payload.id, card);
            iframe.addEventListener('error', fail, {once: true});
            card.insertBefore(iframe, card.firstChild);
            setState('loading');
            startupTimer = window.setTimeout(fail, STARTUP_TIMEOUT);
        }

        function handleMessage(event) {
            if (!iframe || event.source !== iframe.contentWindow) {
                return;
            }
            const message = event.data;
            if (!message || message.type !== 'ghost-artifact' || message.artifactId !== payload.id) {
                return;
            }
            if (message.action === 'failed') {
                fail();
                return;
            }
            if (startupFailed) {
                return;
            }
            if (message.action === 'height' && Number.isFinite(message.height)) {
                const height = Math.min(MAX_HEIGHT, Math.max(64, Math.ceil(message.height)));
                iframe.style.height = `${height}px`;
            } else if (message.action === 'ready') {
                if (startupTimer) {
                    window.clearTimeout(startupTimer);
                    startupTimer = null;
                }
                iframe.hidden = false;
                setState('ready');
            }
        }

        window.addEventListener('message', handleMessage);
        retry?.addEventListener('click', start);
        cleanupByCard.set(card, () => {
            if (startupTimer) {
                window.clearTimeout(startupTimer);
                startupTimer = null;
            }
            window.removeEventListener('message', handleMessage);
            retry?.removeEventListener('click', start);
            iframe?.remove();
            iframe = null;
            loading.remove();
            error.remove();
            retry.remove();
            delete card.dataset.artifactRuntime;
            cleanupByCard.delete(card);
        });
        start();
    }

    function discover(root) {
        if (root instanceof Element && root.matches(CARD_SELECTOR)) {
            initialize(root);
        }
        root.querySelectorAll?.(CARD_SELECTOR).forEach(initialize);
    }

    function cleanup(root) {
        const cards = [];
        if (root instanceof Element && root.matches(CARD_SELECTOR)) {
            cards.push(root);
        }
        root.querySelectorAll?.(CARD_SELECTOR).forEach(card => cards.push(card));
        cards.forEach(card => cleanupByCard.get(card)?.());
    }

    discover(document);
    new MutationObserver(records => records.forEach((record) => {
        record.removedNodes.forEach((node) => {
            if (node instanceof Element && !node.isConnected) {
                cleanup(node);
            }
        });
        record.addedNodes.forEach((node) => {
            if (node instanceof Element) {
                discover(node);
            }
        });
    })).observe(document.documentElement, {childList: true, subtree: true});
})();
