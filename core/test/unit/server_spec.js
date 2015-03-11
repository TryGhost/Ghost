/*globals describe, it*/
/*jshint expr:true*/
var should          = require('should'),
    request         = require('request'),
    config          = require('../../../config');

describe('Server', function () {
    var port = config.testing.server.port,
        host = config.testing.server.host,
        url = 'http://' + host + ':' + port;

    it('should not start a connect server when required', function (done) {
        request(url, function (error, response, body) {
            should(response).equal(undefined);
            should(body).equal(undefined);
            should(error).not.equal(undefined);
            should(error.code).equal('ECONNREFUSED');
            done();
        });
    });
});
