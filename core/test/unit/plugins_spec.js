/*globals describe, beforeEach, before, it*/
var _ = require("underscore"),
    when = require('when'),
    should = require('should'),
    sinon = require('sinon'),
    errors = require('../../server/errorHandling'),
    helpers = require('./helpers'),
    plugins = require('../../server/plugins'),
    GhostPlugin = plugins.GhostPlugin,
    loader = require('../../server/plugins/loader');

describe('Plugins', function () {

    before(function (done) {
        helpers.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        helpers.initData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        helpers.clearData().then(function () {
            done();
        }, done);
    });

    describe('GhostPlugin Class', function () {

        should.exist(GhostPlugin);

        it('sets app instance', function () {
            var fakeGhost = {fake: true},
                plugin = new GhostPlugin(fakeGhost);

            plugin.app.should.equal(fakeGhost);
        });

        it('has default install, uninstall, activate and deactivate methods', function () {
            var fakeGhost = {fake: true},
                plugin = new GhostPlugin(fakeGhost);

            _.isFunction(plugin.install).should.equal(true);
            _.isFunction(plugin.uninstall).should.equal(true);
            _.isFunction(plugin.activate).should.equal(true);
            _.isFunction(plugin.deactivate).should.equal(true);
        });
    });

    describe('loader', function () {

        // TODO: These depend heavily on the FancyFirstChar plugin being present.

        it('can load FancyFirstChar by name and unload', function (done) {
            var fancyPlugin = require("../../../content/plugins/FancyFirstChar"),
                fakeGhost = {
                    registerFilter: function () { return; },
                    unregisterFilter: function () { return; }
                },
                installMock = sinon.stub(fancyPlugin, "install"),
                uninstallMock = sinon.stub(fancyPlugin, "uninstall"),
                registerMock = sinon.stub(fakeGhost, "registerFilter"),
                unregisterMock = sinon.stub(fakeGhost, "unregisterFilter");

            loader.installPluginByName("FancyFirstChar", fakeGhost).then(function (loadedPlugin) {

                should.exist(loadedPlugin);

                installMock.called.should.equal(true);

                loadedPlugin.activate(fakeGhost);

                // Registers the filter
                registerMock.called.should.equal(true);

                loadedPlugin.deactivate(fakeGhost);

                // Unregisters the filter
                unregisterMock.called.should.equal(true);

                loadedPlugin.uninstall(fakeGhost);

                done();
            }, done);
        });
    });

    it("can initialize an array of plugins", function (done) {

        var fakeGhost = {
                registerFilter: function () { return; },
                unregisterFilter: function () { return; }
            },
            installSpy = sinon.spy(loader, "installPluginByName"),
            activateSpy = sinon.spy(loader, "activatePluginByName");

        plugins.init(fakeGhost, ["FancyFirstChar"]).then(function (loadedPlugins) {
            should.exist(loadedPlugins);
            should.exist(loadedPlugins["FancyFirstChar"]);

            installSpy.called.should.equal(true);
            activateSpy.called.should.equal(true);

            var api = require("../../server/api");

            return api.settings.read("installedPlugins").then(function (setting) {
                should.exist(setting);

                setting.value.should.equal('["FancyFirstChar"]');

                done();
            });
        }, done);
    });

});