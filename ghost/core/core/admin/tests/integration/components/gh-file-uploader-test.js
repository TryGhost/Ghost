import $ from 'jquery';
import Pretender from 'pretender';
import Service from '@ember/service';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {UnsupportedMediaTypeError} from 'ghost-admin/services/ajax';
import {click, find, findAll, render, settled, triggerEvent} from '@ember/test-helpers';
import {createFile, fileUpload} from '../../helpers/file-upload';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupRenderingTest} from 'ember-mocha';

const notificationsStub = Service.extend({
    showAPIError() {
        // noop - to be stubbed
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/images/`, function () {
        return [200, {'Content-Type': 'application/json'}, '{"url":"/content/images/test.png"}'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/images/`, function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                type: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describe('Integration: Component: gh-file-uploader', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.set('uploadUrl', `${ghostPaths().apiRoot}/images/`);

        this.owner.register('service:notifications', notificationsStub);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', async function () {
        await render(hbs`{{gh-file-uploader}}`);

        expect(find('label').textContent.trim(), 'default label')
            .to.equal('Select or drag-and-drop a file');
    });

    it('allows file input "accept" attribute to be changed', async function () {
        await render(hbs`{{gh-file-uploader}}`);
        expect(
            find('input[type="file"]').getAttribute('accept'),
            'default "accept" attribute'
        ).to.equal('text/csv');

        await render(hbs`{{gh-file-uploader accept="application/zip"}}`);
        expect(
            find('input[type="file"]').getAttribute('accept'),
            'specified "accept" attribute'
        ).to.equal('application/zip');
    });

    it('renders form with supplied label text', async function () {
        this.set('labelText', 'My label');
        await render(hbs`{{gh-file-uploader labelText=labelText}}`);

        expect(find('label').textContent.trim(), 'label')
            .to.equal('My label');
    });

    it('generates request to supplied endpoint', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(server.handledRequests.length).to.equal(1);
        expect(server.handledRequests[0].url).to.equal(`${ghostPaths().apiRoot}/images/`);
    });

    it('fires uploadSuccess action on successful upload', async function () {
        let uploadSuccess = sinon.spy();
        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(uploadSuccess.calledOnce).to.be.true;
        expect(uploadSuccess.firstCall.args[0]).to.eql({url: '/content/images/test.png'});
    });

    it('doesn\'t fire uploadSuccess action on failed upload', async function () {
        let uploadSuccess = sinon.spy();
        this.set('uploadSuccess', uploadSuccess);

        stubFailedUpload(server, 500);

        await render(hbs`{{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        await settled();
        expect(uploadSuccess.calledOnce).to.be.false;
    });

    it('fires fileSelected action on file selection', async function () {
        let fileSelected = sinon.spy();
        this.set('fileSelected', fileSelected);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl fileSelected=(action fileSelected)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(fileSelected.calledOnce).to.be.true;
        expect(fileSelected.args[0]).to.not.be.empty;
    });

    it('fires uploadStarted action on upload start', async function () {
        let uploadStarted = sinon.spy();
        this.set('uploadStarted', uploadStarted);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl uploadStarted=(action uploadStarted)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(uploadStarted.calledOnce).to.be.true;
    });

    it('fires uploadFinished action on successful upload', async function () {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl uploadFinished=(action uploadFinished)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(uploadFinished.calledOnce).to.be.true;
    });

    it('fires uploadFinished action on failed upload', async function () {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubFailedUpload(server);

        await render(hbs`{{gh-file-uploader url=uploadUrl uploadFinished=(action uploadFinished)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(uploadFinished.calledOnce).to.be.true;
    });

    it('displays invalid file type error', async function () {
        stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
        expect(findAll('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
        expect(find('.gh-btn-green').textContent).to.equal('Try Again');
    });

    it('displays file too large for server error', async function () {
        stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('handles file too large error directly from the web server', async function () {
        server.post(`${ghostPaths().apiRoot}/images/`, function () {
            return [413, {}, ''];
        });
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file you uploaded was larger/);
    });

    it('displays other server-side error with message', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Error: UnknownError/);
    });

    it('handles unknown failure', async function () {
        server.post(`${ghostPaths().apiRoot}/images/`, function () {
            return [500, {'Content-Type': 'application/json'}, ''];
        });
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Something went wrong/);
    });

    it('triggers notifications.showAPIError for VersionMismatchError', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'VersionMismatchError');

        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(showAPIError.calledOnce).to.be.true;
    });

    it('doesn\'t trigger notifications.showAPIError for other errors', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(showAPIError.called).to.be.false;
    });

    it('can be reset after a failed upload', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-file-uploader url=uploadUrl}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});
        await click('.gh-btn-green');

        expect(findAll('input[type="file"]').length).to.equal(1);
    });

    it('handles drag over/leave', async function () {
        await render(hbs`{{gh-file-uploader}}`);

        run(() => {
            // eslint-disable-next-line new-cap
            let dragover = $.Event('dragover', {
                dataTransfer: {
                    files: []
                }
            });
            $(find('.gh-image-uploader')).trigger(dragover);
        });

        await settled();

        expect(find('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.true;

        await triggerEvent('.gh-image-uploader', 'dragleave');

        expect(find('.gh-image-uploader').classList.contains('-drag-over'), 'has drag-over class').to.be.false;
    });

    it('triggers file upload on file drop', async function () {
        let uploadSuccess = sinon.spy();
        // eslint-disable-next-line new-cap
        let drop = $.Event('drop', {
            dataTransfer: {
                files: [createFile(['test'], {name: 'test.csv'})]
            }
        });

        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);
        await render(hbs`{{gh-file-uploader url=uploadUrl uploadSuccess=(action uploadSuccess)}}`);

        run(() => {
            $(find('.gh-image-uploader')).trigger(drop);
        });

        await settled();

        expect(uploadSuccess.calledOnce).to.be.true;
        expect(uploadSuccess.firstCall.args[0]).to.eql({url: '/content/images/test.png'});
    });

    it('validates extension by default', async function () {
        let uploadSuccess = sinon.spy();
        let uploadFailed = sinon.spy();

        this.set('uploadSuccess', uploadSuccess);
        this.set('uploadFailed', uploadFailed);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader
            url=uploadUrl
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.txt'});

        expect(uploadSuccess.called).to.be.false;
        expect(uploadFailed.calledOnce).to.be.true;
        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });

    it('uploads if validate action supplied and returns true', async function () {
        let validate = sinon.stub().returns(true);
        let uploadSuccess = sinon.spy();

        this.set('validate', validate);
        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader
            url=uploadUrl
            uploadSuccess=(action uploadSuccess)
            validate=(action validate)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        await settled();

        expect(validate.calledOnce).to.be.true;
        expect(uploadSuccess.calledOnce).to.be.true;
    });

    it('skips upload and displays error if validate action supplied and doesn\'t return true', async function () {
        let validate = sinon.stub().returns(new UnsupportedMediaTypeError());
        let uploadSuccess = sinon.spy();
        let uploadFailed = sinon.spy();

        this.set('validate', validate);
        this.set('uploadSuccess', uploadSuccess);
        this.set('uploadFailed', uploadFailed);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-file-uploader
            url=uploadUrl
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)
            validate=(action validate)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.csv'});

        expect(validate.calledOnce).to.be.true;
        expect(uploadSuccess.called).to.be.false;
        expect(uploadFailed.calledOnce).to.be.true;
        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The file type you uploaded is not supported/);
    });
});
