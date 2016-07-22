var supertest = require('supertest'),
    /*jshint unused:false*/
    should = require('should'),
    ghost = require('../../../../../core'),
    request;

describe('Tag API', function (tnv) {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return tnv.doAuth(request, 'posts');
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        tnv.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can retrieve all tags', function (done) {
        request.get(tnv.API.getApiQuery('tags/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', tnv.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.tags);
                jsonResponse.tags.should.have.length(6);
                tnv.API.checkResponse(jsonResponse.tags[0], 'tag');
                tnv.API.isISO8601(jsonResponse.tags[0].created_at).should.eql(true);
                done();
            });
    });
});
