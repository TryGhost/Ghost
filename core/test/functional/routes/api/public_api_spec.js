/*global describe, it, before, after */
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    _             = require('lodash'),

    ghost         = require('../../../../../core'),

    request;

describe('Public API', function () {
    var publicAPIaccessSetting = {
        settings: [
            {key: 'labs', value: {publicAPI: true}}
        ]
    };

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request, 'posts', 'tags');
        }).then(function (token) {
            // enable public API
            request.put(testUtils.API.getApiQuery('settings/'))
                .set('Authorization', 'Bearer ' + token)
                .send(publicAPIaccessSetting)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }
                    done();
                });
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('browse posts', function (done) {
        request.get(testUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(5);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('browse posts, ignores staticPages', function (done) {
        request.get(testUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&staticPages=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(5);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('browse tags without limit defaults to 15', function (done) {
        request.get(testUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(15);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags - limit=all should fetch all tags', function (done) {
        request.get(testUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(56);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags without limit=4 fetches 4 tags', function (done) {
        request.get(testUtils.API.getApiQuery('tags/?limit=4&client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(4);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('denies access with invalid client_secret', function (done) {
        request.get(testUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=invalid_secret'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });

    it('denies access with invalid client_id', function (done) {
        request.get(testUtils.API.getApiQuery('posts/?client_id=invalid-id&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });

    it('denies access from invalid origin', function (done) {
        request.get(testUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', 'http://invalid-origin')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });

    it('denies access to settings endpoint', function (done) {
        request.get(testUtils.API.getApiQuery('settings/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                done();
            });
    });
});
