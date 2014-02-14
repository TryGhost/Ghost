/*globals describe, before, after, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require('lodash'),
    request = require('request');

describe('Unauthorized', function () {

    it('can\'t retrieve posts', function (done) {
        request.get(testUtils.API.getApiURL('posts/'), function (error, response, body) {
            response.should.have.status(401);
            should.not.exist(response.headers['x-cache-invalidate']);
            response.should.be.json;
            var jsonResponse = JSON.parse(body);
            jsonResponse.should.exist;
			testUtils.API.checkResponseValue(jsonResponse, ['error']);
            done();
        });
    });
});