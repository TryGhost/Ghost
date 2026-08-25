const assert = require('node:assert/strict');
const sinon = require('sinon');

const bridge = require('../../core/bridge');
const siteApp = require('../../core/frontend/web/site');
const appService = require('../../core/frontend/services/apps');

describe('Unit: bridge', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('reloadFrontend', function () {
    let reset;
    let urlService;

    function deferredRouteSettings() {
      let settle;
      const loadRouteSettings = sinon.stub().returns(
        new Promise((resolve, reject) => {
          settle = { resolve, reject };
        }),
      );
      return { routeSettings: { loadRouteSettings }, settle };
    }

    beforeEach(function () {
      sinon.stub(siteApp, 'reload');
      sinon.stub(appService, 'init');
      reset = sinon.stub();
      urlService = { reset };
    });

    it('keeps the registered routers up while the settings read is in flight', async function () {
      // reset() empties the router configs and clears routersReady,
      // which gates the maintenance middleware — so resetting before the
      // await leaves the site and the Admin API 503ing for the length of
      // a settings read, which on Pro is a network round trip.
      const { routeSettings, settle } = deferredRouteSettings();

      const reloading = bridge.reloadFrontend(routeSettings, urlService);
      await Promise.resolve();

      sinon.assert.calledOnce(routeSettings.loadRouteSettings);
      sinon.assert.notCalled(reset);

      settle.resolve({});
      await reloading;

      sinon.assert.calledOnce(reset);
      assert.ok(reset.calledBefore(siteApp.reload), 'routers are cleared before re-registration');
    });

    it('leaves the routers alone when the settings read fails', async function () {
      // Nothing re-registers after a failed reload, so a reset here would
      // strand the site with no routers until the process restarts.
      const { routeSettings, settle } = deferredRouteSettings();

      const reloading = bridge.reloadFrontend(routeSettings, urlService);
      await Promise.resolve();

      settle.reject(new Error('could not read route settings'));

      await assert.rejects(reloading, /could not read route settings/);
      sinon.assert.notCalled(reset);
      sinon.assert.notCalled(siteApp.reload);
    });
  });
});
