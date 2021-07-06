const should = require('should');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const urlUtils = require('../utils/urlUtils');

let request;

/**
 * This file contains extra acceptance tests for complex URL configurations
 * Examples of acceptance tests that belong here:
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

        it('/blog/welcome/amp/ should 200', async function () {
            await request.get('/blog/welcome/amp/')
                .expect(200);
        });

        it('/welcome/amp/ should 404', async function () {
            await request.get('/welcome/amp/')
                .expect(404);
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('HTTPS', function () {
        before(async function () {
            configUtils.set('url', 'http://localhost:2370/');
            urlUtils.stubUrlUtilsFromConfig();

            await testUtils.startGhost({forceStart: true});

            request = supertest.agent(configUtils.config.get('server:host') + ':' + configUtils.config.get('server:port'));
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('should set links to url over non-HTTPS', async function () {
            await request.get('/')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="http:\/\/localhost:2370">Ghost<\/a\>/);
        });

        it('should set links over HTTPS besides canonical', async function () {
            await request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="https:\/\/localhost:2370">Ghost<\/a\>/);
        });
    });
});
