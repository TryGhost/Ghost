/* global document, window */

(function () {
    const MIN_HEIGHT = 80;
    const MAX_HEIGHT = 20_000;
    const navigationTokens = new WeakMap();

    function findFrame(event, instanceId) {
        if (typeof instanceId !== 'string') {
            return null;
        }

        for (const card of document.querySelectorAll('.kg-addon-card')) {
            const frame = card.querySelector('.kg-addon-card-frame');
            if (card.dataset.addonId === instanceId && frame?.contentWindow === event.source) {
                return {card, frame};
            }
        }

        return null;
    }

    function safeNavigationUrl(href) {
        try {
            const url = new URL(href, document.baseURI);
            return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url : null;
        } catch (error) {
            return null;
        }
    }

    function connectFrames() {
        for (const card of document.querySelectorAll('.kg-addon-card')) {
            const frame = card.querySelector('.kg-addon-card-frame');
            const instanceId = card.dataset.addonId;
            if (frame?.contentWindow && instanceId) {
                frame.contentWindow.postMessage({
                    type: 'ghost-addon-host',
                    instanceId,
                    action: 'connect'
                }, '*');
            }
        }
    }

    window.addEventListener('message', function (event) {
        const message = event.data;
        if (!message || message.type !== 'ghost-addon') {
            return;
        }

        const match = findFrame(event, message.instanceId);
        if (!match) {
            return;
        }

        event.source.postMessage({
            type: 'ghost-addon-host',
            instanceId: message.instanceId,
            action: 'connected'
        }, '*');

        if (message.action === 'resize') {
            const requested = Number(message.height);
            if (!Number.isFinite(requested)) {
                return;
            }
            const height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.ceil(requested)));
            match.frame.setAttribute('height', String(height));
            match.frame.style.height = `${height}px`;
        }

        if (message.action === 'navigate') {
            const url = safeNavigationUrl(message.href);
            const navigationToken = navigationTokens.get(match.frame);
            if (url && navigationToken && message.navigationToken === navigationToken) {
                window.location.assign(url.href);
            }
        }

        if (message.action === 'ready') {
            if (!navigationTokens.has(match.frame) && typeof message.navigationToken === 'string' && /^[a-f0-9]{32}$/.test(message.navigationToken)) {
                navigationTokens.set(match.frame, message.navigationToken);
            }
            match.card.dataset.addonReady = 'true';
        }
    });

    connectFrames();
})();
