/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request'),
    expectedProperties = ['id', 'uuid', 'name', 'slug', 'description', 'parent_id',
        'meta_title', 'meta_description', 'created_at', 'created_by', 'updated_at', 'updated_by'];

request = request.defaults({jar:true})

describe('Tag API', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                done();
            }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        testUtils.initData()
            .then(function () {
                testUtils.insertDefaultFixtures();
            })
            .then(function () {
                // do a get request to get the CSRF token first
                request.get(testUtils.API.getSigninURL(), function (error, response, body) {
                    var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                    pattern_meta.should.exist;
                    csrfToken = body.match(pattern_meta)[1];
                    request.post({uri:testUtils.API.getSigninURL(),
                            headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                        done();
                    }).form({email: user.email, password: user.password});
                });
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can retrieve all tags', function (done) {
        request.get(testUtils.API.getApiURL('tags/'), function (error, response, body) {
            response.should.have.status(200);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;
            jsonResponse.should.have.length(5);
            testUtils.API.checkResponse (jsonResponse[0], expectedProperties);
            done();
        });
    });
});
