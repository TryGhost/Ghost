var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    ghost         = testUtils.startGhost,
    request;

describe('Configuration API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request, 'posts');
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('success', function () {
        it('can retrieve public configuration', function (done) {
            request.get(testUtils.API.getApiQuery('configuration/'))
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err, res) {
                    should.exist(res.body.configuration);
                    done();
                });
        });
    });
});
