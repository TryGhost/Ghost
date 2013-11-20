/*globals describe, beforeEach, it*/
var net             = require('net'),
    assert          = require('assert'),
    should          = require('should'),
    request         = require('request'),
    server          = require('../../server'),
    Ghost           = require('../../ghost'),
    config          = require('../../../config'),

    ghost           = new Ghost();

describe('Server', function () {
    var port = config['development'].server.port,
        host = config['development'].server.host,
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

