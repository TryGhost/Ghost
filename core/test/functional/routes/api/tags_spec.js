var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Tag API', function () {
    var accesstoken = '', ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.doAuth(request, 'posts');
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    it('can retrieve all tags', function (done) {
        request.get(testUtils.API.getApiQuery('tags/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(6);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true();

                done();
            });
    });
});
