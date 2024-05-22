import Pretender from 'pretender';
import Service from '@ember/service';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, findAll, render, waitFor} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {fileUpload} from '../../helpers/file-upload';
import {setupRenderingTest} from 'ember-mocha';

const notificationsStub = Service.extend({
    showAPIError() {
        // noop - to be stubbed
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/members/upload/`, function () {
        return [200, {'Content-Type': 'application/json'}, '{"url":"/content/images/test.png"}'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/members/upload/`, function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                type: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describe('Integration: Component: modal-import-members-test', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.set('uploadUrl', `${ghostPaths().apiRoot}/members/upload/`);

        this.owner.register('service:notifications', notificationsStub);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        await render(hbs`<ModalImportMembers />`);

        expect(find('h1').textContent.trim(), 'default header')
            .to.equal('Import members');
        expect(find('.description').textContent.trim(), 'upload label')
            .to.equal('Select or drop a CSV file');
    });

    it('generates request to supplied endpoint', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        await waitFor('table', {timeout: 50});

        expect(find('label').textContent.trim(), 'labels label')
            .to.equal('Label these members');
        expect(find('.gh-btn-green').textContent).to.match(/Import/g);

        await click('.gh-btn-green');

        expect(server.handledRequests.length).to.equal(1);
        expect(server.handledRequests[0].url).to.equal(`${ghostPaths().apiRoot}/members/upload/`);
    });

    it('displays server error', async function () {
        stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });

    it('displays file too large for server error', async function () {
        stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('handles file too large error directly from the web server', async function () {
        server.post(`${ghostPaths().apiRoot}/members/upload/`, function () {
            return [413, {}, ''];
        });
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('displays other server-side error with message', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/An unexpected error occurred, please try again/);
    });

    it('handles unknown failure', async function () {
        server.post(`${ghostPaths().apiRoot}/members/upload/`, function () {
            return [500, {'Content-Type': 'application/json'}, ''];
        });
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/An unexpected error occurred, please try again/);
    });

    it('triggers notifications.showAPIError for VersionMismatchError', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'VersionMismatchError');

        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(showAPIError.calledOnce).to.be.true;
    });

    it('doesn\'t trigger notifications.showAPIError for other errors', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`<ModalImportMembers />`);
        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(showAPIError.called).to.be.false;
    });

    it('validates extension by default', async function () {
        stubFailedUpload(server, 415);

        await render(hbs`<ModalImportMembers />`);

        await fileUpload('input[type="file"]', ['name,email\r\nmembername,memberemail@example.com'], {name: 'test.csv'});

        // Wait for async CSV parsing to finish
        await waitFor('table', {timeout: 50});
        await click('.gh-btn-green');

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
});
