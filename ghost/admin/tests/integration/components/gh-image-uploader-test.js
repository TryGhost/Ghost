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
    showAPIError(/* error, options */) {
        // noop - to be stubbed
    }
});

const sessionStub = Service.extend({
    isAuthenticated: false,

    init() {
        this._super(...arguments);
        let authenticated = {access_token: 'AccessMe123'};
        this.authenticated = authenticated;
        this.data = {authenticated};
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
        return [200, {'Content-Type': 'application/json'}, '{"images": [{"url":"/content/images/test.png"}]}'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                type: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describe('Integration: Component: gh-image-uploader', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        this.owner.register('service:session', sessionStub);
        this.owner.register('service:notifications', notificationsStub);
        this.set('update', function () {});
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders form with supplied alt text', async function () {
        await render(hbs`{{gh-image-uploader image=image altText="text test"}}`);
        expect(find('[data-test-file-input-description]')).to.have.trimmed.text('Upload image of "text test"');
    });

    it('renders form with supplied text', async function () {
        await render(hbs`{{gh-image-uploader image=image text="text test"}}`);
        expect(find('[data-test-file-input-description]')).to.have.trimmed.text('text test');
    });

    it('generates request to correct endpoint', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(server.handledRequests.length).to.equal(1);
        expect(server.handledRequests[0].url).to.equal(`${ghostPaths().apiRoot}/images/upload/`);
        expect(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
    });

    it('fires update action on successful upload', async function () {
        let update = sinon.spy();
        this.set('update', update);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(update.calledOnce).to.be.true;
        expect(update.firstCall.args[0]).to.equal('/content/images/test.png');
    });

    it('doesn\'t fire update action on failed upload', async function () {
        let update = sinon.spy();
        this.set('update', update);

        stubFailedUpload(server, 500);

        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(update.calledOnce).to.be.false;
    });

    it('fires fileSelected action on file selection', async function () {
        let fileSelected = sinon.spy();
        this.set('fileSelected', fileSelected);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image fileSelected=(action fileSelected) update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(fileSelected.calledOnce).to.be.true;
        expect(fileSelected.args[0]).to.not.be.empty;
    });

    it('fires uploadStarted action on upload start', async function () {
        let uploadStarted = sinon.spy();
        this.set('uploadStarted', uploadStarted);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image uploadStarted=(action uploadStarted) update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(uploadStarted.calledOnce).to.be.true;
    });

    it('fires uploadFinished action on successful upload', async function () {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(uploadFinished.calledOnce).to.be.true;
    });

    it('fires uploadFinished action on failed upload', async function () {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubFailedUpload(server);

        await render(hbs`{{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(uploadFinished.calledOnce).to.be.true;
    });

    it('displays invalid file type error', async function () {
        stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The image type you uploaded is not supported/);
        expect(findAll('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
        expect(find('.gh-btn-green').textContent).to.equal('Try Again');
    });

    it('displays file too large for server error', async function () {
        stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The image you uploaded was larger/);
    });

    it('handles file too large error directly from the web server', async function () {
        server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
            return [413, {}, ''];
        });
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The image you uploaded was larger/);
    });

    it('displays other server-side error with message', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Error: UnknownError/);
    });

    it('handles unknown failure', async function () {
        server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
            return [500, {'Content-Type': 'application/json'}, ''];
        });
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/Something went wrong/);
    });

    it('triggers notifications.showAPIError for VersionMismatchError', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'VersionMismatchError');

        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(showAPIError.calledOnce).to.be.true;
    });

    it('doesn\'t trigger notifications.showAPIError for other errors', async function () {
        let showAPIError = sinon.spy();
        let notifications = this.owner.lookup('service:notifications');
        notifications.set('showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(showAPIError.called).to.be.false;
    });

    it('can be reset after a failed upload', async function () {
        stubFailedUpload(server, 400, 'UnknownError');
        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        await fileUpload('input[type="file"]', ['test'], {type: 'test.png'});
        await click('.gh-btn-green');

        expect(findAll('input[type="file"]').length).to.equal(1);
    });

    it('handles drag over/leave', async function () {
        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

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
                files: [createFile(['test'], {name: 'test.png'})]
            }
        });

        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);
        await render(hbs`{{gh-image-uploader uploadSuccess=(action uploadSuccess)}}`);

        run(() => {
            $(find('.gh-image-uploader')).trigger(drop);
        });
        await settled();

        expect(uploadSuccess.calledOnce).to.be.true;
        expect(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
    });

    it('validates extension by default', async function () {
        let uploadSuccess = sinon.spy();
        let uploadFailed = sinon.spy();

        this.set('uploadSuccess', uploadSuccess);
        this.set('uploadFailed', uploadFailed);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.json'});

        expect(uploadSuccess.called).to.be.false;
        expect(uploadFailed.calledOnce).to.be.true;
        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });

    it('uploads if validate action supplied and returns true', async function () {
        let validate = sinon.stub().returns(true);
        let uploadSuccess = sinon.spy();

        this.set('validate', validate);
        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);

        await render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            validate=(action validate)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.txt'});

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

        await render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)
            validate=(action validate)}}`);

        await fileUpload('input[type="file"]', ['test'], {name: 'test.png'});

        expect(validate.calledOnce).to.be.true;
        expect(uploadSuccess.called).to.be.false;
        expect(uploadFailed.calledOnce).to.be.true;
        expect(findAll('.failed').length, 'error message is displayed').to.equal(1);
        expect(find('.failed').textContent).to.match(/The image type you uploaded is not supported/);
    });

    describe('unsplash', function () {
        it('has unsplash icon only when unsplash is active & allowed');
        it('opens unsplash modal when icon clicked');
        it('inserts unsplash image when selected');
        it('closes unsplash modal when close is triggered');
    });
});
