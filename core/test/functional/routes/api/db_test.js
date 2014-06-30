/*global describe, it, before, after */
var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request;


describe('DB API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        accesstoken = '';

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

    it('attaches the Content-Disposition header on export', function (done) {
        request.get(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });
});
