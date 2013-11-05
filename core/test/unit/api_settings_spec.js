/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request'),
    // TODO: remove databaseVersion
    expectedProperties = ['databaseVersion', 'title', 'description', 'email', 'logo', 'cover', 'defaultLang',
        'postsPerPage', 'forceI18n', 'activeTheme', 'activePlugins', 'installedPlugins', 'availableThemes'];

request = request.defaults({jar:true})

describe('Settings API', function () {

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

    // TODO: currently includes values of type=core
    it('can retrieve all settings', function (done) {
        request.get(testUtils.API.getApiURL('settings/'), function (error, response, body) {
            response.should.have.status(200);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;

            testUtils.API.checkResponse (jsonResponse, expectedProperties);
            done();
        });
    });
    it('can retrieve a setting', function (done) {
        request.get(testUtils.API.getApiURL('settings/title/'), function (error, response, body) {
            response.should.have.status(200);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);

            jsonResponse.should.exist;
            testUtils.API.checkResponse (jsonResponse, ['key','value']);
            jsonResponse.key.should.eql('title');
            done();
        });
    });

    it('can\'t retrieve non existent setting', function (done) {
        request.get(testUtils.API.getApiURL('settings/testsetting/'), function (error, response, body) {
            response.should.have.status(404);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;
            testUtils.API.checkResponse (jsonResponse, ['error']);
            done();
        });
    });

    it('can edit settings', function (done) {
        request.get(testUtils.API.getApiURL('settings'), function (error, response, body) {
            var jsonResponse = JSON.parse(body),
                changedValue = 'Ghost changed';
            jsonResponse.should.exist;
            jsonResponse.title = changedValue;

            request.put({uri: testUtils.API.getApiURL('settings/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse}, function (error, response, putBody) {
                response.should.have.status(200);
                response.should.be.json;
                putBody.should.exist;
                putBody.title.should.eql(changedValue);
                testUtils.API.checkResponse (putBody, expectedProperties);
                done();
            });
        });
    });

    it('can\'t edit non existent setting', function (done) {
        request.get(testUtils.API.getApiURL('settings'), function (error, response, body) {
            var jsonResponse = JSON.parse(body),
                newValue = 'new value';
            jsonResponse.should.exist;
            jsonResponse.testvalue = newValue;

            request.put({uri: testUtils.API.getApiURL('settings/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse}, function (error, response, putBody) {
                response.should.have.status(404);
                response.should.be.json;
                testUtils.API.checkResponse (putBody, ['error']);
                done();
            });
        });
    });
});
