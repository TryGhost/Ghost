/*globals describe, before, afterEach, it */
/*jshint expr:true*/
var testUtils         = require('../../utils'),
    should            = require('should'),

    rewire            = require('rewire'),
    _                 = require('lodash'),
    config            = rewire('../../../server/config'),

    // Stuff we are testing
    ConfigurationAPI  = rewire('../../../server/api/configuration');

describe('Configuration API', function () {
    var newConfig = {
        fileStorage: true,
        apps: true,
        version: '0.5.0',
        environment: process.env.NODE_ENV,
        database: {
            client: 'mysql'
        },
        mail: {
            transport: 'SMTP'
        },
        blogUrl: 'http://local.tryghost.org'
    };

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);

    should.exist(ConfigurationAPI);

    it('can browse config', function (done) {
        var updatedConfig = _.extend({}, config, newConfig);
        config.set(updatedConfig);
        ConfigurationAPI.__set__('config', updatedConfig);

        ConfigurationAPI.browse(testUtils.context.owner).then(function (response) {
            should.exist(response);
            should.exist(response.configuration);
            testUtils.API.checkResponse(response.configuration[0], 'configuration');
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            console.log(JSON.stringify(error));
            done();
        }).catch(done);
    });

    it('can read config', function (done) {
        var updatedConfig = _.extend({}, config, newConfig);
        config.set(updatedConfig);
        ConfigurationAPI.__set__('config', updatedConfig);

        ConfigurationAPI.read(_.extend({}, testUtils.context.owner, {key: 'database'})).then(function (response) {
            should.exist(response);
            should.exist(response.configuration);
            testUtils.API.checkResponse(response.configuration[0], 'configuration');
            response.configuration[0].key.should.equal('database');
            response.configuration[0].value.should.equal('mysql');
            /*jshint unused:false */
            done();
        }).catch(function (error) {
            console.log(JSON.stringify(error));
            done();
        }).catch(done);
    });
});
