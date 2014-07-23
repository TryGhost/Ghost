/*global describe, it, before, after */
/*jshint expr:true*/
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    express       = require('express'),

    ghost         = require('../../../../../core'),

    httpServer,
    request;

describe('Slug API', function () {
    var accesstoken = '';

    before(function (done) {
        var app = express();
        app.set('disableLoginLimiter', true);

        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            request = supertest.agent(app);

        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            httpServer.close();
            done();
        });
    });

    it('should be able to get a post slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/post/a post title/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.slugs.should.exist;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.slugs.should.exist;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.slugs.should.exist;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.slugs.should.exist;
                jsonResponse.slugs.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.slugs[0], 'slug');
                jsonResponse.slugs[0].slug.should.equal('cool-app');

                done();
            });
    });

    it('should not be able to get a slug for an unknown type', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/unknown/who knows/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;
                jsonResponse.should.not.exist;

                done();
            });
    });
});
