/* global document, window */

(function () {
    const MIN_HEIGHT = 80;
    const MAX_HEIGHT = 20_000;
    const MAX_RUNTIME_CHARS = 5 * 1024 * 1024;
    const BLOG_URL = '{{blog-url}}';
    const RUNTIME_ENDPOINT = new URL('public/addon-block-runtime', BLOG_URL.includes('{{') ? document.baseURI : `${BLOG_URL}/`).href;
    const navigationTokens = new WeakMap();
    const hydrationReady = new WeakSet();
    const hydrationEligible = new WeakSet();
    const hydrationSent = new WeakSet();
    const runtimePromises = new Map();

    function inheritedFontFamily(card) {
        const fontFamily = window.getComputedStyle(card).fontFamily;
        return typeof fontFamily === 'string' && fontFamily.length <= 512 ? fontFamily : '';
    }

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

    async function verifyIntegrity(source, integrity) {
        if (!integrity) {
            return;
        }
        const match = /^sha256-(.+)$/.exec(integrity);
        if (!match || !window.crypto?.subtle || typeof window.TextEncoder !== 'function') {
            throw new Error('Invalid add-on runtime integrity');
        }
        const digest = await window.crypto.subtle.digest('SHA-256', new window.TextEncoder().encode(source));
        const actual = window.btoa(String.fromCharCode(...new Uint8Array(digest)));
        if (actual !== match[1]) {
            throw new Error('Add-on runtime integrity mismatch');
        }
    }

    function fetchRuntime(card) {
        const handle = card.dataset.addonHandle;
        const block = card.dataset.addonBlock;
        const key = `${handle}/${block}`;
        if (runtimePromises.has(key)) {
            return runtimePromises.get(key);
        }

        const request = (async function () {
            const metadataUrl = new URL(RUNTIME_ENDPOINT);
            metadataUrl.searchParams.set('handle', handle);
            metadataUrl.searchParams.set('block', block);
            const fetchOptions = {
                credentials: 'omit',
                cache: 'no-store',
                referrerPolicy: 'no-referrer'
            };
            const metadataResponse = await window.fetch(metadataUrl.href, fetchOptions);
            if (!metadataResponse.ok) {
                throw new Error('Add-on hydration is unavailable');
            }
            const metadata = await metadataResponse.json();
            const bundleUrl = new URL(metadata.bundleUrl);
            if (!['http:', 'https:'].includes(bundleUrl.protocol)) {
                throw new Error('Invalid add-on runtime URL');
            }
            const bundleResponse = await window.fetch(bundleUrl.href, fetchOptions);
            if (!bundleResponse.ok) {
                throw new Error('Add-on hydration bundle could not be loaded');
            }
            const source = await bundleResponse.text();
            if (source.length > MAX_RUNTIME_CHARS) {
                throw new Error('Add-on hydration bundle is too large');
            }
            await verifyIntegrity(source, typeof metadata.integrity === 'string' ? metadata.integrity : '');
            return source;
        })();
        runtimePromises.set(key, request);
        return request;
    }

    async function hydrateCard(card) {
        const frame = card.querySelector('.kg-addon-card-frame');
        if (!frame?.contentWindow || !hydrationEligible.has(card) || !hydrationReady.has(frame) || hydrationSent.has(frame)) {
            return;
        }
        hydrationSent.add(frame);
        card.dataset.addonHydration = 'loading';
        try {
            const source = await fetchRuntime(card);
            frame.contentWindow.postMessage({
                type: 'ghost-addon-host',
                instanceId: card.dataset.addonId,
                action: 'hydrate',
                source
            }, '*');
        } catch (error) {
            card.dataset.addonHydration = 'failed';
        }
    }

    function observeHydration() {
        const cards = [...document.querySelectorAll('.kg-addon-card[data-addon-hydrate="true"]')];
        if (typeof window.IntersectionObserver !== 'function') {
            for (const card of cards) {
                hydrationEligible.add(card);
                void hydrateCard(card);
            }
            return;
        }

        const observer = new window.IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) {
                    continue;
                }
                hydrationEligible.add(entry.target);
                observer.unobserve(entry.target);
                void hydrateCard(entry.target);
            }
        }, {rootMargin: '400px 0px'});
        for (const card of cards) {
            observer.observe(card);
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
                    action: 'connect',
                    fontFamily: inheritedFontFamily(card)
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
            action: 'connected',
            fontFamily: inheritedFontFamily(match.card)
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
            hydrationReady.add(match.frame);
            void hydrateCard(match.card);
        }

        if (message.action === 'hydrated') {
            match.card.dataset.addonHydration = 'hydrated';
        }

        if (message.action === 'hydrate-error') {
            match.card.dataset.addonHydration = 'failed';
        }
    });

    observeHydration();
    connectFrames();
})();
