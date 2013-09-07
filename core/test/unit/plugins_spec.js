/*globals describe, beforeEach, afterEach,  before, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    sinon = require('sinon'),
    _ = require("underscore"),
    when = require('when'),
    errors = require('../../server/errorHandling'),

    // Stuff we are testing
    plugins = require('../../server/plugins'),
    GhostPlugin = plugins.GhostPlugin,
    loader = require('../../server/plugins/loader'),
    FancyFirstChar = require('../../../content/plugins/FancyFirstChar');

describe('Plugins', function () {

    var sandbox;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
        sandbox = sinon.sandbox.create();

        testUtils.initData().then(function () {
            done();
        }, done);
    });

    afterEach(function (done) {
        sandbox.restore();

        testUtils.clearData().then(function () {
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
                registerFilter: sandbox.stub(),
                unregisterFilter: sandbox.stub()
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

    describe("FancyFirstChar", function () {

        it("has install and uninstall handlers", function () {
            should.exist(FancyFirstChar.install);
            should.exist(FancyFirstChar.uninstall);
        });

        it("activates and deactivates properly", function () {
            var fakeGhost = {
                    registerFilter: sandbox.stub(),
                    unregisterFilter: sandbox.stub()
                };

            FancyFirstChar.activate(fakeGhost);

            fakeGhost.registerFilter.called.should.equal(true);

            FancyFirstChar.deactivate(fakeGhost);

            fakeGhost.unregisterFilter.called.should.equal(true);
        });

        it("fancifies simple text", function () {
            var original = "Some text to fancify",
                expect = '<span class="fancyChar">S</span>ome text to fancify',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("fancifies in single tag", function () {
            var original = "<p>Some text to fancify</p>",
                expect = '<p><span class="fancyChar">S</span>ome text to fancify</p>',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("fancifies in nested tag", function () {
            var original = "<p><strong>Some text</strong> to fancify</p>",
                expect = '<p><strong><span class="fancyChar">S</span>ome text</strong> to fancify</p>',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("fancifies in nested nested tag", function () {
            var original = "<p><strong><em>Some</em> text</strong> to fancify</p>",
                expect = '<p><strong><em><span class="fancyChar">S</span>ome</em> text</strong> to fancify</p>',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("fancifies with tags before first text", function () {
            var original = "<div class='someSpecialDiv'><img src='/kitty.jpg' alt='Kitteh' title='Kitteh'></div><p><strong>Some text</strong> to fancify</p>",
                expect = "<div class='someSpecialDiv'><img src='/kitty.jpg' alt='Kitteh' title='Kitteh'></div><p><strong><span class=\"fancyChar\">S</span>ome text</strong> to fancify</p>",
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("does nothing if no text found", function () {
            var original = "<div class='someSpecialDiv'><img src='/kitty.jpg' alt='Kitteh' title='Kitteh'></div>",
                expect = "<div class='someSpecialDiv'><img src='/kitty.jpg' alt='Kitteh' title='Kitteh'></div>",
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("skips leading white space", function () {
            var original = "\n\t  <p>Some text to fancify</p>",
                expect = '\n\t  <p><span class="fancyChar">S</span>ome text to fancify</p>',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });

        it("skips white space in inner tags", function () {
            var original = "\n\t  <p>\n\t\t Some text to fancify</p>",
                expect = '\n\t  <p>\n\t\t <span class="fancyChar">S</span>ome text to fancify</p>',
                result;

            result = FancyFirstChar.fancify(original);

            result.should.equal(expect);
        });
    });

});