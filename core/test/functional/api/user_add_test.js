/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should = require('should'),
    request = require('request');

request = request.defaults({jar:true});

describe('User Add API', function () {

    var user = testUtils.DataGenerator.forModel.users[0];

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                return testUtils.initData();
            }).then(function () {
                done();
            }, done);
    });

    it('can add a user via API', function (done) {
        request.post(testUtils.API.getApiURL('users/'), function (error, response, body) {
            response.should.have.status(200);
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;
            jsonResponse.email.should.eql(user.email);
            // attempt to log in with created user
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
        }).form({
            name: user.name,
            email: user.email,
            hashedPassword: testUtils.DataGenerator.Content.users[0].password //hashed password
        });
    });
});