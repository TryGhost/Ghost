import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import {
    isAjaxError,
    isUnauthorizedError
} from 'ember-ajax/errors';
import {
    isVersionMismatchError,
    isRequestEntityTooLargeError,
    isUnsupportedMediaTypeError
} from 'ghost-admin/services/ajax';
import config from 'ghost-admin/config/environment';

function stubAjaxEndpoint(server, response = {}, code = 200) {
    server.get('/test/', function () {
        return [
            code,
            {'Content-Type': 'application/json'},
            JSON.stringify(response)
        ];
    });
}

describeModule(
    'service:ajax',
    'Integration: Service: ajax',
    {
        integration: true
    },
    function () {
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
                expect(error.errors.length).to.equal(1);
                expect(error.errors[0].message).to.equal('Test Error');
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
                expect(error.errors.length).to.equal(1);
                expect(error.errors[0].message).to.equal('Test Error');
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
                expect(error.errors.length).to.equal(2);
                expect(error.errors[0].message).to.equal('First Error');
                expect(error.errors[1].message).to.equal('Second Error');
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
    }
);
