var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),

    settingsCache = require('../../../../server/services/settings/cache'),
    api = require('../../../../server/api'),

    // Stuff we are testing
    AppLoader = require('../../../../server/services/apps/loader'),
    AppIndex = require('../../../../server/services/apps'),

    sandbox = sinon.sandbox.create();

describe('Apps', function () {
    var settingsCacheStub,
        settingsEditStub,
        loaderActivateStub,
        loaderInstallStub;

    beforeEach(function () {
        settingsCacheStub = sandbox.stub(settingsCache, 'get');
        settingsEditStub = sandbox.stub(api.settings, 'edit');
        loaderActivateStub = sandbox.stub(AppLoader, 'activateAppByName').callsFake(function (appName) {
            return new Promise.resolve(appName);
        });
        loaderInstallStub = sandbox.stub(AppLoader, 'installAppByName').callsFake(function (appName) {
            return new Promise.resolve(appName);
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('will activate, but not install, internal apps', function (done) {
        settingsCacheStub.withArgs('installed_apps').returns([]);
        settingsCacheStub.withArgs('active_apps').returns([]);

        AppIndex
            .init()
            .then(function () {
                var availableApps = Object.keys(AppIndex.availableApps);

                // This is all a bit weird... but check that internal apps aren't saved as installed apps
                // @TODO simplify so this is reduced
                settingsCacheStub.callCount.should.eql(3);
                settingsEditStub.callCount.should.eql(0);

                // Test that activate is called 4 times, and install 0 time
                loaderActivateStub.callCount.should.eql(3);
                loaderInstallStub.callCount.should.eql(0);

                // Test that the 4 internal apps are loaded as expected
                availableApps.should.be.an.Array().with.lengthOf(3);
                availableApps.should.containEql('amp');
                availableApps.should.containEql('private-blogging');
                availableApps.should.containEql('subscribers');

                done();
            })
            .catch(done);
    });

    it('will activate & install custom apps as needed', function (done) {
        settingsCacheStub.withArgs('installed_apps').returns(['testA']);
        settingsCacheStub.withArgs('active_apps').returns(['testA', 'testB']);

        AppIndex
            .init()
            .then(function () {
                var availableApps = Object.keys(AppIndex.availableApps);

                // This is all a bit weird... but check that internal apps aren't saved as installed apps
                // @TODO simplify so this is reduced
                settingsCacheStub.callCount.should.eql(3);
                settingsEditStub.callCount.should.eql(1);
                should.exist(settingsEditStub.firstCall.args[0].settings);
                should.exist(settingsEditStub.firstCall.args[0].settings[0]);
                settingsEditStub.firstCall.args[0].settings[0].key.should.eql('installed_apps');
                settingsEditStub.firstCall.args[0].settings[0].value.should.eql(['testA', 'testB']);

                // Test that activate is called 6 times, and install only 1 time
                loaderActivateStub.callCount.should.eql(5);
                loaderInstallStub.callCount.should.eql(1);

                // Test that the 4 internal apps are loaded as expected
                availableApps.should.be.an.Array().with.lengthOf(5);
                availableApps.should.containEql('amp');
                availableApps.should.containEql('private-blogging');
                availableApps.should.containEql('subscribers');
                availableApps.should.containEql('testA');
                availableApps.should.containEql('testB');

                done();
            })
            .catch(done);
    });
});
