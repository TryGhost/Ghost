import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import express from 'express';
import sinon from 'sinon';
import request from 'supertest';

import { filterQueryParameters } from '../../../../../../core/server/web/parent/middleware/filter-query-parameters';

describe('Middleware: filterQueryParameters', function () {
  function createApp() {
    const app = express();

    app.use(filterQueryParameters);
    app.use((req, res) => {
      res.json({
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        query: req.query,
      });
    });

    return app;
  }

  afterEach(function () {
    sinon.restore();
  });

  async function getRequestState(requestTarget: string) {
    const response = await request(createApp()).get(requestTarget).expect(200);
    return response.body;
  }

  describe('request filtering', function () {
    beforeEach(function () {
      sinon.stub(logging, 'warn');
    });

    it('allows arbitrary parameters on exempt paths', async function () {
      const requestTarget = '/.ghost/activitypub/inbox?utm_source=newsletter&unknown=value';
      const state = await getRequestState(requestTarget);

      assert.equal(state.originalUrl, requestTarget);
      assert.deepEqual(state.query, {
        utm_source: 'newsletter',
        unknown: 'value',
      });
    });

    it('applies the Content API allowlist', async function () {
      const state = await getRequestState(
        '/ghost/api/content/posts/?key=content-key&include=authors&unknown=value&m=member-id',
      );

      assert.equal(state.originalUrl, '/ghost/api/content/posts/?key=content-key&include=authors');
      assert.deepEqual(state.query, {
        key: 'content-key',
        include: 'authors',
      });
    });

    it('preserves repeated allowed parameters', async function () {
      const state = await getRequestState('/members/?ids=one&ids=two&unknown=value');

      assert.equal(state.originalUrl, '/members/?ids=one&ids=two');
      assert.deepEqual(state.query, {
        ids: ['one', 'two'],
      });
    });

    it('preserves admin toolbar, gift link, and automation parameters', async function () {
      const requestTarget = '/post/?admin=true&admin_toolbar=0&gift=unlock-token&step=run-step-id';
      const state = await getRequestState(requestTarget);

      assert.equal(state.originalUrl, requestTarget);
      assert.deepEqual(state.query, {
        admin: 'true',
        admin_toolbar: '0',
        gift: 'unlock-token',
        step: 'run-step-id',
      });
    });

    it('preserves notification unsubscribe and tier preview parameters', async function () {
      const requestTarget = '/unsubscribe/?comments=1&updatesandannouncements=1&member_tier=silver';
      const state = await getRequestState(requestTarget);

      assert.equal(state.originalUrl, requestTarget);
      assert.deepEqual(state.query, {
        comments: '1',
        updatesandannouncements: '1',
        member_tier: 'silver',
      });
    });

    it('preserves fields for the frontend comments API', async function () {
      const requestTarget = '/members/api/comments/post/post-id/?fields=id%2Cpinned';
      const state = await getRequestState(requestTarget);

      assert.equal(state.originalUrl, requestTarget);
      assert.deepEqual(state.query, {
        fields: 'id,pinned',
      });
    });
  });

  it('updates the Express request and logs stripped undeclared parameters', async function () {
    const warn = sinon.stub(logging, 'warn');

    await request(createApp())
      .get('/r/example?step=run-step-id&m=member-id&unknown=value')
      .expect(200)
      .expect({
        originalUrl: '/r/example?step=run-step-id&m=member-id',
        url: '/r/example?step=run-step-id&m=member-id',
        path: '/r/example',
        query: {
          step: 'run-step-id',
          m: 'member-id',
        },
      });

    sinon.assert.calledOnceWithExactly(
      warn,
      '[query-parameter-filter] Stripped undeclared query parameter(s) from /r/example: unknown',
    );
  });

  it('limits the number of stripped parameter names in warning logs', async function () {
    const warn = sinon.stub(logging, 'warn');
    const query = Array.from(
      { length: 12 },
      (_, index) => `unknown_${String.fromCharCode(97 + index)}=value`,
    ).join('&');

    await request(createApp()).get(`/example?${query}`).expect(200);

    sinon.assert.calledOnceWithExactly(
      warn,
      '[query-parameter-filter] Stripped undeclared query parameter(s) from /example: unknown_a, unknown_b, unknown_c, unknown_d, unknown_e, unknown_f, unknown_g, unknown_h, unknown_i, unknown_j, and 2 more',
    );
  });

  it('does not warn when all parameters are allowed', async function () {
    const warn = sinon.stub(logging, 'warn');

    await request(createApp())
      .get('/welcome/?utm_source=newsletter&ref=weekly&m=member-id')
      .expect(200)
      .expect({
        originalUrl: '/welcome/?utm_source=newsletter&ref=weekly&m=member-id',
        url: '/welcome/?utm_source=newsletter&ref=weekly&m=member-id',
        path: '/welcome/',
        query: {
          utm_source: 'newsletter',
          ref: 'weekly',
          m: 'member-id',
        },
      });

    sinon.assert.notCalled(warn);
  });

  it('preserves query parameters on exempt paths', async function () {
    await request(createApp())
      .get('/ghost/api/admin/session/?include=roles')
      .expect(200)
      .expect({
        originalUrl: '/ghost/api/admin/session/?include=roles',
        url: '/ghost/api/admin/session/?include=roles',
        path: '/ghost/api/admin/session/',
        query: {
          include: 'roles',
        },
      });
  });

  it('works when mounted below the application root', async function () {
    const app = express();
    sinon.stub(logging, 'warn');

    app.use('/nested', filterQueryParameters, (req, res) => {
      res.json({
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        query: req.query,
      });
    });

    await request(app)
      .get('/nested/r/example?step=run-step-id&unknown=value')
      .expect(200)
      .expect({
        originalUrl: '/nested/r/example?step=run-step-id',
        url: '/r/example?step=run-step-id',
        path: '/r/example',
        query: {
          step: 'run-step-id',
        },
      });
  });

  // We can remove this test once we upgrade to Express 5.
  it('supports a getter-only query property, which is the case in Express 5', async function () {
    const app = express();
    sinon.stub(logging, 'warn');

    // Simulates [Express 5's `req.query`][0].
    // [0]: https://github.com/expressjs/express/blob/a3714473feb3d2908add734d340e7755fd85e0a3/lib/request.js#L230
    app.use((req, _res, next) => {
      const originalQuery = req.query;
      Object.defineProperty(req, 'query', {
        get: () => originalQuery,
      });
      next();
    });
    app.use(filterQueryParameters);
    app.use((req, res) => {
      res.json({
        originalUrl: req.originalUrl,
        url: req.url,
        path: req.path,
        query: req.query,
      });
    });

    await request(app)
      .get('/r/example?step=run-step-id&m=member-id&unknown=value')
      .expect(200)
      .expect({
        originalUrl: '/r/example?step=run-step-id&m=member-id',
        url: '/r/example?step=run-step-id&m=member-id',
        path: '/r/example',
        query: {
          step: 'run-step-id',
          m: 'member-id',
        },
      });
  });
});
