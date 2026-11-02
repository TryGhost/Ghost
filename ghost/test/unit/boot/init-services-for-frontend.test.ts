import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

function createFrontendServicesHarness() {
  const routeSettings = { init: sinon.stub().resolves() };
  const customRedirects = { init: sinon.stub().resolves() };
  const linkRedirects = { init: sinon.stub().resolves() };
  const customThemeSettings = { init: sinon.stub().resolves() };
  const themes = { init: sinon.stub().resolves() };
  const offers = { init: sinon.stub().resolves() };
  // Exercise the production orchestration without booting the services it starts.
  const initServicesForFrontend = loadBootFunction('initServicesForFrontend', {
    './server/services/route-settings': routeSettings,
    './server/services/custom-redirects': customRedirects,
    './server/services/link-redirection': { default: linkRedirects },
    './server/services/custom-theme-settings': { default: customThemeSettings },
    './server/services/themes': themes,
    './server/services/offers': offers,
  });
  return {
    init: (): Promise<void> => initServicesForFrontend({ bootLogger: { metric: sinon.stub() } }),
    themes,
    offers,
  };
}

describe('Frontend services startup', function () {
  it('initializes offers after themes and waits for it before the phase finishes', async function () {
    const boot = createFrontendServicesHarness();
    const ready = Promise.withResolvers<void>();
    boot.offers.init.returns(ready.promise);
    let finished = false;
    const startup = boot.init().then(() => {
      finished = true;
    });

    try {
      // Drain runnable continuations while offers remains pending.
      await setImmediate();
      sinon.assert.calledOnce(boot.offers.init);
      sinon.assert.callOrder(boot.themes.init, boot.offers.init);
      assert.equal(finished, false, 'Frontend services finished before offers were ready');
    } finally {
      ready.resolve();
      await startup;
    }

    assert.equal(finished, true);
  });

  it('propagates the original offers startup error', async function () {
    const boot = createFrontendServicesHarness();
    const failure = new Error('Offers could not be loaded');
    boot.offers.init.rejects(failure);

    await assert.rejects(boot.init(), (error) => error === failure);
    sinon.assert.calledOnce(boot.offers.init);
  });
});
