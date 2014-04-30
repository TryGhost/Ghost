/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    permissions   = require('../../../server/permissions'),
    DataGenerator = require('../../utils/fixtures/data-generator'),
    AppAPI        = require('../../../server/api/apps');

describe('App API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData().then(function () {
            return testUtils.insertDefaultFixtures();
        }).then(function () {
            return permissions.init();
        }).then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    it('can browse', function (done) {
        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            testUtils.API.checkResponse(results, 'apps');
            results.apps.length.should.be.above(0);
            testUtils.API.checkResponse(results.apps[0], 'app');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can edit', function (done) {
        var firstApp;

        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[1];
            return AppAPI.edit.call({user: 1}, { apps: [{id: firstApp.id, status: 'active'}] }, {id: firstApp.id});
        }).then(function (result) {
            should.exist(result);
            testUtils.API.checkResponse(result.apps[0], 'app');
            result.apps[0].status.should.equal('active');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can read, by id', function (done) {
        var firstApp;

        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.read.call({user: 1}, {id: firstApp.id});
        }).then(function (found) {
            should.exist(found);
            testUtils.API.checkResponse(found.apps[0], 'app');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can read, by slug', function (done) {
        var firstApp;

        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.read.call({user: 1}, {slug: firstApp.slug});
        }).then(function (found) {
            should.exist(found);
            testUtils.API.checkResponse(found.apps[0], 'app');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can destroy, by id', function (done) {
        var firstApp;

        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.destroy.call({user: 1}, {id: firstApp.id});
        }).then(function (deleted) {
            should.exist(deleted);
            testUtils.API.checkResponse(deleted.apps[0], 'app');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can destroy, by slug', function (done) {
        var firstApp;

        AppAPI.browse.call({user: 1}).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.destroy.call({user: 1}, {slug: firstApp.slug});
        }).then(function (deleted) {
            should.exist(deleted);
            testUtils.API.checkResponse(deleted.apps[0], 'app');
            done();
        }, function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });
});