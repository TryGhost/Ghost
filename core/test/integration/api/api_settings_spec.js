/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),
    _         = require('lodash'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    DataGenerator    = require('../../utils/fixtures/data-generator'),
    SettingsAPI      = require('../../../server/api/settings');

describe('Settings API', function () {

    var defaultContext = {
            user: 1
        },
        internalContext = {
            internal: true
        },
        callApiWithContext = function (context, method) {
            return SettingsAPI[method].apply(context, _.toArray(arguments).slice(2));
        },
        getErrorDetails = function (done) {
            return function (err) {
                if (err instanceof Error) {
                    return done(err);
                }

                done(new Error(err.message));
            };
        };

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                return SettingsAPI.updateSettingsCache();
            })
            .then(function () {
                return permissions.init();
            })
            .then(function () {
                done();
            }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(getErrorDetails(done));
    });

    it('can browse', function (done) {
        return callApiWithContext(defaultContext, 'browse', 'blog').then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            // Check for a core setting
            should.not.exist(_.find(results.settings, function (setting) { return setting.type === 'core'; }));

            done();
        }).catch(getErrorDetails(done));
    });

    it('returns core settings for internal requests when browsing', function (done){
        return callApiWithContext(internalContext, 'browse', 'blog').then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            // Check for a core setting
            should.exist(_.find(results.settings, function (setting) { return setting.type === 'core'; }));

            done();
        }).catch(getErrorDetails(done)); 
    });

    it('can read by string', function (done) {
        return callApiWithContext(defaultContext, 'read', 'title').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(getErrorDetails(done));
    });

    it('cannot read core settings if not an internal request', function (done) {
        return callApiWithContext(defaultContext, 'read', 'databaseVersion').then(function (response) {
            done(new Error('Allowed to read databaseVersion with external request'));
        }).catch(function (err) {
            should.exist(err);

            err.message.should.equal('Attempted to access core setting on external request');

            done();
        });
    });

    it('can read core settings if an internal request', function (done) {
        return callApiWithContext(internalContext, 'read', 'databaseVersion').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(getErrorDetails(done));
    });

    it('can read by object key', function (done) {
        return callApiWithContext(defaultContext, 'read', { key: 'title' }).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(getErrorDetails(done));
    });

    it('can edit', function (done) {
        return callApiWithContext(defaultContext, 'edit', { settings: [{ key: 'title', value: 'UpdatedGhost'}]}).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(done);
    });

    it('can edit, by key/value', function (done) {
        return callApiWithContext(defaultContext, 'edit', 'title', 'UpdatedGhost').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(getErrorDetails(done));
    });

    it('cannot edit a core setting if not an internal request', function (done) {
        return callApiWithContext(defaultContext, 'edit', 'databaseVersion', '999').then(function (response) {
            done(new Error('Allowed to edit a core setting as external request'));
        }).catch(function (err) {
            should.exist(err);

            err.message.should.equal('Attempted to access core setting on external request');

            done();
        });
    });

    it('ensures values are stringified before saving to database', function (done) {
        return callApiWithContext(defaultContext, 'edit', 'title', []).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');
            response.settings[0].value.should.equal('[]');

            done();
        }).catch(done);
    });
});
