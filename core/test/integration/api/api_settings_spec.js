var should = require('should'),
    testUtils = require('../../utils'),
    _ = require('lodash'),

    // Stuff we are testing
    SettingsAPI = require('../../../server/api/settings'),
    settingsCache = require('../../../server/settings/cache'),
    defaultContext = {user: 1},
    internalContext = {internal: true},
    callApiWithContext,
    getErrorDetails;

describe('Settings API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:setting', 'settings', 'perms:init'));

    should.exist(SettingsAPI);

    callApiWithContext = function (context, method) {
        var args = _.toArray(arguments),
            options = args[args.length - 1];

        if (_.isObject(options)) {
            options.context = _.clone(context);
        }

        return SettingsAPI[method].apply({}, args.slice(2));
    };
    getErrorDetails = function (err) {
        if (err instanceof Error) {
            throw err;
        }

        throw new Error(err.message);
    };

    it('uses Date objects for dateTime fields', function () {
        return callApiWithContext(defaultContext, 'browse', {}).then(function (results) {
            should.exist(results);
            results.settings[0].created_at.should.be.an.instanceof(Date);
        }).catch(getErrorDetails);
    });

    it('can browse', function () {
        return callApiWithContext(defaultContext, 'browse', {}).then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            // Check for a core setting
            should.not.exist(_.find(results.settings, function (setting) {
                return setting.type === 'core';
            }));
        }).catch(getErrorDetails);
    });

    it('can browse by type', function () {
        return callApiWithContext(defaultContext, 'browse', {type: 'blog'}).then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            // Check for a core setting
            should.not.exist(_.find(results.settings, function (setting) {
                return setting.type === 'core';
            }));
        }).catch(getErrorDetails);
    });

    it('returns core settings for internal requests when browsing', function () {
        return callApiWithContext(internalContext, 'browse', {}).then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            // Check for a core setting
            should.exist(_.find(results.settings, function (setting) {
                return setting.type === 'core';
            }));
        }).catch(getErrorDetails);
    });

    it('can read blog settings by string', function () {
        return SettingsAPI.read('title').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');
        }).catch(getErrorDetails);
    });

    it('cannot read core settings if not an internal request', function () {
        return callApiWithContext(defaultContext, 'read', {key: 'db_hash'}).then(function () {
            throw new Error('Allowed to read db_hash with external request');
        }).catch(function (error) {
            should.exist(error);
            error.errorType.should.eql('NoPermissionError');
        });
    });

    it('can read core settings if an internal request', function () {
        return callApiWithContext(internalContext, 'read', {key: 'db_hash'}).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');
        }).catch(getErrorDetails);
    });

    it('can read by object key', function () {
        return callApiWithContext(defaultContext, 'read', {key: 'title'}).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');
        }).catch(getErrorDetails);
    });

    it('can edit', function () {
        // see default-settings.json
        settingsCache.get('title').should.eql('Ghost');

        return callApiWithContext(defaultContext, 'edit', {settings: [{key: 'title', value: 'UpdatedGhost'}]}, {})
            .then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'settings');
                response.settings.length.should.equal(1);
                testUtils.API.checkResponse(response.settings[0], 'setting');

                settingsCache.get('title').should.eql('UpdatedGhost');
            });
    });

    it('cannot edit a core setting if not an internal request', function () {
        return callApiWithContext(defaultContext, 'edit', {settings: [{key: 'db_hash', value: 'hash'}]}, {})
            .then(function () {
                throw new Error('Allowed to edit a core setting as external request');
            }).catch(function (err) {
                should.exist(err);

                err.errorType.should.eql('NoPermissionError');
            });
    });

    it('can edit a core setting with an internal request', function () {
        return callApiWithContext(internalContext, 'edit', {settings: [{key: 'db_hash', value: 'hash'}]}, {})
            .then(function (response) {
                should.exist(response);
                testUtils.API.checkResponse(response, 'settings');
                response.settings.length.should.equal(1);
                testUtils.API.checkResponse(response.settings[0], 'setting');
            });
    });

    it('cannot edit the active theme setting via API even with internal context', function () {
        return callApiWithContext(internalContext, 'edit', 'active_theme', {
            settings: [{key: 'active_theme', value: 'rasper'}]
        }).then(function () {
            throw new Error('Allowed to change active theme settting');
        }).catch(function (err) {
            should.exist(err);

            err.errorType.should.eql('BadRequestError');
            err.message.should.eql('Attempted to change active_theme via settings API');
        });
    });

    it('ensures values are stringified before saving to database', function () {
        return callApiWithContext(defaultContext, 'edit', 'title', []).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');
            response.settings[0].value.should.equal('[]');
        });
    });

    it('set active_timezone: unknown timezone', function () {
        return callApiWithContext(defaultContext, 'edit', {settings: [{key: 'active_timezone', value: 'MFG'}]}, {})
            .then(function () {
                throw new Error('We expect that the active_timezone cannot be stored');
            }).catch(function (errors) {
                should.exist(errors);
                errors.length.should.eql(1);
                errors[0].errorType.should.eql('ValidationError');
            });
    });

    it('set active_timezone: known timezone', function () {
        return callApiWithContext(defaultContext, 'edit', {settings: [{key: 'active_timezone', value: 'Etc/UTC'}]}, {});
    });
});
