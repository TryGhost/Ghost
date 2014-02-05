/*globals describe, beforeEach, afterEach,  before, it*/
var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    sinon = require('sinon'),
    _ = require("underscore"),
    helpers = require('../../server/helpers'),
    filters = require('../../server/filters'),

    // Stuff we are testing
    appProxy = require('../../server/apps/proxy'),
    AppSandbox = require('../../server/apps/sandbox');

describe('Apps', function () {

    var sandbox,
        fakeApi;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();

        fakeApi = {
            posts: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                edit: sandbox.stub(),
                add: sandbox.stub(),
                destroy: sandbox.stub()
            },
            users: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                edit: sandbox.stub()
            },
            tags: {
                all: sandbox.stub()
            },
            notifications: {
                destroy: sandbox.stub(),
                add: sandbox.stub()
            },
            settings: {
                browse: sandbox.stub(),
                read: sandbox.stub(),
                add: sandbox.stub()
            }
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Proxy', function () {
        it('creates a ghost proxy', function () {
            should.exist(appProxy.filters);
            appProxy.filters.register.should.equal(filters.registerFilter);
            appProxy.filters.unregister.should.equal(filters.unregisterFilter);

            should.exist(appProxy.helpers);
            appProxy.helpers.register.should.equal(helpers.registerThemeHelper);
            appProxy.helpers.registerAsync.should.equal(helpers.registerAsyncThemeHelper);

            should.exist(appProxy.api);

            should.exist(appProxy.api.posts);
            should.not.exist(appProxy.api.posts.edit);
            should.not.exist(appProxy.api.posts.add);
            should.not.exist(appProxy.api.posts.destroy);

            should.not.exist(appProxy.api.users);

            should.exist(appProxy.api.tags);

            should.exist(appProxy.api.notifications);
            should.not.exist(appProxy.api.notifications.destroy);

            should.exist(appProxy.api.settings);
            should.not.exist(appProxy.api.settings.browse);
            should.not.exist(appProxy.api.settings.add);
        });
    });
    
    describe('Sandbox', function () {
        it('loads apps in a sandbox', function () {
            var appBox = new AppSandbox(),
                appPath = path.resolve(__dirname, '..', 'utils', 'fixtures', 'app', 'good.js'),
                GoodApp,
                app;

            GoodApp = appBox.loadApp(appPath);

            should.exist(GoodApp);

            app = new GoodApp(appProxy);

            app.install(appProxy);

            app.app.something.should.equal(42);
            app.app.util.util().should.equal(42);
            app.app.nested.other.should.equal(42);
            app.app.path.should.equal(appPath);
        });

        it('does not allow apps to require blacklisted modules at top level', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '..', 'utils', 'fixtures', 'app', 'badtop.js'),
                BadApp,
                app,
                loadApp = function () {
                    appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require blacklisted modules at install', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '..', 'utils', 'fixtures', 'app', 'badinstall.js'),
                BadApp,
                app,
                installApp = function () {
                    app.install(appProxy);
                };

            BadApp = appBox.loadApp(badAppPath);

            app = new BadApp(appProxy);

            installApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require blacklisted modules from other requires', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '..', 'utils', 'fixtures', 'app', 'badrequire.js'),
                BadApp,
                app,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require modules relatively outside their directory', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '..', 'utils', 'fixtures', 'app', 'badoutside.js'),
                BadApp,
                app,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: ../example');
        });
    });
});