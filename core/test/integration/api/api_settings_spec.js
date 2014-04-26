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
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can browse', function (done) {
        SettingsAPI.updateSettingsCache().then(function () {
            SettingsAPI.browse('blog').then(function (results) {
                should.exist(results);
                testUtils.API.checkResponse(results, 'settings');
                done();
            });
        });
    });
});