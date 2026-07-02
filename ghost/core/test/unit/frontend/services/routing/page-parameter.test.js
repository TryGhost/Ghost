const assert = require('node:assert/strict');
const sinon = require('sinon');
const express = require('express');
const request = require('supertest');

const events = require('../../../../../core/server/lib/common/events');
const controllers = require('../../../../../core/frontend/services/routing/controllers');
const {setPageParam, DEFAULT_PAGE_PARAM} = require('../../../../../core/frontend/services/routing/page-param-config');

const RESOURCE_CONFIG = {QUERY: {post: {controller: 'posts', resource: 'posts'}}};

// Builds an express app with a freshly constructed CollectionRouter mounted on it.
// The pagination segment comes from the route settings (pushed via setPageParam),
// which mimics what router-manager.start() does at construction time.
function buildApp(pagination) {
    setPageParam(pagination);

    const CollectionRouter = require('../../../../../core/frontend/services/routing/collection-router');

    const router = new CollectionRouter('/', {permalink: '/:slug/', rss: false}, RESOURCE_CONFIG, () => {});

    const app = express();
    app.use(router.router());
    app.use((err, _req, res, _next) => {
        void _next;
        res.status(err.statusCode || 404).json({errorType: err.name});
    });

    return app;
}

describe('UNIT - services/routing pagination page parameter', function () {
    beforeEach(function () {
        sinon.stub(events, 'emit');
        sinon.stub(events, 'on');

        const collectionStub = sinon.fake((req, res) => {
            res.json({params: req.params});
        });
        sinon.stub(controllers, 'collection').get(() => collectionStub);
    });

    afterEach(function () {
        sinon.restore();
        // Reset the global segment back to the default for the next test.
        setPageParam(DEFAULT_PAGE_PARAM);
    });

    describe('default route settings (page)', function () {
        it('serves /page/2/ and exposes the page param', async function () {
            const app = buildApp(undefined);

            const {body} = await request(app).get('/page/2/').expect(200);
            assert.equal(body.params.page, 2);
        });

        it('redirects /page/1/ to / without a loop', async function () {
            const app = buildApp(undefined);

            await request(app)
                .get('/page/1/')
                .expect(301)
                .expect('Location', '/');
        });

        it('does not serve a custom segment', async function () {
            const app = buildApp(undefined);

            await request(app).get('/seite/2/').expect(404);
        });
    });

    describe('custom route settings (seite)', function () {
        it('serves /seite/2/ and exposes the param under the configured name', async function () {
            const app = buildApp('seite');

            const {body} = await request(app).get('/seite/2/').expect(200);
            assert.equal(body.params.seite, 2);
        });

        it('redirects /seite/1/ to / without a loop', async function () {
            const app = buildApp('seite');

            await request(app)
                .get('/seite/1/')
                .expect(301)
                .expect('Location', '/');
        });

        it('no longer serves the default /page/ segment', async function () {
            const app = buildApp('seite');

            await request(app).get('/page/2/').expect(404);
        });
    });

    describe('invalid route settings', function () {
        function expectFallbackToPage(value) {
            const app = buildApp(value);
            return Promise.all([
                request(app).get('/page/2/').expect(200),
                request(app).get('/page/1/').expect(301).expect('Location', '/')
            ]);
        }

        it('falls back to page for an empty value', async function () {
            await expectFallbackToPage('');
        });

        it('falls back to page for a value containing a slash', async function () {
            await expectFallbackToPage('foo/bar');
        });

        it('falls back to page for a reserved segment', async function () {
            await expectFallbackToPage('tag');
        });
    });
});
