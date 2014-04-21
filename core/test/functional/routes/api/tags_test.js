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


describe('Tag API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;
            // request = supertest(app);
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

                            setTimeout(function () {
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

                            }, 2000);

                        });
                }, done);
        }).otherwise(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function () {
        httpServer.close();
    });

    it('can retrieve all tags', function (done) {
        request.get(testUtils.API.getApiQuery('tags/'))
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                res.should.be.json;
                var jsonResponse = res.body;
                jsonResponse.should.exist;
                jsonResponse.tags.should.exist;
                jsonResponse.tags.should.have.length(6);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                done();
            });
    });


});