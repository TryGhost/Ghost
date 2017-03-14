// # Api Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...
var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

require('should-http');

describe('Unauthorized', function () {
    var ghostServer;

    before(function (done) {
        ghost().then(function (_ghostServer) {
            ghostServer = _ghostServer;
            return ghostServer.start();
        }).then(function () {
            request = supertest.agent(config.get('url'));
            done();
        }).catch(done);
    });

    after(function () {
        return testUtils.clearData()
            .then(function () {
                return ghostServer.stop();
            })
            .catch();
    });

    it('returns 401 error for known endpoint', function (done) {
        request.get(testUtils.API.getApiQuery('posts/'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function firstRequest(err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json();
                should.exist(res.body);
                res.body.should.be.a.JSONErrorResponse();

                done();
            });
    });

    it('returns 404 error for unknown endpoint', function (done) {
        request.get(testUtils.API.getApiQuery('unknown/'))
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404)
            .end(function firstRequest(err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json();
                should.exist(res.body);
                res.body.should.be.a.JSONErrorResponse();

                done();
            });
    });
});

describe('Authorized API', function () {
    var accesstoken, ghostServer;

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (_ghostServer) {
            ghostServer = _ghostServer;
            return ghostServer.start();
        }).then(function () {
            request = supertest.agent(config.get('url'));
        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function () {
        return testUtils.clearData()
            .then(function () {
                return ghostServer.stop();
            });
    });

    it('serves a JSON 404 for an unknown endpoint', function (done) {
        request.get(testUtils.API.getApiQuery('unknown/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(404)
            .end(function firstRequest(err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json();
                should.exist(res.body);
                res.body.should.be.a.JSONErrorResponse();

                done();
            });
    });
});
