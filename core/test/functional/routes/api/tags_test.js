/*global describe, it, before, after */
/*jshint expr:true*/
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    express       = require('express'),

    ghost         = require('../../../../../core'),

    httpServer,
    request;

describe('Tag API', function () {
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
            return testUtils.doAuth(request, 'posts');
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