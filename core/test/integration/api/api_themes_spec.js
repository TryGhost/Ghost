/*globals describe, before, beforeEach, afterEach, it */
var _             = require('lodash'),
    testUtils     = require('../../utils'),
    rewire        = require('rewire'),
    should        = require('should'),
    sinon         = require('sinon'),
    Promise       = require('bluebird'),

    // Stuff we are testing
    SettingsAPI   = require('../../../server/api/settings'),
    ThemeAPI      = rewire('../../../server/api/themes'),

    sandbox     = sinon.sandbox.create();

describe('Themes API', function () {
    var config,
        configStub;

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(testUtils.setup('users:roles', 'perms:theme', 'perms:init'));

    beforeEach(function () {
        // Override settings.read for activeTheme
        sandbox.stub(SettingsAPI, 'read', function () {
            return Promise.resolve({settings: [{value: 'casper'}]});
        });

        sandbox.stub(SettingsAPI, 'edit', function () {
            return Promise.resolve({settings: [{value: 'rasper'}]});
        });

        configStub = {
            paths: {
                subdir: '',
                availableThemes: {
                    casper: {
                        'package.json': {name: 'Casper', version: '0.9.3'}
                    },
                    rasper: {
                        'package.json': {name: 'Rasper', version: '0.9.6'}
                    }
                }
            }
        };

        config = ThemeAPI.__get__('config');
        _.extend(config, configStub);
    });

    should.exist(ThemeAPI);

    it('can browse', function (done) {
        ThemeAPI.browse(testUtils.context.owner).then(function (result) {
            should.exist(result);
            result.themes.length.should.be.above(0);
            testUtils.API.checkResponse(result.themes[0], 'theme');
            done();
        }).catch(function (error) {
            done(new Error(JSON.stringify(error)));
        }).catch(done);
    });

    it('can edit', function (done) {
        ThemeAPI.edit({themes: [{uuid: 'rasper', active: true}]}, testUtils.context.owner).then(function (result) {
            should.exist(result);
            should.exist(result.themes);
            result.themes.length.should.be.above(0);
            testUtils.API.checkResponse(result.themes[0], 'theme');
            result.themes[0].uuid.should.equal('rasper');
            done();
        }).catch(function (error) {
            done(new Error(JSON.stringify(error)));
        }).catch(done);
    });
});
