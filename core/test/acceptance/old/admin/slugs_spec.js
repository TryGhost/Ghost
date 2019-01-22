var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils'),
    localUtils = require('./utils'),
    config = require('../../../../server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Slug API', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    it('should be able to get a post slug', function (done) {
        request.get(localUtils.API.getApiQuery('slugs/post/a post title/'))
            .set('Origin', config.get('url'))
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
                localUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('a-post-title');

                done();
            });
    });

    it('should be able to get a tag slug', function (done) {
        request.get(localUtils.API.getApiQuery('slugs/post/atag/'))
            .set('Origin', config.get('url'))
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
                localUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('atag');

                done();
            });
    });

    it('should be able to get a user slug', function (done) {
        request.get(localUtils.API.getApiQuery('slugs/user/user name/'))
            .set('Origin', config.get('url'))
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
                localUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('user-name');

                done();
            });
    });

    it('should be able to get an app slug', function (done) {
        request.get(localUtils.API.getApiQuery('slugs/app/cool app/'))
            .set('Origin', config.get('url'))
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
                localUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('cool-app');

                done();
            });
    });

    it('should not be able to get a slug for an unknown type', function (done) {
        request.get(localUtils.API.getApiQuery('slugs/unknown/who knows/'))
            .set('Origin', config.get('url'))
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422)
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
