import Pretender from 'pretender';
import config from 'ghost-admin/config/environment';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {
    isAjaxError,
    isUnauthorizedError
} from 'ember-ajax/errors';
import {
    isMaintenanceError,
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
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('adds Ghost version header to requests', function (done) {
        let {version} = config.APP;
        let ajax = this.owner.lookup('service:ajax');

        stubAjaxEndpoint(server, {});

        ajax.request('/test/').then(() => {
            let [request] = server.handledRequests;
            expect(request.requestHeaders['X-Ghost-Version']).to.equal(version);
            done();
        });
    });

    it('correctly parses single message response text', function (done) {
        let errorResponse = {message: 'Test Error'};
        stubAjaxEndpoint(server, errorResponse, 500);

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true();
        }).catch((error) => {
            expect(error.payload.errors.length).to.equal(1);
            expect(error.payload.errors[0].message).to.equal('Test Error');
            done();
        });
    });

    it('correctly parses single error response text', function (done) {
        let errorResponse = {error: 'Test Error'};
        stubAjaxEndpoint(server, errorResponse, 500);

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true();
        }).catch((error) => {
            expect(error.payload.errors.length).to.equal(1);
            expect(error.payload.errors[0].message).to.equal('Test Error');
            done();
        });
    });

    it('correctly parses multiple error messages', function (done) {
        let errorResponse = {errors: ['First Error', 'Second Error']};
        stubAjaxEndpoint(server, errorResponse, 500);

        let ajax = this.owner.lookup('service:ajax');

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

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isAjaxError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for built-in errors', function (done) {
        stubAjaxEndpoint(server, '', 401);

        let ajax = this.owner.lookup('service:ajax');

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
                        type: 'VersionMismatchError',
                        statusCode: 400
                    }]
                })
            ];
        });

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isVersionMismatchError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for RequestEntityTooLargeError on 413 errors', function (done) {
        stubAjaxEndpoint(server, {}, 413);

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isRequestEntityTooLargeError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for UnsupportedMediaTypeError on 415 errors', function (done) {
        stubAjaxEndpoint(server, {}, 415);

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isUnsupportedMediaTypeError(error)).to.be.true;
            done();
        });
    });

    it('handles error checking for MaintenanceError on 503 errors', function (done) {
        stubAjaxEndpoint(server, {}, 503);

        let ajax = this.owner.lookup('service:ajax');

        ajax.request('/test/').then(() => {
            expect(false).to.be.true;
        }).catch((error) => {
            expect(isMaintenanceError(error)).to.be.true;
            done();
        });
    });
});
