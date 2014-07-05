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
        accesstoken = '';

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
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
                    request.post('/ghost/api/v0.1/authentication/token/')
                        .send({ grant_type: "password", username: user.email, password: user.password, client_id: "ghost-admin"})
                        .expect('Content-Type', /json/)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            var jsonResponse = res.body;
                            testUtils.API.checkResponse(jsonResponse, 'accesstoken');
                            accesstoken = jsonResponse.access_token;
                            return done();
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

    it('can retrieve all tags', function (done) {
        request.get(testUtils.API.getApiQuery('tags/'))
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
                jsonResponse.tags.should.exist;
                jsonResponse.tags.should.have.length(6);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.isISO8601(jsonResponse.tags[0].created_at).should.be.true;

                done();
            });
    });


});