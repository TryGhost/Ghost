/*globals describe, it*/
var should          = require('should'),
    http            = require('http'),
    config          = require(__dirname + '/../../server/config');

describe('Server', function () {
    it('should not start a connect server when required', function (done) {
        http.get(config.url, function () {
            done('This request should not have worked');
        }).on('error', function (error) {
            should(error).not.equal(undefined);
            should(error.code).equal('ECONNREFUSED');
            done();
        });
    });
});
