/*globals describe, beforeEach, it*/
var net             = require('net'),
    assert          = require('assert'),
    should          = require('should'),
    request         = require('request'),
    server          = require('../../server'),
    config          = require('../../../config');

describe('Server', function () {
    var port = config.testing.server.port,
        host = config.testing.server.host,
        url = 'http://' + host + ':' + port;


    it('should not start a connect server when required', function (done) {
        request(url, function (error, response, body) {
            assert.equal(response, undefined);
            assert.equal(body, undefined);
            assert.notEqual(error, undefined);
            assert.equal(error.code, 'ECONNREFUSED');
            done();
        });
    });

});

