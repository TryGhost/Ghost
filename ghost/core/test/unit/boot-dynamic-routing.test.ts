import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import sinon from 'sinon';

function createRoutingHarness(frontend: boolean) {
  const start = sinon.stub().resolves();
  const routerManager = { init: sinon.stub() };
  const urlService = {};
  const bridge = { init: sinon.stub() };
  const modules: Record<string, unknown> = {
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    './frontend/services/routing': { routerManager },
    './server/services/route-settings': { service: { start } },
    './server/services/url': urlService,
    './bridge': bridge,
  };
  const context = {
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected boot dependency: ${name}`);
      return modules[name];
    },
    module: { exports: {} },
  };
  // Exercise the production orchestration without booting unrelated services.
  const source = readFileSync(resolve(__dirname, '../../core/boot.js'), 'utf8');
  const initDynamicRouting = runInNewContext(`${source}\ninitDynamicRouting;`, context);
  return {
    init: (): Promise<void> => initDynamicRouting({ frontend }),
    start,
    routerManager,
    urlService,
    bridge,
  };
}

for (const frontend of [false, true]) {
  describe(`Dynamic routing startup ${frontend ? 'with' : 'without'} a frontend`, function () {
    it('passes the shared routing dependencies and waits for route-settings startup', async function () {
      const boot = createRoutingHarness(frontend);
      const ready = Promise.withResolvers<void>();
      boot.start.returns(ready.promise);
      let finished = false;
      const startup = boot.init().then(() => {
        finished = true;
      });

      try {
        // Drain runnable continuations while route-settings remains pending.
        await setImmediate();
        sinon.assert.calledOnce(boot.bridge.init);
        sinon.assert.calledOnce(boot.start);
        const [dependencies] = boot.start.firstCall.args;
        assert.equal(dependencies.routerManager, boot.routerManager);
        assert.equal(dependencies.urlService, boot.urlService);
        if (frontend) {
          sinon.assert.notCalled(boot.routerManager.init);
        } else {
          sinon.assert.calledOnce(boot.routerManager.init);
          assert.equal(boot.routerManager.init.firstCall.args[0].urlService, boot.urlService);
          sinon.assert.callOrder(boot.routerManager.init, boot.start);
        }
        assert.equal(finished, false, 'Dynamic routing finished before route-settings startup');
      } finally {
        ready.resolve();
        await startup;
      }

      assert.equal(finished, true);
    });

    it('propagates the original route-settings startup error', async function () {
      const boot = createRoutingHarness(frontend);
      const failure = new Error('Route settings could not be loaded');
      boot.start.rejects(failure);

      await assert.rejects(boot.init(), (error) => error === failure);
      sinon.assert.calledOnce(boot.start);
    });
  });
}
