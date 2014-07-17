/*global describe, it, before, after */

// # Api Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;

describe('Unauthorized', function () {

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            // request = supertest(app);
            request = supertest.agent(app);
            testUtils.clearData().then(function () {
                // we initialise data, but not a user.
                return testUtils.initData();
            }).then(function () {
                done();
            }).catch(done);
        });

    });

    after(function () {
        httpServer.close();
    });


    describe('Unauthorized API', function () {
        it('can\'t retrieve posts', function (done) {
            request.get(testUtils.API.getApiQuery('posts/'))
                .expect(401)
                .end(function firstRequest(err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    //TODO: testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();

                });
        });

    });


});