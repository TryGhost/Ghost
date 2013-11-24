/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request');

request = request.defaults({jar:true})

describe('User API', function () {

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

    it('can retrieve all users', function (done) {
        request.get(testUtils.API.getApiURL('users/'), function (error, response, body) {
            response.should.have.status(200);
            should.not.exist(response.headers['x-cache-invalidate']);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse[0].should.exist;

            testUtils.API.checkResponse(jsonResponse[0], 'user');
            done();
        });
    });

    it('can retrieve a user', function (done) {
        request.get(testUtils.API.getApiURL('users/me/'), function (error, response, body) {
            response.should.have.status(200);
            should.not.exist(response.headers['x-cache-invalidate']);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;

            testUtils.API.checkResponse(jsonResponse, 'user');
            done();
        });
    });

    it('can\'t retrieve non existent user', function (done) {
        request.get(testUtils.API.getApiURL('users/99/'), function (error, response, body) {
            response.should.have.status(404);
            should.not.exist(response.headers['x-cache-invalidate']);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;

            testUtils.API.checkResponseValue(jsonResponse, ['error']);
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
                response.headers['x-cache-invalidate'].should.eql('/*');
                response.should.be.json;
                putBody.should.exist;
                putBody.website.should.eql(changedValue);

                testUtils.API.checkResponse(putBody, 'user');
                done();
            });
        });
    });
});
