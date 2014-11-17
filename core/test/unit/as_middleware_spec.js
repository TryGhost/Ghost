/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var Promise         = require('bluebird'),
    should          = require('should'),                           // jshint ignore:line
    sinon           = require('sinon'),
    _               = require('lodash'),
    rewire          = require('rewire'),
    GhostServer     = require('../../server/ghost-server'),

    // Thing we are testing
    middleware      = rewire('../../../as-middleware');

describe('Express middleware module', function () {
    var defaultConfig = {database: {client: 'sqlite3'}};

    function cleanOutConfigManager() {
        var middlewaresConfig = middleware.__get__('config');
        _(_.keys(middlewaresConfig._config)).each(function (key) {
            delete middlewaresConfig[key];
        });
        middlewaresConfig._config = {};
    }

    function shouldBeAnInstanceOfExpress(express) {
        // first-order duck typing for an express server
        express.should.be.a.function;
        express.length.should.equal(3, 'a real express server function has an arity of 3');
        express.request.should.be.an.object;
        express.response.should.be.an.object;
    }

    // alternatively we could stub server/index#setupFromConfigPromise or there-abouts, but
    //   for just two tests, the performance gain doesn't seem worth the loss of coverage
    function waitForTheConfigurationPromiseToResolve(middlewareInstance, done) {
        var promise = middlewareInstance.ghostPromise;
        promise.then(function () {
            done();
        }).catch(function (error) {
            error.should.equal('In this test, the promise should never be rejected.');
        });
    }

    beforeEach(function () {
        cleanOutConfigManager();
    });

    it('returns an Express server instance when called', function (done) {
        var middlewareInstance = middleware(defaultConfig);
        shouldBeAnInstanceOfExpress(middlewareInstance);

        waitForTheConfigurationPromiseToResolve(middlewareInstance, done);
    });

    it('extends the middleware instance to provide access to Ghost\'s initialization promise', function (done) {
        var middlewareInstance = middleware(defaultConfig);
        middlewareInstance.ghostPromise.should.be.an.instanceOf(Promise);

        waitForTheConfigurationPromiseToResolve(middlewareInstance, done);
    });

    it('asynchronously initializes the middleware', function (done) {
        var ghostInitializationPromise = middleware(defaultConfig).ghostPromise;
        ghostInitializationPromise.then(function (ghostServerInstance) {
            ghostServerInstance.should.be.an.instanceOf(GhostServer);
            done();
        }).catch(function (error) {
            error.should.be.null;
        });
    });

    it('it includes the "asMiddleware" flag in the configuration loaded', function (done) {
        var middlewareInstance = middleware(defaultConfig);
        middleware.__get__('config').asMiddleware.should.be.true;

        waitForTheConfigurationPromiseToResolve(middlewareInstance, done);
    });

    it('fails if it is given a bad configuration', function () {
        function createMiddlewareWithBadConfiguration() {
            return middleware({});
        }

        createMiddlewareWithBadConfiguration.should.throw('invalid database configuration');
    });

    describe('startup timing', function () {
        afterEach(function () {
            middleware = rewire('../../../as-middleware');
        });

        function makeWebRequest(expressInstance, done) {
            expressInstance(
                {path: '/', url: '/', params: {}, route: {}},
                {
                    locals: {}, render: done, redirect: done,
                    setHeader: function () {}
                },
                done
            );
        }

        it('handles web requests after startup (simple test)', function (done) {
            var expressInstance = middleware(defaultConfig),
                ghostInitializationPromise = expressInstance.ghostPromise;

            makeWebRequest(expressInstance, function () {
                ghostInitializationPromise.isResolved().should.be.true;
                done();
            });
        });

        describe('performs initialization and request handling', function () {
            var sandbox;

            beforeEach(function () {
                sandbox = sinon.sandbox.create();
            });

            afterEach(function () {
                sandbox.restore();
            });

            it('in exactly the right order', function (done) {
                var ghostInstance,
                    ghostInitializationPromise,
                    serverConfigPromise,
                    serverConfigResolver,
                    mockServer,

                    expectedMountpath = '/a/mount/path',
                    expectedExpressParent = function () {},

                // build a log of the order in which events actually occurred
                    sequenceOfOperations = [];

                // set stubs and spies to log events occurring within Ghost
                //   (ones that go into Ghost's dependencies)
                mockServer = function (req, res, next) {
                    mockServer.mountpath.should.equal(expectedMountpath);
                    mockServer.parent.should.equal(expectedExpressParent);

                    sequenceOfOperations.push('handled request');
                    next();
                } ;
                serverConfigPromise = new Promise(function (fn) {
                    serverConfigResolver = fn;
                });
                middleware.__set__('logStartMessages', function () {
                    sequenceOfOperations.push('logged start message');
                });
                sandbox.stub(
                    middleware.__get__('config'),
                    'init',
                    function () { return serverConfigPromise; }
                );
                sandbox.stub(
                    middleware.__get__('ghost'),
                    'setupMiddleware',
                    function (configInfoPromise) {
                        var allDonePromise = configInfoPromise.then(function () { });
                        return [allDonePromise, mockServer];
                    }
                );

                // generate 'from outside of Ghost' activity in order for situation under test
                //   -- first, start Ghost initializing
                sequenceOfOperations.push('started initialization');
                ghostInstance = middleware(defaultConfig);
                ghostInstance.mountpath = expectedMountpath;
                ghostInstance.parent = expectedExpressParent;
                ghostInitializationPromise = ghostInstance.ghostPromise;

                // set stubs and spies to log events occurring within Ghost
                //   (ones attached the middleware instance itself)
                ghostInitializationPromise.then(function () {
                    sequenceOfOperations.push('finished initialization');
                });
                function assertionsAtEnd() {
                    // verify that Ghost did its bits at the right points in the sequence
                    sequenceOfOperations.should.eql([
                        'started initialization',
                        'made request',
                        'finished long-running initialization step',
                        'logged start message',
                        'finished initialization',
                        'handled request'
                    ]);
                    done();
                }

                //   -- next, simulate a request coming to us through the parent Express app
                sequenceOfOperations.push('made request');
                makeWebRequest(ghostInstance, assertionsAtEnd);

                //   -- then, allow Ghost's initialization process to complete
                sequenceOfOperations.push('finished long-running initialization step');
                serverConfigResolver();
            });
        });
    });
});
