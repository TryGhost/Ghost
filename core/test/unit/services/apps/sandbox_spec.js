var should = require('should'),
    sinon = require('sinon'),
    path = require('path'),

    // Stuff we are testing
    AppProxy = require('../../../../server/services/apps/proxy'),
    AppSandbox = require('../../../../server/services/apps/sandbox'),

    sandbox = sinon.sandbox.create();

describe('Apps', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Sandbox', function () {
        function makeAppPath(fileName) {
            return path.resolve(__dirname, '..', '..', '..', 'utils', 'fixtures', 'app', fileName);
        }

        it('loads apps in a sandbox', function () {
            var appBox = new AppSandbox(),
                appPath = makeAppPath('good.js'),
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
                badAppPath = makeAppPath('badtop.js'),
                loadApp = function () {
                    appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require blacklisted modules at install', function () {
            var appBox = new AppSandbox(),
                badAppPath = makeAppPath('badinstall.js'),
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
                badAppPath = makeAppPath('badrequire.js'),
                BadApp,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw('Unsafe App require: knex');
        });

        it('does not allow apps to require modules relatively outside their directory', function () {
            var appBox = new AppSandbox(),
                badAppPath = makeAppPath('badoutside.js'),
                BadApp,
                loadApp = function () {
                    BadApp = appBox.loadApp(badAppPath);
                };

            loadApp.should.throw(/^Unsafe App require[\w\W]*example$/);
        });

        it('does allow INTERNAL apps to require modules relatively outside their directory', function () {
            var appBox = new AppSandbox({internal: true}),
                badAppPath = makeAppPath('badoutside.js'),
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
