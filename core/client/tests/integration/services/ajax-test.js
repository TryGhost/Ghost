import { expect } from 'chai';
import {
    describeModule,
    it
} from 'ember-mocha';
import Pretender from 'pretender';
import {AjaxError, UnauthorizedError} from 'ember-ajax/errors';

function stubAjaxEndpoint(server, response) {
    server.get('/test/', function () {
        return [
            500,
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

        it('correctly parses single message response text', function (done) {
            let error = {message: 'Test Error'};
            stubAjaxEndpoint(server, error);

            let ajax = this.subject();

            ajax.request('/test/').then(() => {
                expect(false).to.be.true();
            }).catch((error) => {
                expect(error.errors).to.equal('Test Error');
                done();
            });
        });

        it('correctly parses single error response text', function (done) {
            let error = {error: 'Test Error'};
            stubAjaxEndpoint(server, error);

            let ajax = this.subject();

            ajax.request('/test/').then(() => {
                expect(false).to.be.true();
            }).catch((error) => {
                expect(error.errors).to.equal('Test Error');
                done();
            });
        });

        it('correctly parses multiple error messages', function (done) {
            let error = {errors: ['First Error', 'Second Error']};
            stubAjaxEndpoint(server, error);

            let ajax = this.subject();

            ajax.request('/test/').then(() => {
                expect(false).to.be.true();
            }).catch((error) => {
                expect(error.errors).to.deep.equal(['First Error', 'Second Error']);
                done();
            });
        });

        it('returns default error object for non built-in error', function (done) {
            stubAjaxEndpoint(server, {});

            let ajax = this.subject();

            ajax.request('/test/').then(() => {
                expect(false).to.be.true;
            }).catch((error) => {
                expect(error).to.be.instanceOf(AjaxError);
                done();
            });
        });

        it('returns known error object for built-in errors', function (done) {
            server.get('/test/', function () {
                return [
                    401,
                    {'Content-Type': 'application/json'},
                    ''
                ];
            });

            let ajax = this.subject();

            ajax.request('/test/').then(() => {
                expect(false).to.be.true;
            }).catch((error) => {
                expect(error).to.be.instanceOf(UnauthorizedError);
                done();
            });
        });
    }
);
