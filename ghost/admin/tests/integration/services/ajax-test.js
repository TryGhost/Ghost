import Pretender from 'pretender';
import RSVP from 'rsvp';
import Service from '@ember/service';
import config from 'ghost-admin/config/environment';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {
    isAjaxError,
    isUnauthorizedError
} from 'ember-ajax/errors';
import {
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {setupTest} from 'ember-mocha';

function stubAjaxEndpoint(server, response = {}, code = 200) {
    server.get('/test/', function () {
        return [
            code,
            {'Content-Type': 'application/json'},
            JSON.stringify(response)
        ];
    });
}

describe('Integration: Service: ajax', function () {
    setupTest('service:ajax', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('adds Ghost version header to requests', function (done) {
        let {version} = config.APP;
        let ajax = this.subject();

        stubAjaxEndpoint(server, {});

        ajax.request('/test/').then(() => {
            let [request] = server.handledRequests;
            expect(request.requestHeaders['X-Ghost-Version']).to.equal(version);
            done();
        });
    });

    it('correctly parses single message response text', function (done) {
        let error = {message: 'Test Error'};
        stubAjaxEndpoint(server, error, 500);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true();
        }).catch((error) => {
            expect(error.payload.errors.length).to.equal(1);
            expect(error.payload.errors[0].message).to.equal('Test Error');
            done();
        });
    });

    it('correctly parses single error response text', function (done) {
        let error = {error: 'Test Error'};
        stubAjaxEndpoint(server, error, 500);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true();
        }).catch((error) => {
            expect(error.payload.errors.length).to.equal(1);
            expect(error.payload.errors[0].message).to.equal('Test Error');
            done();
        });
    });

    it('correctly parses multiple error messages', function (done) {
        let error = {errors: ['First Error', 'Second Error']};
        stubAjaxEndpoint(server, error, 500);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true();
        }).catch((error) => {
            expect(error.payload.errors.length).to.equal(2);
            expect(error.payload.errors[0].message).to.equal('First Error');
            expect(error.payload.errors[1].message).to.equal('Second Error');
            done();
        });
    });

    it('returns default error object for non built-in error', function (done) {
        stubAjaxEndpoint(server, {}, 500);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isAjaxError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for built-in errors', function (done) {
        stubAjaxEndpoint(server, '', 401);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isUnauthorizedError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for VersionMismatchError', function (done) {
        server.get('/test/', function () {
            return [
                400,
                {'Content-Type': 'application/json'},
                JSON.stringify({
                    errors: [{
                        errorType: 'VersionMismatchError',
                        statusCode: 400
                    }]
                })
            ];
        });

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isVersionMismatchError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for RequestEntityTooLargeError on 413 errors', function (done) {
        stubAjaxEndpoint(server, {}, 413);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isRequestEntityTooLargeError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for UnsupportedMediaTypeError on 415 errors', function (done) {
        stubAjaxEndpoint(server, {}, 415);

        let ajax = this.subject();

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isUnsupportedMediaTypeError(error)).to.be.true;
            done();
        });
    });

    /* eslint-disable camelcase */
    describe('session handling', function () {
        let successfulRequest = false;

        let sessionStub = Service.extend({
            isAuthenticated: true,
            restoreCalled: false,
            authenticated: null,

            init() {
                this.authenticated = {
                    expires_at: (new Date()).getTime() - 10000,
                    refresh_token: 'RefreshMe123'
                };
            },

            restore() {
                this.restoreCalled = true;
                this.authenticated.expires_at = (new Date()).getTime() + 10000;
                return RSVP.resolve();
            },

            authorize() {

            }
        });

        beforeEach(function () {
            server.get('/ghost/api/v0.1/test/', function () {
                return [
                    200,
                    {'Content-Type': 'application/json'},
                    JSON.stringify({
                        success: true
                    })
                ];
            });

            server.post('/ghost/api/v0.1/authentication/token', function () {
                return [
                    401,
                    {'Content-Type': 'application/json'},
                    JSON.stringify({})
                ];
            });
        });

        it('can restore an expired session', function (done) {
            let ajax = this.subject();
            ajax.set('session', sessionStub.create());

            ajax.request('/ghost/api/v0.1/test/');

            ajax.request('/ghost/api/v0.1/test/').then((result) => {
                expect(ajax.get('session.restoreCalled'), 'restoreCalled').to.be.true;
                expect(result.success, 'result.success').to.be.true;
                done();
            }).catch(() => {
                expect(true, 'request failed').to.be.false;
                done();
            });
        });

        it('errors correctly when session restoration fails', function (done) {
            let ajax = this.subject();
            let invalidateCalled = false;

            ajax.set('session', sessionStub.create());
            ajax.set('session.restore', function () {
                this.set('restoreCalled', true);
                return ajax.post('/ghost/api/v0.1/authentication/token');
            });
            ajax.set('session.invalidate', function () {
                invalidateCalled = true;
            });

            stubAjaxEndpoint(server, {}, 401);

            ajax.request('/ghost/api/v0.1/test/').then(() => {
                expect(true, 'request was successful').to.be.false;
                done();
            }).catch(() => {
                // TODO: fix the error return when a session restore fails
                // expect(isUnauthorizedError(error)).to.be.true;
                expect(ajax.get('session.restoreCalled'), 'restoreCalled').to.be.true;
                expect(successfulRequest, 'successfulRequest').to.be.false;
                expect(invalidateCalled, 'invalidateCalled').to.be.true;
                done();
            });
        });
    });
});
