/*globals describe, beforeEach, afterEach, it*/
var path         = require('path'),
    should       = require('should'),
    sinon        = require('sinon'),
    i18n         = require('../../../server/i18n'),

    // Stuff we are testing
    AppProxy        = require('../../../server/apps/proxy'),
    AppSandbox      = require('../../../server/apps/sandbox');

i18n.init();

describe('Apps: Sandbox', function () {
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

    describe('Sandbox', function () {
        it('loads apps in a sandbox', function () {
            var appBox = new AppSandbox(),
                appPath = path.resolve(__dirname, '../..', 'utils', 'fixtures', 'app', 'good.js'),
                GoodApp,
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {}
                }),
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
                badAppPath = path.join(__dirname, '../..', 'utils', 'fixtures', 'app', 'badtop.js'),
                loadApp = function () {
                    appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require blacklisted modules at install', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '../..', 'utils', 'fixtures', 'app', 'badinstall.js'),
                BadApp,
                appProxy = new AppProxy({
                    name: 'TestApp',
                    permissions: {}
                }),
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
                badAppPath = path.join(__dirname, '../..', 'utils', 'fixtures', 'app', 'badrequire.js'),
                BadApp,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require modules relatively outside their directory', function () {
            var appBox = new AppSandbox(),
                badAppPath = path.join(__dirname, '../..', 'utils', 'fixtures', 'app', 'badoutside.js'),
                BadApp,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw(/^Unsafe App require[\w\W]*example$/);
        });

        it('does allow INTERNAL apps to require modules relatively outside their directory', function () {
            var appBox = new AppSandbox({internal: true}),
                badAppPath = path.join(__dirname, '../..', 'utils', 'fixtures', 'app', 'badoutside.js'),
                InternalApp,
                loadApp = function () {
                    InternalApp = appBox.loadApp(badAppPath);
                };

            InternalApp = appBox.loadApp(badAppPath);

            loadApp.should.not.throw(/^Unsafe App require[\w\W]*example$/);

            InternalApp.should.be.a.Function();
        });
    });
});
