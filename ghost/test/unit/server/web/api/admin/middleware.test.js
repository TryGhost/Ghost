const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

// Module under test
const middleware = require('../../../../../../core/server/web/api/endpoints/admin/middleware');

const { http, pipeline } = require('@tryghost/api-framework');

const named = (name) => middleware.authAdminApi.find((handler) => handler.name === name);
const tokenPermissionCheck = named('tokenPermissionCheck');
const refuseAppEarly = named('refuseAppEarly');

const createApiKey = (userId) => {
  return {
    get(field) {
      if (field === 'user_id') {
        return userId;
      }
    },
  };
};

const createApp = ({ apiKey = null, user = null, auth = undefined } = {}) => {
  const app = express();

  app.use((req, res, next) => {
    req.api_key = apiKey;
    req.user = user;
    req.auth = auth;
    next();
  });

  app.use(tokenPermissionCheck);

  app.use((req, res) => {
    res.json({ ok: true });
  });

  app.use((err, req, res, _next) => {
    void _next;

    res.status(err.statusCode || 500).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
  });

  return app;
};

describe('Admin API Middleware', function () {
  describe('tokenPermissionCheck', function () {
    describe('User Authentication (no API key)', function () {
      it('should call next() when user is authenticated without API key', async function () {
        await request(
          createApp({
            user: { id: 'abcd1234' },
          }),
        )
          .get('/posts')
          .expect(200)
          .expect({ ok: true });
      });
    });

    describe('Staff Token Authentication', function () {
      const app = createApp({
        apiKey: createApiKey('abcd1234'),
        user: { id: 'abcd1234', role: 'Editor' },
      });

      it('should allow staff tokens to access regular endpoints', async function () {
        await request(app).get('/posts/').expect(200).expect({ ok: true });
      });

      it('should block staff tokens from DELETE /db/ endpoint', async function () {
        await request(app)
          .delete('/db/')
          .expect(403)
          .expect({
            error: {
              message: 'Staff tokens are not allowed to access this endpoint',
              statusCode: 403,
            },
          });
      });

      it('should block staff tokens from PUT /users/owner/ endpoint', async function () {
        await request(app)
          .put('/users/owner/')
          .expect(403)
          .expect({
            error: {
              message: 'Staff tokens are not allowed to access this endpoint',
              statusCode: 403,
            },
          });
      });

      it('should allow staff tokens to POST to /db/ endpoint', async function () {
        await request(app).post('/db/').expect(200).expect({ ok: true });
      });

      it('should allow staff tokens to GET /users/owner/ endpoint', async function () {
        await request(app).get('/users/owner/').expect(200).expect({ ok: true });
      });

      it('should allow staff tokens to access endpoints without trailing slash', async function () {
        await request(app).get('/posts').expect(200).expect({ ok: true });
      });

      it('should block staff tokens from DELETE /db (without trailing slash)', async function () {
        await request(app)
          .delete('/db')
          .expect(403)
          .expect({
            error: {
              message: 'Staff tokens are not allowed to access this endpoint',
              statusCode: 403,
            },
          });
      });

      it('should block staff tokens from PUT /users/owner (without trailing slash)', async function () {
        await request(app)
          .put('/users/owner')
          .expect(403)
          .expect({
            error: {
              message: 'Staff tokens are not allowed to access this endpoint',
              statusCode: 403,
            },
          });
      });
    });

    describe('App Token Authentication', function () {
      const app = createApp({
        user: { id: 'abcd1234', role: 'Owner' },
        auth: { kind: 'app', method: 'app_user_token' },
      });
      const blocked = {
        message: 'Apps are not allowed to access this endpoint',
        statusCode: 403,
      };

      for (const [method, paths] of [
        ['delete', ['/db/', '/db', '/DB/', '/Db']],
        ['put', ['/users/owner/', '/users/owner', '/USERS/OWNER/', '/Users/Owner']],
        [
          'post',
          [
            '/authentication/reset/',
            '/authentication/reset',
            '/AUTHENTICATION/RESET/',
            '/Authentication/Reset',
          ],
        ],
      ]) {
        for (const path of paths) {
          it(`should block apps from ${method.toUpperCase()} ${path}`, async function () {
            await request(app)[method](path).expect(403).expect({ error: blocked });
          });
        }
      }

      it('should leave apps to the permission system on other methods of those paths', async function () {
        await request(app).get('/db/').expect(200).expect({ ok: true });
        await request(app).get('/users/owner/').expect(200).expect({ ok: true });
        await request(app).get('/authentication/reset/').expect(200).expect({ ok: true });
      });

      it('should leave apps to the permission system on other endpoints', async function () {
        await request(app).get('/posts/').expect(200).expect({ ok: true });
        await request(app).delete('/posts/1/').expect(200).expect({ ok: true });
      });
    });

    describe('Integration Token Authentication', function () {
      const app = createApp({
        apiKey: createApiKey(null),
      });

      it('should allow integration tokens to access allowlisted endpoints', async function () {
        await request(app).get('/posts').expect(200).expect({ ok: true });
      });

      it('should block integration tokens from non-allowlisted endpoints', async function () {
        await request(app)
          .get('/non-existent')
          .expect(403)
          .expect({
            error: {
              message: 'API tokens do not have permission to access this endpoint',
              statusCode: 403,
            },
          });
      });

      it('should allow integration tokens to POST to /db endpoint', async function () {
        await request(app).post('/db').expect(200).expect({ ok: true });
      });

      it('should block integration tokens from DELETE /db endpoint', async function () {
        await request(app)
          .delete('/db')
          .expect(403)
          .expect({
            error: {
              message: 'API tokens do not have permission to access this endpoint',
              statusCode: 403,
            },
          });
      });
    });

    describe('God Mode', function () {
      const originalEnv = process.env.NODE_ENV;

      afterEach(function () {
        process.env.NODE_ENV = originalEnv;
      });

      it('should allow access in development with god_mode query param', async function () {
        process.env.NODE_ENV = 'development';

        await request(
          createApp({
            apiKey: createApiKey(null),
          }),
        )
          .get('/non-existent?god_mode=true')
          .expect(200)
          .expect({ ok: true });
      });

      it('should not allow god mode in production', async function () {
        process.env.NODE_ENV = 'production';

        await request(
          createApp({
            apiKey: createApiKey(null),
          }),
        )
          .get('/non-existent?god_mode=true')
          .expect(403)
          .expect({
            error: {
              message: 'API tokens do not have permission to access this endpoint',
              statusCode: 403,
            },
          });
      });
    });
  });

  describe('refuseAppEarly', function () {
    const controller = pipeline(
      {
        docName: 'posts',
        browse: { permissions: true, query: () => ({ ran: true }) },
        upload: { permissions: false, query: () => ({ ran: true }) },
        importCSV: {
          permissions: { docName: 'content_imports', method: 'importContent' },
          query: () => ({ ran: true }),
        },
      },
      { permissions: { handle: async () => {}, handleUnchecked: async () => {} } },
    );

    /** An app holding `scopes`, on routes whose middleware records that it ran */
    const createRoutes = (auth) => {
      const app = express();
      const ran = [];
      const sideEffect = (req, res, next) => {
        ran.push(req.path);
        next();
      };
      app.use((req, res, next) => {
        req.auth = auth;
        next();
      });
      app.get('/posts', refuseAppEarly, sideEffect, http(controller.browse));
      app.post('/upload', refuseAppEarly, sideEffect, http(controller.upload));
      app.post('/import', refuseAppEarly, sideEffect, http(controller.importCSV));
      app.post('/not-http', refuseAppEarly, sideEffect, (req, res) => res.json({ ok: true }));
      app
        .route('/multi')
        .get(refuseAppEarly, sideEffect, http(controller.browse))
        .post(refuseAppEarly, sideEffect, http(controller.upload));
      app.route('/any').all(refuseAppEarly, sideEffect, http(controller.browse));
      app.use((err, req, res, _next) => {
        void _next;
        res.status(err.statusCode).json({ type: err.errorType, message: err.message });
      });
      return { app, ran };
    };

    const app = (scopes) => ({ kind: 'app', method: 'app_user_token', scopes });

    it('refuses an app without the scope the method checks, before the route runs', async function () {
      const { app: routes, ran } = createRoutes(app(['tag:browse']));

      await request(routes).get('/posts').expect(403).expect({
        type: 'NoPermissionError',
        message: 'You do not have permission to browse posts',
      });
      await request(routes).post('/import').expect(403).expect({
        type: 'NoPermissionError',
        message: 'You do not have permission to importContent content_imports',
      });
      assert.deepEqual(ran, []);
    });

    it('refuses an app on a method it may not call unchecked, before the route runs', async function () {
      const { app: routes, ran } = createRoutes(app(['post:browse']));

      await request(routes).post('/upload').expect(403).expect({
        type: 'NoPermissionError',
        message: 'Apps do not have permission to upload posts',
      });
      assert.deepEqual(ran, []);
    });

    it('lets an app with the scope through to the route', async function () {
      const { app: routes, ran } = createRoutes(
        app(['post:browse', 'content_import:importContent']),
      );

      await request(routes).get('/posts').expect(200);
      await request(routes).post('/import').expect(200);
      assert.deepEqual(ran, ['/posts', '/import']);
    });

    it('judges a route serving several verbs by the method the request runs', async function () {
      const { app: routes, ran } = createRoutes(app(['post:browse']));

      await request(routes).get('/multi').expect(200);
      await request(routes).head('/multi').expect(200);
      await request(routes).post('/any').expect(200);
      await request(routes).post('/multi').expect(403).expect({
        type: 'NoPermissionError',
        message: 'Apps do not have permission to upload posts',
      });
      assert.deepEqual(ran, ['/multi', '/multi', '/any']);
    });

    it('leaves a route that does not end in http() to its own checks', async function () {
      const { app: routes, ran } = createRoutes(app([]));

      await request(routes).post('/not-http').expect(200);
      assert.deepEqual(ran, ['/not-http']);
    });

    it('leaves every other principal to the route', async function () {
      for (const auth of [{ kind: 'user' }, { kind: 'integration' }, undefined]) {
        const { app: routes, ran } = createRoutes(auth);

        await request(routes).get('/posts').expect(200);
        await request(routes).post('/upload').expect(200);
        assert.deepEqual(ran, ['/posts', '/upload']);
      }
    });
  });
});
