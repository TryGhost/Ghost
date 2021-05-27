const should = require('should');
const supertest = require('supertest');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const urlUtils = require('../utils/urlUtils');
const config = require('../../core/shared/config');
const ghost = testUtils.startGhost;

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
    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.not.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    describe('Subdirectory config', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost/blog/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true, subdir: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('http://localhost should 404', function (done) {
            request.get('/')
                .expect(404)
                .end(doEnd(done));
        });

        it('/blog should 301 to /blog/', function (done) {
            request.get('/blog')
                .expect(301)
                .expect('Location', '/blog/')
                .end(doEnd(done));
        });

        it('/blog/ should 200', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/blog/welcome/ should 200', function (done) {
            request.get('/blog/welcome/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/welcome/ should 404', function (done) {
            request.get('/welcome/')
                .expect(404)
                .end(doEnd(done));
        });

        it('/blog/tag/getting-started/ should 200', function (done) {
            request.get('/blog/tag/getting-started/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/tag/getting-started/ should 404', function (done) {
            request.get('/tag/getting-started/')
                .expect(404)
                .end(doEnd(done));
        });

        it('/blog/welcome/amp/ should 200', function (done) {
            request.get('/blog/welcome/amp/')
                .expect(200)
                .end(doEnd(done));
        });

        it('/welcome/amp/ should 404', function (done) {
            request.get('/welcome/amp/')
                .expect(404)
                .end(doEnd(done));
        });
    });

    // we'll use X-Forwarded-Proto: https to simulate an 'https://' request behind a proxy
    describe('HTTPS', function () {
        let ghostServer;

        before(function () {
            configUtils.set('url', 'http://localhost:2370/');
            urlUtils.stubUrlUtilsFromConfig();

            return ghost({forceStart: true})
                .then(function (_ghostServer) {
                    ghostServer = _ghostServer;
                    request = supertest.agent(config.get('server:host') + ':' + config.get('server:port'));
                });
        });

        after(function () {
            configUtils.restore();
            urlUtils.restore();
        });

        it('should set links to url over non-HTTPS', function (done) {
            request.get('/')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="http:\/\/localhost:2370">Ghost<\/a\>/)
                .end(doEnd(done));
        });

        it('should set links over HTTPS besides canonical', function (done) {
            request.get('/')
                .set('X-Forwarded-Proto', 'https')
                .expect(200)
                .expect(/<link rel="canonical" href="http:\/\/localhost:2370\/" \/\>/)
                .expect(/<a href="https:\/\/localhost:2370">Ghost<\/a\>/)
                .end(doEnd(done));
        });
    });
});
