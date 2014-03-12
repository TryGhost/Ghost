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
    loader = require('../../server/plugins/loader');

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
});