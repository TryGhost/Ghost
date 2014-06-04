/*global describe, it, before, after */
var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;


describe('Slug API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        var app = express();

        ghost({ app: app }).then(function (_httpServer) {
            httpServer = _httpServer;
            request = supertest.agent(app);

            testUtils.clearData()
                .then(function () {
                    return testUtils.initData();
                })
                .then(function () {
                    return testUtils.insertDefaultFixtures();
                })
                .then(function () {
                    request.get('/ghost/signin/')
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                            pattern_meta.should.exist;
                            csrfToken = res.text.match(pattern_meta)[1];

                            process.nextTick(function() {
                                request.post('/ghost/signin/')
                                    .set('X-CSRF-Token', csrfToken)
                                    .send({email: user.email, password: user.password})
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }


                                        request.saveCookies(res);
                                        request.get('/ghost/')
                                            .expect(200)
                                            .end(function (err, res) {
                                                if (err) {
                                                    return done(err);
                                                }

                                                csrfToken = res.text.match(pattern_meta)[1];
                                                done();
                                            });
                                    });

                            });
                        });
                }).catch(done);
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    it('should be able to get a post slug', function (done) {
        request.get(testUtils.API.getApiQuery('slugs/post/a post title/'))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                
                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                
                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
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
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                
                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
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
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }
                
                res.should.be.json;
                var jsonResponse = res.body;
                jsonResponse.should.not.exist;

                done();
            });
    });
});
