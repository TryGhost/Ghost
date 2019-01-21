const should = require('should'),
    sinon = require('sinon'),
    path = require('path'),
    AppSandbox = require('../../../../server/services/apps/sandbox');

describe('Apps', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('sinon', function () {
        function makeAppPath(fileName) {
            return path.resolve(__dirname, '..', '..', '..', 'utils', 'fixtures', 'app', fileName);
        }

        it('loads apps in a sinon', function () {
            var appBox = new AppSandbox(),
                appPath = makeAppPath('good.js'),
                GoodApp,
                appProxy = sinon.stub(),
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
                appProxy = sinon.stub(),
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
