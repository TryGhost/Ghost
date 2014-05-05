/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator    = require('../../utils/fixtures/data-generator'),
    SettingsAPI      = require('../../../server/api/settings');

describe('Settings API', function () {

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
                done();
            }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can browse', function (done) {
        return SettingsAPI.browse('blog').then(function (results) {
            should.exist(results);
            testUtils.API.checkResponse(results, 'settings');
            results.settings.length.should.be.above(0);
            testUtils.API.checkResponse(results.settings[0], 'setting');

            done();
        }).catch(done);
    });

    it('can read by string', function (done) {
        return SettingsAPI.read('title').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(done);
    });

    it('can read by object key', function (done) {
        return SettingsAPI.read({ key: 'title' }).then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(done);
    });

    it('can edit', function (done) {
        return SettingsAPI.edit('title', 'UpdatedGhost').then(function (response) {
            should.exist(response);
            testUtils.API.checkResponse(response, 'settings');
            response.settings.length.should.equal(1);
            testUtils.API.checkResponse(response.settings[0], 'setting');

            done();
        }).catch(done);
    });
});