/*globals describe, it*/
var should          = require('should'),
    http            = require('http'),
    config          = require('../../../config');

describe('Server', function () {
    var port = config.testing.server.port,
        host = config.testing.server.host,
        url = 'http://' + host + ':' + port;

    it('should not start a connect server when required', function (done) {
        http.get(url, function () {
            done('This request should not have worked');
        }).on('error', function (error) {
            should(error).not.equal(undefined);
            should(error.code).equal('ECONNREFUSED');

            done();
        });
    });
});
