import assert from 'node:assert/strict';
import { assertExists } from '../../../../utils/assertions';
import sinon from 'sinon';
// @ts-expect-error This module lacks type definitions.
import configUtils from '../../../../utils/config-utils';
// @ts-expect-error This module lacks type definitions.
import controllers from '../../../../../core/frontend/services/routing/controllers';
// @ts-expect-error This module lacks type definitions.
import RSSRouter from '../../../../../core/frontend/services/routing/rss-router';
import urlUtils from '../../../../../core/shared/url-utils';

describe('services/routing/RSSRouter', function () {
  describe('instantiate', function () {
    beforeEach(function () {
      sinon.spy(RSSRouter.prototype, 'mountRoute');
      sinon.spy(RSSRouter.prototype, 'mountRouter');

      sinon.stub(urlUtils, 'urlJoin');
    });

    afterEach(async function () {
      sinon.restore();
      await configUtils.restore();
    });

    it('default', function () {
      const rssRouter = new RSSRouter();

      assertExists(rssRouter.router);
      assert.equal(rssRouter.route.value, '/rss/');

      sinon.assert.calledTwice(rssRouter.mountRoute);

      assert.equal(rssRouter.mountRoute.args[0][0], '/rss/');
      assert.equal(rssRouter.mountRoute.args[0][1], controllers.rss);

      assert.equal(rssRouter.mountRoute.args[1][0], '/feed/');
    });

    it('subdirectory is enabled', function () {
      configUtils.set('url', 'http://localhost:22222/blog/');
      const rssRouter = new RSSRouter();

      assertExists(rssRouter.router);
      assert.equal(rssRouter.route.value, '/rss/');

      sinon.assert.calledTwice(rssRouter.mountRoute);

      assert.equal(rssRouter.mountRoute.args[0][0], '/rss/');
      assert.equal(rssRouter.mountRoute.args[0][1], controllers.rss);

      assert.equal(rssRouter.mountRoute.args[1][0], '/feed/');
    });
  });
});
