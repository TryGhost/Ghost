/*global describe, it, before, after */
// # Api Route tests
// As it stands, these tests depend on the database, and as such are integration tests.
// Mocking out the models to not touch the DB would turn these into unit tests, and should probably be done in future,
// But then again testing real code, rather than mock code, might be more useful...

var supertest     = require('supertest'),
    should        = require('should'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),
    request;

require('should-http');

describe('Unauthorized', function () {
    before(function (done) {
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);

            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('Unauthorized API', function () {
        it('can\'t retrieve posts', function (done) {
            request.get(testUtils.API.getApiQuery('posts/'))
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(401)
                .end(function firstRequest(err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json();
                    var jsonResponse = res.body;
                    should.exist(jsonResponse);
                    // TODO: testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();
                });
        });
    });
});
