/*globals describe, before, beforeEach, afterEach, it */
var _             = require('lodash'),
    testUtils     = require('../../utils'),
    rewire        = require('rewire'),
    should        = require('should'),
    sinon         = require('sinon'),
    when          = require('when'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    SettingsAPI      = require('../../../server/api/settings'),
    ThemeAPI      = rewire('../../../server/api/themes');

describe('Themes API', function () {
    var configStub,
        sandbox,
        settingsReadStub;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return SettingsAPI.updateSettingsCache();
        }).then(function () {

            return permissions.init();
        }).then(function () {
            sandbox = sinon.sandbox.create();

            // Override settings.read for activeTheme
            settingsReadStub = sandbox.stub(SettingsAPI, 'read', function () {
                return when({ settings: [{value: 'casper'}] });
            });

            configStub = sandbox.stub().returns({
                'paths': {
                    'subdir': '',
                    'availableThemes': {
                        'casper': {
                            'package.json': { name: 'Casper', version: '0.9.3' }
                        },
                        'rasper': {
                            'package.json': { name: 'Rasper', version: '0.9.6' }
                        }
                    }
                }
            });

            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            sandbox.restore();
            done();
        }, done);
    });

    it('can browse', function (done) {
        var config;

        config = ThemeAPI.__get__('config');
        _.extend(configStub, config);
        ThemeAPI.__set__('config', configStub);

        ThemeAPI.browse({context: {user: 1}}).then(function (result) {
            should.exist(result);
            result.themes.length.should.be.above(0);
            testUtils.API.checkResponse(result.themes[0], 'theme');
            done();
        }).catch(function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can edit', function (done) {
        var config;

        config = ThemeAPI.__get__('config');
        _.extend(configStub, config);
        ThemeAPI.__set__('config', configStub);

        ThemeAPI.edit({themes: [{uuid: 'rasper', active: true }]}, {context: {user: 1}}).then(function (result) {
            should.exist(result);
            should.exist(result.themes);
            result.themes.length.should.be.above(0);
            testUtils.API.checkResponse(result.themes[0], 'theme');
            result.themes[0].uuid.should.equal('rasper');
            done();
        }).catch(function (error) {
            done(new Error(JSON.stringify(error)));
        });
    })
});