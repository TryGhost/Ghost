/*global describe, it, before, after */
/*jshint expr:true*/
var supertest     = require('supertest'),
    testUtils     = require('../../../utils'),
    ghost         = require('../../../../../core'),
    request;

describe('API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
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
            done();
        }).catch(done);
    });

    it('should return 404 when using invalid path', function (done) {
        request.get(testUtils.API.getApiQuery('invalidpath/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect(404)
            .end(function (err, res) {
                /*jshint unused:false*/
                if (err) {
                    return done(err);
                }

                done();
            });
    });

    it('should return 405 Method not allowed when invalid method is used', function (done) {
        request.put(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect(405)
            .end(function (err, res) {
                /*jshint unused:false*/
                if (err) {
                    return done(err);
                }

                done();
            });
    });
});
