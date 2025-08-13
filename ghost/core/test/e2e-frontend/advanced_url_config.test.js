const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const urlUtils = require('../utils/urlUtils');
const {mockManager} = require('../utils/e2e-framework');

let request;

/**
 * This file contains extra e2e tests for complex URL configurations
 * Examples of e2e tests that belong here:
 * - subdirectories
 * - https
 * - (maybe) admin + frontend URL are different
 * - etc
 */

describe('Advanced URL Configurations', function () {
    describe('Subdirectory config', function () {
        before(async function () {
            configUtils.set('url', 'http://localhost/blog/');
            urlUtils.stubUrlUtilsFromConfig();
            mockManager.mockMail();

            await testUtils.startGhost();

            request = supertest.agent(configUtils.config.get('server:host') + ':' + configUtils.config.get('server:port'));
        });

        after(async function () {
            await configUtils.restore();
            await urlUtils.restore();
            mockManager.restore();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('http://localhost should 404', async function () {
            await request.get('/')
                .expect(404);
        });

        it('/blog should 301 to /blog/', async function () {
            await request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/');
        });

        it('/blog/ should 200', async function () {
            await request.get('/blog/')
                .expect(200);
        });

        it('/blog/welcome/ should 200', async function () {
            await request.get('/blog/welcome/')
                .expect(200);
        });

        it('/welcome/ should 404', async function () {
            await request.get('/welcome/')
                .expect(404);
        });

        it('/blog/tag/getting-started/ should 200', async function () {
            await request.get('/blog/tag/getting-started/')
                .expect(200);
        });

        it('/tag/getting-started/ should 404', async function () {
            await request.get('/tag/getting-started/')
                .expect(404);
        });

        it('/blog/welcome/amp/ should 301', async function () {
            await request.get('/blog/welcome/amp/')
                .expect(301);
        });

        it('/welcome/amp/ should 404', async function () {
            await request.get('/welcome/amp/')
                .expect(404);
        });

        describe('Preview routes', function () {
            before(async function () {
                // NOTE: ideally we'd only insert the single draft post we want to test here
                // but we don't have a way to do that just now and are already planning to
                // replace the fixture system
                await testUtils.fixtures.insertPostsAndTags();
            });

            it('should not cache preview routes', async function () {
                await request.get('/blog/p/d52c42ae-2755-455c-80ec-70b2ec55c903/')
                    .expect(200)
                    .expect('Cache-Control', testUtils.cacheRules.noCache);
            });
        });
    });

    describe('Subdirectory config: /ghost/ redirects with separate admin', function () {
        before(async function () {
            configUtils.set('url', 'http://localhost/blog/');
            configUtils.set('admin:redirects', true);
            configUtils.set('admin:url', 'http://admin.localhost/');
            urlUtils.stubUrlUtilsFromConfig();
            await testUtils.startGhost();
            request = supertest.agent(configUtils.config.get('server:host') + ':' + configUtils.config.get('server:port'));
        });

        after(async function () {
            await urlUtils.restore();
            await configUtils.restore();
            await testUtils.startGhost();
            request = supertest.agent(configUtils.config.get('server:host') + ':' + configUtils.config.get('server:port'));
        });

        it('/blog/ghost should redirect to external admin SPA', async function () {
            await request.get('/blog/ghost')
                .expect(301)
                .expect('Location', 'http://admin.localhost/blog/ghost/');
        });

        it('/blog/ghost/ should redirect to external admin SPA', async function () {
            await request.get('/blog/ghost/')
                .expect(301)
                .expect('Location', 'http://admin.localhost/blog/ghost/');
        });

        it('/blog/ghost/api/admin/posts/ should redirect to external admin API route', async function () {
            await request.get('/blog/ghost/api/admin/posts/')
                .expect(301)
                .expect('Location', 'http://admin.localhost/blog/ghost/api/admin/posts/');
        });

        it('/blog/ghost/api/admin/site/ should redirect to external admin API route', async function () {
            await request.get('/blog/ghost/api/admin/site/')
                .expect(301)
                .expect('Location', 'http://admin.localhost/blog/ghost/api/admin/site/');
        });
    });
});
