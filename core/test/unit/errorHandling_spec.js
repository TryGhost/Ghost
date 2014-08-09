/*globals describe, after, before, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should     = require('should'),
    when       = require('when'),
    sinon      = require('sinon'),
    express    = require('express'),
    rewire     = require('rewire'),

    // Stuff we are testing

    colors     = require('colors'),
    errors     = rewire('../../server/errors'),
    // storing current environment
    currentEnv = process.env.NODE_ENV;

// This is not useful but required for jshint
colors.setTheme({silly: 'rainbow'});

describe('Error handling', function () {

    // Just getting rid of jslint unused error
    should.exist(errors);

    describe('Throwing', function () {
        it('throws error objects', function () {
            var toThrow = new Error('test1'),
                runThrowError = function () {
                    errors.throwError(toThrow);
                };

            runThrowError.should['throw']('test1');
        });

        it('throws error strings', function () {
            var toThrow = 'test2',
                runThrowError = function () {
                    errors.throwError(toThrow);
                };

            runThrowError.should['throw']('test2');
        });

        it('throws error even if nothing passed', function () {
            var runThrowError = function () {
                errors.throwError();
            };

            runThrowError.should['throw']('An error occurred');
        });
    });

    describe('Logging', function () {
        var logStub;

        beforeEach(function () {
            logStub = sinon.stub(console, 'error');
            // give environment a value that will console log
            process.env.NODE_ENV = 'development';
        });

        afterEach(function () {
            logStub.restore();
            // reset the environment
            process.env.NODE_ENV = currentEnv;
        });

        it('logs errors from error objects', function () {
            var err = new Error('test1');

            errors.logError(err);

            // Calls log with message on Error objects
            logStub.calledOnce.should.be.true;
            logStub.calledWith('\nERROR:'.red,  err.message.red, '\n', '\n', err.stack, '\n').should.be.true;
        });

        it('logs errors from strings', function () {
            var err = 'test2';

            errors.logError(err);

            // Calls log with string on strings
            logStub.calledOnce.should.be.true;
            logStub.calledWith('\nERROR:'.red, err.red, '\n').should.be.true;
        });

        it('logs errors from an error object and two string arguments', function () {
            var err = new Error('test1'),
                message = 'Testing';

            errors.logError(err, message, message);

            // Calls log with message on Error objects
            logStub.calledOnce.should.be.true;
            logStub.calledWith(
                '\nERROR:'.red, err.message.red, '\n', message.white, '\n', message.green, '\n', err.stack, '\n'
            );
        });

        it('logs errors from three string arguments', function () {
            var message = 'Testing';

            errors.logError(message, message, message);

            // Calls log with message on Error objects
            logStub.calledOnce.should.be.true;
            logStub.calledWith(
                '\nERROR:'.red, message.red, '\n', message.white, '\n', message.green, '\n'
            ).should.be.true;
        });

        it('logs errors from an undefined error argument', function () {
            var message = 'Testing';

            errors.logError(undefined, message, message);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.calledWith(
                '\nERROR:'.red, 'An unknown error occurred.'.red, '\n', message.white, '\n', message.green , '\n'
            ).should.be.true;
        });

        it('logs errors from an undefined context argument', function () {
            var message = 'Testing';

            errors.logError(message, undefined, message);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.calledWith('\nERROR:'.red, message.red, '\n', message.green, '\n').should.be.true;
        });

        it('logs errors from an undefined help argument', function () {
            var message = 'Testing';

            errors.logError(message, message, undefined);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.calledWith('\nERROR:'.red, message.red, '\n', message.white, '\n').should.be.true;
        });

        it('logs errors from a null error argument', function () {
            var message = 'Testing';

            errors.logError(null, message, message);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.calledWith(
                '\nERROR:'.red, 'An unknown error occurred.'.red, '\n', message.white, '\n', message.green, '\n'
            ).should.be.true;
        });

        it('logs errors from a null context argument', function () {
            var message = 'Testing';

            errors.logError(message, null, message);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.firstCall.calledWith('\nERROR:'.red, message.red, '\n', message.green, '\n').should.be.true;
        });

        it('logs errors from a null help argument', function () {
            var message = 'Testing';

            errors.logError(message, message, null);

            // Calls log with message on Error objects

            logStub.calledOnce.should.be.true;
            logStub.firstCall.calledWith('\nERROR:'.red, message.red, '\n', message.white, '\n').should.be.true;

        });

        it('logs promise errors and redirects', function (done) {
            var def = when.defer(),
                prom = def.promise,
                req = null,
                res = {
                    redirect: function () {
                        return;
                    }
                },
                redirectStub = sinon.stub(res, 'redirect');

            // give environment a value that will console log
            prom.then(function () {
                throw new Error('Ran success handler');
            }, errors.logErrorWithRedirect('test1', null, null, '/testurl', req, res));

            prom.otherwise(function () {
                logStub.calledWith('\nERROR:'.red, 'test1'.red).should.equal(true);
                logStub.restore();

                redirectStub.calledWith('/testurl').should.equal(true);
                redirectStub.restore();

                done();
            });
            def.reject();
        });
    });

    describe('Rendering', function () {
        var sandbox,
            originalConfig;

        before(function () {
            originalConfig = errors.__get__('config');
            errors.__set__('config', {
                'paths': {
                    'themePath': '/content/themes',
                    'availableThemes': {
                        'casper': {
                            'assets': null,
                            'default.hbs': '/content/themes/casper/default.hbs',
                            'index.hbs': '/content/themes/casper/index.hbs',
                            'page.hbs': '/content/themes/casper/page.hbs',
                            'tag.hbs': '/content/themes/casper/tag.hbs'
                        },
                        'theme-with-error': {
                            'error.hbs': ''
                        }
                    }
                }
            });
            errors.updateActiveTheme('casper');
        });

        beforeEach(function () {
            sandbox = sinon.sandbox.create();
        });

        afterEach(function () {
            sandbox.restore();
        });

        after(function () {
            errors.__set__('config', originalConfig);
        });

        it('Renders end-of-middleware 404 errors correctly', function (done) {
            var req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                /*jshint unused:false */
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('Page Not Found');
                options.code.should.equal(404);
                this.statusCode.should.equal(404);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal(
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                );

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            errors.error404(req, res, done);
        });

        it('Renders thrown 404 errors correctly', function (done) {
            var err = new Error('A thing was not found'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                /*jshint unused:false */
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('Page Not Found');
                options.code.should.equal(404);
                this.statusCode.should.equal(404);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal(
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                );

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });


            err.status = 404;
            errors.error500(err, req, res, null);
        });

        it('Renders thrown errors correctly', function (done) {
            var err = new Error('I am a big bad error'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                /*jshint unused:false */
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('I am a big bad error');
                options.code.should.equal(500);
                this.statusCode.should.equal(500);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal(
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                );

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            errors.error500(err, req, res, null);
        });

        it('Renders 500 errors correctly', function (done) {
            var err = new Error('I am a big bad error'),
                req = {method: 'GET'},
                res = express.response;

            sandbox.stub(express.response, 'render', function (view, options, fn) {
                /*jshint unused:false */
                view.should.match(/user-error\.hbs/);

                // Test that the message is correct
                options.message.should.equal('I am a big bad error');
                options.code.should.equal(500);
                this.statusCode.should.equal(500);

                // Test that the headers are correct
                this._headers['cache-control'].should.equal(
                    'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
                );

                done();
            });

            sandbox.stub(express.response, 'status', function (status) {
                res.statusCode = status;
                return res;
            });

            err.code = 500;
            errors.error500(err, req, res, null);
        });

        it('Renders custom error template if one exists', function(done){
            var code = 404,
                error = {message:'Custom view test'},
                req = {
                    session: null
                },
                res = {
                    status: function(code) {
                        /*jshint unused:false*/
                        return this;
                    },
                    render: function(view, model, fn){
                        /*jshint unused:false*/
                        view.should.eql('error');
                        errors.updateActiveTheme('casper');
                        done();
                    }
                },
                next = null;
            errors.updateActiveTheme('theme-with-error');
            errors.renderErrorPage(code, error, req, res, next);
        });
    });
});
