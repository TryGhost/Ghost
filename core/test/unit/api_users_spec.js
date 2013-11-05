/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request'),
    expectedProperties = ['id', 'uuid', 'name', 'slug', 'email', 'image', 'cover', 'bio', 'website',
        'location', 'accessibility', 'status', 'language', 'meta_title', 'meta_description',
        'created_at', 'updated_at'];

request = request.defaults({jar:true})

describe('User API', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                done();
            }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                // do a get request to get the CSRF token first
                request.get(testUtils.API.getSigninURL(), function (error, response, body) {
                    response.should.have.status(200);
                    var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                    pattern_meta.should.exist;
                    csrfToken = body.match(pattern_meta)[1];
                    setTimeout((function() {
                        request.post({uri:testUtils.API.getSigninURL(),
                                headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                            response.should.have.status(200);
                            done();
                        }).form({email: user.email, password: user.password});
                    }), 2000);
                });
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can retrieve all users', function (done) {
        request.get(testUtils.API.getApiURL('users/'), function (error, response, body) {
            response.should.have.status(200);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse[0].should.exist;

            testUtils.API.checkResponse (jsonResponse[0], expectedProperties);
            done();
        });
    });

    it('can retrieve a user', function (done) {
        request.get(testUtils.API.getApiURL('users/me/'), function (error, response, body) {
            response.should.have.status(200);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;

            testUtils.API.checkResponse (jsonResponse, expectedProperties);
            done();
        });
    });

    it('can\'t retrieve non existent user', function (done) {
        request.get(testUtils.API.getApiURL('users/99/'), function (error, response, body) {
            response.should.have.status(404);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;

            testUtils.API.checkResponse (jsonResponse, ['error']);
            done();
        });
    });

    it('can edit a user', function (done) {
        request.get(testUtils.API.getApiURL('users/me/'), function (error, response, body) {
            var jsonResponse = JSON.parse(body),
                changedValue = 'joe-bloggs.ghost.org';
            jsonResponse.should.exist;
            jsonResponse.website = changedValue;

            request.put({uri: testUtils.API.getApiURL('users/me/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse}, function (error, response, putBody) {
                response.should.have.status(200);
                response.should.be.json;
                putBody.should.exist;
                putBody.website.should.eql(changedValue);

                testUtils.API.checkResponse (putBody, expectedProperties);
                done();
            });
        });
    });
});
