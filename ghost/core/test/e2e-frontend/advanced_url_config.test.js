const should = require('should');
const sinon = require('sinon');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const urlUtils = require('../utils/urlUtils');
const settings = require('../../core/shared/settings-cache');

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

            await testUtils.startGhost({forceStart: true});

            request = supertest.agent(configUtils.config.get('server:host') + ':' + configUtils.config.get('server:port'));
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
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

        it('/blog/welcome/amp/ should 200 if amp is enabled', async function () {
            sinon.stub(settings, 'get').callsFake(function (key, ...rest) {
                if (key === 'amp') {
                    return true;
                }
                return settings.get.wrappedMethod.call(settings, key, ...rest);
            });
            await request.get('/blog/welcome/amp/')
                .expect(200);
        });

        it('/blog/welcome/amp/ should 301', async function () {
            await request.get('/blog/welcome/amp/')
                .expect(301);
        });

        it('/welcome/amp/ should 404', async function () {
            await request.get('/welcome/amp/')
                .expect(404);
        });
    });
});
