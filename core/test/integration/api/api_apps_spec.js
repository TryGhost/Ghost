/*globals describe, before, beforeEach, afterEach, it */
var _             = require('lodash'),
    testUtils     = require('../../utils'),
    should        = require('should'),
    path          = require('path'),

    // Stuff we are testing
    config        = require('../../../server/config'),
    AppAPI        = require('../../../server/api/apps'),
    AppProxy      = require('../../../server/apps/proxy'),
    AppSandbox    = require('../../../server/apps/sandbox');

describe('App API', function () {

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'apps'));

    it('can browse', function (done) {
        AppAPI.browse(testUtils.context.owner).then(function (results) {
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
        var firstApp,
            appBox = new AppSandbox(),
            appPath = path.resolve(__dirname, '..', '..', 'utils', 'fixtures', 'app'),
            GoodApp,
            appProxy = new AppProxy({
                name: 'Kudos',
                permissions: {}
            }),
            app;

        config.set({paths: {appPath: appPath, contentPath: path.resolve(__dirname, '..', '..', 'utils', 'fixtures')}});
        // Install and load app
        GoodApp = appBox.loadApp(path.resolve(appPath, 'Kudos', 'index.js'));
        should.exist(GoodApp);
        app = new GoodApp(appProxy);
        app.install(appProxy);

        AppAPI.browse(testUtils.context.owner).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[1];
            return AppAPI.edit(_.extend({ apps: [{id: firstApp.id, status: 'active'}] }, {id: firstApp.id}), testUtils.context.owner);
        }).then(function (result) {
            console.log(result);
            should.exist(result);
            testUtils.API.checkResponse(result.apps[0], 'app');
            result.apps[0].status.should.equal('active');
            done();
        }).catch(function (error) {
            done(new Error(JSON.stringify(error)));
        });
    });

    it('can read, by id', function (done) {
        var firstApp;

        AppAPI.browse(testUtils.context.owner).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.read(_.extend({id: firstApp.id}, testUtils.context.owner));
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

        AppAPI.browse(testUtils.context.owner).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.read(_.extend({slug: firstApp.slug}, testUtils.context.owner));
        }).then(function (found) {
            should.exist(found);
            testUtils.API.checkResponse(found.apps[0], 'app');
            done();
        }).catch(done);
    });

    it('can destroy, by id', function (done) {
        var firstApp;

        AppAPI.browse(testUtils.context.owner).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.destroy(_.extend({id: firstApp.id}, testUtils.context.owner));
        }).then(function (deleted) {
            should.exist(deleted);
            testUtils.API.checkResponse(deleted.apps[0], 'app');
            done();
        }).catch(done);
    });

    it('can destroy, by slug', function (done) {
        var firstApp;

        AppAPI.browse(testUtils.context.owner).then(function (results) {
            should.exist(results);
            should.exist(results.apps);
            results.apps.length.should.be.above(0);
            firstApp = results.apps[0];
            return AppAPI.destroy(_.extend({slug: firstApp.slug}, testUtils.context.owner));
        }).then(function (deleted) {
            should.exist(deleted);
            testUtils.API.checkResponse(deleted.apps[0], 'app');
            done();
        }).catch(done);
    });
});