var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Slug API', function () {
    var accesstoken = '', ghostServer;

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

    it('should be able to get a post slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/post/a post title/'))
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
                should.exist(jsonResponse.slugs);
                jsonResponse.slugs.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('a-post-title');

                done();
            });
    });

    it('should be able to get a tag slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/post/atag/'))
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
                should.exist(jsonResponse.slugs);
                jsonResponse.slugs.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('atag');

                done();
            });
    });

    it('should be able to get a user slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/user/user name/'))
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
                should.exist(jsonResponse.slugs);
                jsonResponse.slugs.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('user-name');

                done();
            });
    });

    it('should be able to get an app slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/app/cool app/'))
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
                should.exist(jsonResponse.slugs);
                jsonResponse.slugs.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('cool-app');

                done();
            });
    });

    it('should not be able to get a slug for an unknown type', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/unknown/who knows/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;
                should.exist(jsonResponse.errors);

                done();
            });
    });
});
