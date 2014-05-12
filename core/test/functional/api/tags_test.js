/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request');

request = request.defaults({jar:true})

describe('Tag API', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                return testUtils.initData();
            })
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                request.get(testUtils.API.getSigninURL(), function (error, response, body) {
                    response.should.have.status(200);
                    var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                    pattern_meta.should.exist;
                    csrfToken = body.match(pattern_meta)[1];
                    setTimeout((function () {
                        request.post({uri: testUtils.API.getSigninURL(),
                                headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                            response.should.have.status(200);
                            request.get(testUtils.API.getAdminURL(), function (error, response, body) {
                                response.should.have.status(200);
                                csrfToken = body.match(pattern_meta)[1];
                                done();
                            });
                        }).form({email: user.email, password: user.password});
                    }), 2000);
                });
            }, done);
    });

    it('can retrieve all tags', function (done) {
        request.get(testUtils.API.getApiURL('tags/'), function (error, response, body) {
            response.should.have.status(200);
            should.not.exist(response.headers['x-cache-invalidate']);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;
            jsonResponse.should.have.length(5);
            testUtils.API.checkResponse(jsonResponse[0], 'tag');
            done();
        });
    });
});
