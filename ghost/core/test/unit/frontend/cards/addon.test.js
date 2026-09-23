const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const sinon = require('sinon');

const runtime = fs.readFileSync(
  path.join(__dirname, '../../../../core/frontend/src/addon-blocks/addon-blocks.js'),
  'utf8',
);

describe('Add-on public card runtime', function () {
  let dom;

  afterEach(function () {
    dom?.window.close();
  });

  it('accepts lifecycle messages only from the matching add-on frame', function () {
    assert.match(runtime, /navigationTokens/);

    dom = new JSDOM(
      `
            <!doctype html><html><body style="font-family: 'Publisher Sans', sans-serif">
                <figure class="kg-card kg-addon-card" data-addon-id="episode-player-1">
                    <iframe class="kg-addon-card-frame" height="240"></iframe>
                </figure>
                <iframe class="untrusted-frame"></iframe>
            </body></html>
        `,
      {
        runScripts: 'dangerously',
        url: 'https://publisher.example/post/',
      },
    );
    const card = dom.window.document.querySelector('.kg-addon-card');
    const frame = card.querySelector('.kg-addon-card-frame');
    const untrustedFrame = dom.window.document.querySelector('.untrusted-frame');
    const hostMessages = [];
    frame.contentWindow.postMessage = (message) => hostMessages.push(message);
    dom.window.eval(runtime);

    assert.equal(hostMessages[0].type, 'ghost-addon-host');
    assert.equal(hostMessages[0].instanceId, 'episode-player-1');
    assert.equal(hostMessages[0].action, 'connect');
    assert.equal(hostMessages[0].fontFamily, '"Publisher Sans", sans-serif');

    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'resize',
          height: 50_000,
        },
        source: untrustedFrame.contentWindow,
      }),
    );
    assert.equal(frame.getAttribute('height'), '240');

    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'resize',
          height: 50_000,
        },
        source: frame.contentWindow,
      }),
    );
    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'ready',
          navigationToken: 'a'.repeat(32),
        },
        source: frame.contentWindow,
      }),
    );

    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'navigate',
          navigationToken: 'forged',
          href: '#forged',
        },
        source: frame.contentWindow,
      }),
    );
    assert.equal(dom.window.location.hash, '');

    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'navigate',
          navigationToken: 'a'.repeat(32),
          href: '#episode',
        },
        source: frame.contentWindow,
      }),
    );

    assert.equal(frame.getAttribute('height'), '20000');
    assert.equal(frame.style.height, '20000px');
    assert.equal(card.dataset.addonReady, 'true');
    assert.equal(dom.window.location.hash, '#episode');
    const connectionMessage = hostMessages.at(-1);
    assert.equal(connectionMessage.type, 'ghost-addon-host');
    assert.equal(connectionMessage.instanceId, 'episode-player-1');
    assert.equal(connectionMessage.action, 'connected');
    assert.equal(connectionMessage.fontFamily, '"Publisher Sans", sans-serif');
  });

  it('loads the current hydration bundle only when an opted-in card approaches the viewport', async function () {
    const hydrationRuntime = runtime.replaceAll('{{blog-url}}', 'https://publisher.example');
    let intersectionCallback;
    dom = new JSDOM(
      `
            <!doctype html><html><body>
                <figure class="kg-card kg-addon-card" data-addon-id="episode-player-1" data-addon-handle="transistor" data-addon-block="episode-player" data-addon-hydrate="true">
                    <iframe class="kg-addon-card-frame" height="240"></iframe>
                </figure>
            </body></html>
        `,
      {
        runScripts: 'dangerously',
        url: 'https://publisher.example/post/',
      },
    );
    dom.window.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        intersectionCallback = callback;
      }

      observe() {}
      unobserve() {}
    };
    const responses = [
      { ok: true, json: async () => ({ bundleUrl: 'https://podcasts.example/editor-content.js' }) },
      { ok: true, text: async () => 'window.__ghostAddonModule = hydratedBundle;' },
    ];
    dom.window.fetch = sinon.stub().callsFake(async () => responses.shift());
    const card = dom.window.document.querySelector('.kg-addon-card');
    const frame = card.querySelector('.kg-addon-card-frame');
    const hostMessages = [];
    frame.contentWindow.postMessage = (message) => hostMessages.push(message);

    dom.window.eval(hydrationRuntime);
    assert.equal(dom.window.fetch.callCount, 0);

    intersectionCallback([{ target: card, isIntersecting: true }]);
    dom.window.dispatchEvent(
      new dom.window.MessageEvent('message', {
        data: {
          type: 'ghost-addon',
          instanceId: 'episode-player-1',
          action: 'ready',
          navigationToken: 'a'.repeat(32),
        },
        source: frame.contentWindow,
      }),
    );
    await new Promise((resolve) => {
      dom.window.setTimeout(resolve, 0);
    });

    assert.equal(dom.window.fetch.callCount, 2);
    assert.match(
      dom.window.fetch.firstCall.args[0],
      /addon-block-runtime\?handle=transistor&block=episode-player/,
    );
    assert.equal(dom.window.fetch.firstCall.args[1].credentials, 'omit');
    assert.equal(dom.window.fetch.firstCall.args[1].cache, 'no-store');
    assert.equal(dom.window.fetch.firstCall.args[1].referrerPolicy, 'no-referrer');
    assert.equal(hostMessages.at(-1).action, 'hydrate');
    assert.equal(hostMessages.at(-1).source, 'window.__ghostAddonModule = hydratedBundle;');
    assert.equal(card.dataset.addonHydration, 'loading');
  });
});

describe('Post card provider bridge', function () {
  let dom;
  afterEach(() => dom?.window.close());

  it('sends context after hydration and restricts credential-free fetches to the registered provider', async function () {
    dom = new JSDOM(
      '<figure class="kg-addon-card" data-addon-id="attachment" data-addon-handle="podcast" data-addon-block="episode" data-addon-post-id="post-id" data-addon-hydrate="true"><iframe class="kg-addon-card-frame"></iframe></figure><iframe id="other"></iframe>',
      { runScripts: 'dangerously', url: 'https://publisher.example/post/' },
    );
    const frame = dom.window.document.querySelector('.kg-addon-card-frame');
    const messages = [];
    const calls = [];
    let member = { uuid: 'uuid', key: 'key' };
    let deferredResponse = null;
    let contextUnavailable = false;
    frame.contentWindow.postMessage = (message) => messages.push(message);
    dom.window.fetch = async (url, options) => {
      calls.push({ url, options });
      if (url.includes('addon-block-runtime') || url.includes('post-attachment-runtime')) {
        return {
          ok: true,
          json: async () => ({
            bundleUrl: 'https://provider.example/player.js',
            providerOrigin: 'https://provider.example',
          }),
        };
      }
      if (url.endsWith('player.js')) {
        return { ok: true, text: async () => 'runtime' };
      }
      if (url.includes('member/context')) {
        if (contextUnavailable) {
          throw new Error('Unavailable');
        }
        return { ok: true, json: async () => ({ member }) };
      }
      if (deferredResponse) {
        return deferredResponse;
      }
      return { status: 200, text: async () => '{"selected":"free"}' };
    };
    const send = (action, data = {}, source = frame.contentWindow) =>
      dom.window.dispatchEvent(
        new dom.window.MessageEvent('message', {
          source,
          data: { type: 'ghost-addon', instanceId: 'attachment', action, ...data },
        }),
      );
    dom.window.eval(runtime);
    send('ready');
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const hydrated = messages.find((message) => message.action === 'hydrate');
    assert.deepEqual(JSON.parse(JSON.stringify(hydrated.envelope)), {
      site: 'https://publisher.example/',
      apiVersion: '2026-01',
      context: { postId: 'post-id', cardId: 'attachment', member: { uuid: 'uuid', key: 'key' } },
    });
    send('fetch', {
      requestId: '1',
      path: '/api/player',
      options: { method: 'POST', body: { post_id: 'post-id' } },
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const request = calls.find((call) => call.url === 'https://provider.example/api/player');
    assert.equal(request.options.credentials, 'omit');
    assert.equal(request.options.redirect, 'error');
    assert.equal(request.options.headers.Authorization, undefined);
    assert.equal(messages.find((message) => message.requestId === '1').response.status, 200);
    const count = calls.length;
    send('fetch', { requestId: '2', path: 'https://evil.example/api' });
    send(
      'fetch',
      { requestId: '3', path: '/api/player' },
      dom.window.document.querySelector('#other').contentWindow,
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    assert.equal(calls.length, count);
    assert.equal(
      messages.find((message) => message.requestId === '2').error,
      'Provider request unavailable.',
    );
    assert.equal(
      messages.some((message) => message.requestId === '3'),
      false,
    );
    send('request-signin');
    assert.equal(dom.window.location.hash, '#/portal/account/plans');
    let finish;
    deferredResponse = new Promise((resolve) => {
      finish = resolve;
    });
    send('fetch', { requestId: '4', path: '/api/player' });
    member = null;
    dom.window.dispatchEvent(new dom.window.Event('focus'));
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const replacement = dom.window.document.querySelector('.kg-addon-card-frame');
    assert.notEqual(replacement, frame);
    finish({ status: 200, text: async () => '{"selected":"full"}' });
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    assert.equal(
      messages.some((message) => message.requestId === '4'),
      false,
      'obsolete member response must be discarded',
    );
    const newMessages = [];
    replacement.contentWindow.postMessage = (message) => newMessages.push(message);
    send('ready', {}, replacement.contentWindow);
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    assert.equal(
      newMessages.find((message) => message.action === 'hydrate').envelope.context.member,
      null,
    );
    contextUnavailable = true;
    dom.window.dispatchEvent(new dom.window.Event('focus'));
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    const failedFrame = dom.window.document.querySelector('.kg-addon-card-frame');
    contextUnavailable = false;
    dom.window.dispatchEvent(new dom.window.Event('focus'));
    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
    assert.notEqual(
      dom.window.document.querySelector('.kg-addon-card-frame'),
      failedFrame,
      'retry after context recovery must remount the failed frame',
    );
  });
  it('recovers after initial member failure and refreshes unchanged member entitlements', async function () {
    dom = new JSDOM(
      '<figure class="kg-addon-card" data-addon-id="one" data-addon-handle="podcast" data-addon-block="episode" data-addon-post-id="post" data-addon-hydrate="true"><iframe class="kg-addon-card-frame"></iframe></figure>',
      { runScripts: 'dangerously', url: 'https://publisher.example/post/' },
    );
    let unavailable = true;
    dom.window.fetch = async (url) => {
      if (url.includes('addon-block-runtime')) {
        return {
          ok: true,
          json: async () => ({
            bundleUrl: 'https://provider.example/player.js',
            providerOrigin: 'https://provider.example',
          }),
        };
      }
      if (url.endsWith('player.js')) {
        return { ok: true, text: async () => 'runtime' };
      }
      if (unavailable) {
        throw new Error('Offline');
      }
      return { ok: true, json: async () => ({ member: { uuid: 'member', key: 'same-key' } }) };
    };
    const card = dom.window.document.querySelector('figure');
    const frame = card.querySelector('iframe');
    dom.window.eval(runtime);
    const ready = (targetFrame) =>
      dom.window.dispatchEvent(
        new dom.window.MessageEvent('message', {
          source: targetFrame.contentWindow,
          data: { type: 'ghost-addon', instanceId: 'one', action: 'ready' },
        }),
      );
    const flush = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    ready(frame);
    await flush();
    assert.equal(card.dataset.addonHydration, 'failed');
    unavailable = false;
    dom.window.dispatchEvent(new dom.window.Event('focus'));
    await flush();
    const recovered = card.querySelector('iframe');
    assert.notEqual(recovered, frame, 'initial failure must be retryable');
    ready(recovered);
    await flush();
    dom.window.dispatchEvent(new dom.window.Event('focus'));
    await flush();
    assert.notEqual(
      card.querySelector('iframe'),
      recovered,
      'unchanged credentials may have new entitlements',
    );
  });
});
