/* global document, window */

(function () {
  const MIN_HEIGHT = 80;
  const MAX_HEIGHT = 20_000;
  const MAX_RUNTIME_CHARS = 5 * 1024 * 1024;
  const BLOG_URL = '{{blog-url}}';
  const RUNTIME_ENDPOINT = new URL(
    'public/addon-block-runtime',
    BLOG_URL.includes('{{') ? document.baseURI : `${BLOG_URL}/`,
  ).href;
  const navigationTokens = new WeakMap();
  const hydrationReady = new WeakSet();
  const hydrationEligible = new WeakSet();
  const hydrationSent = new WeakSet();
  const runtimePromises = new Map();
  const providerMetadata = new WeakMap();
  const pendingFetches = new WeakMap();
  const SITE_URL = BLOG_URL.includes('{{') ? new URL('/', document.baseURI).href : `${BLOG_URL}/`;
  let memberRequest;
  let memberIdentity;
  let contextGeneration = 0;

  async function currentMember() {
    if (!memberRequest) {
      memberRequest = window
        .fetch(new URL('members/api/member/context/', SITE_URL).href, {
          credentials: 'same-origin',
          cache: 'no-store',
          redirect: 'error',
        })
        .then(async (response) => {
          if (!response.ok) throw new Error('Member context unavailable');
          const context = await response.json();
          if (
            context.member !== null &&
            (!context.member ||
              typeof context.member.uuid !== 'string' ||
              typeof context.member.key !== 'string')
          ) {
            throw new Error('Invalid member context');
          }
          return context.member;
        })
        .finally(() => {
          memberRequest = null;
        });
    }
    return memberRequest;
  }

  function remountCards() {
    contextGeneration += 1;
    for (const card of document.querySelectorAll(
      '.kg-addon-card[data-addon-hydrate="true"][data-addon-post-id]',
    )) {
      if (!providerMetadata.has(card)) continue;
      const oldFrame = card.querySelector('.kg-addon-card-frame');
      if (!oldFrame) continue;
      card.dataset.addonHydration = 'loading';
      oldFrame.replaceWith(oldFrame.cloneNode(true));
    }
    connectFrames();
  }

  async function refreshMember() {
    if (!document.querySelector('.kg-addon-card[data-addon-hydrate="true"][data-addon-post-id]'))
      return;
    try {
      const member = await currentMember();
      const identity = JSON.stringify(member);
      remountCards();
      memberIdentity = identity;
    } catch {
      memberIdentity = undefined;
      remountCards();
    }
  }

  async function providerFetch(match, message) {
    const { card, frame } = match;
    const metadata = providerMetadata.get(card);
    const generation = contextGeneration;
    const respond = (payload) => {
      if (
        generation === contextGeneration &&
        card.querySelector('.kg-addon-card-frame') === frame
      ) {
        frame.contentWindow.postMessage(
          {
            type: 'ghost-addon-host',
            instanceId: card.dataset.addonId,
            action: 'fetch-result',
            requestId: message.requestId,
            ...payload,
          },
          '*',
        );
      }
    };
    const active = pendingFetches.get(frame) || 0;
    if (
      !metadata ||
      typeof message.requestId !== 'string' ||
      message.requestId.length > 100 ||
      active >= 20
    )
      return;
    pendingFetches.set(frame, active + 1);
    try {
      if (typeof message.path !== 'string' || message.path.length > 2000)
        throw new Error('Invalid request');
      const url = new URL(message.path, metadata.providerOrigin);
      if (url.origin !== metadata.providerOrigin || url.username || url.password)
        throw new Error('Provider origin required');
      const method = message.options?.method || 'GET';
      if (!['GET', 'POST'].includes(method)) throw new Error('Invalid method');
      const body =
        message.options?.body === undefined ? undefined : JSON.stringify(message.options.body);
      if (body && body.length > 16384) throw new Error('Request too large');
      const response = await window.fetch(url.href, {
        method,
        body: method === 'POST' ? body : undefined,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        signal: window.AbortSignal.timeout(10000),
      });
      const text = await response.text();
      if (text.length > 1024 * 1024) throw new Error('Response too large');
      respond({ response: { status: response.status, body: JSON.parse(text) } });
    } catch {
      respond({ error: 'Provider request unavailable.' });
    } finally {
      pendingFetches.set(frame, (pendingFetches.get(frame) || 1) - 1);
    }
  }

  window.addEventListener('focus', () => {
    void refreshMember();
  });
  window.addEventListener('hashchange', () => {
    void refreshMember();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshMember();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) remountCards();
  });

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
        return { card, frame };
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
    const digest = await window.crypto.subtle.digest(
      'SHA-256',
      new window.TextEncoder().encode(source),
    );
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
        referrerPolicy: 'no-referrer',
        redirect: 'error',
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
      await verifyIntegrity(
        source,
        typeof metadata.integrity === 'string' ? metadata.integrity : '',
      );
      return { source, metadata };
    })();
    runtimePromises.set(key, request);
    return request;
  }

  async function hydrateCard(card) {
    const frame = card.querySelector('.kg-addon-card-frame');
    if (
      !frame?.contentWindow ||
      !hydrationEligible.has(card) ||
      !hydrationReady.has(frame) ||
      hydrationSent.has(frame)
    ) {
      return;
    }
    hydrationSent.add(frame);
    card.dataset.addonHydration = 'loading';
    try {
      const generation = contextGeneration;
      const { source, metadata } = await fetchRuntime(card);
      let envelope;
      if (metadata.providerOrigin && card.dataset.addonPostId) {
        const provider = new URL(metadata.providerOrigin);
        if (
          !['http:', 'https:'].includes(provider.protocol) ||
          provider.origin !== metadata.providerOrigin
        )
          throw new Error('Invalid provider origin');
        providerMetadata.set(card, metadata);
        const member = await currentMember();
        memberIdentity = JSON.stringify(member);
        envelope = {
          site: SITE_URL,
          apiVersion: '2026-01',
          context: { postId: card.dataset.addonPostId, cardId: card.dataset.addonId, member },
        };
      }
      if (generation !== contextGeneration || card.querySelector('.kg-addon-card-frame') !== frame)
        return;
      frame.contentWindow.postMessage(
        {
          type: 'ghost-addon-host',
          instanceId: card.dataset.addonId,
          action: 'hydrate',
          source,
          envelope,
        },
        '*',
      );
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

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          hydrationEligible.add(entry.target);
          observer.unobserve(entry.target);
          void hydrateCard(entry.target);
        }
      },
      { rootMargin: '400px 0px' },
    );
    for (const card of cards) {
      observer.observe(card);
    }
  }

  function connectFrames() {
    for (const card of document.querySelectorAll('.kg-addon-card')) {
      const frame = card.querySelector('.kg-addon-card-frame');
      const instanceId = card.dataset.addonId;
      if (frame?.contentWindow && instanceId) {
        frame.contentWindow.postMessage(
          {
            type: 'ghost-addon-host',
            instanceId,
            action: 'connect',
            fontFamily: inheritedFontFamily(card),
          },
          '*',
        );
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

    event.source.postMessage(
      {
        type: 'ghost-addon-host',
        instanceId: message.instanceId,
        action: 'connected',
        fontFamily: inheritedFontFamily(match.card),
      },
      '*',
    );

    if (message.action === 'fetch') void providerFetch(match, message);
    if (message.action === 'request-signin' && providerMetadata.has(match.card))
      window.location.hash =
        memberIdentity && memberIdentity !== 'null' ? '/portal/account/plans' : '/portal/signin';

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
      if (
        !navigationTokens.has(match.frame) &&
        typeof message.navigationToken === 'string' &&
        /^[a-f0-9]{32}$/.test(message.navigationToken)
      ) {
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
