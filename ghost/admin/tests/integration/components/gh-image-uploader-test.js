import $ from 'jquery';
import Pretender from 'pretender';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';
import {UnsupportedMediaTypeError} from 'ghost-admin/services/ajax';
import {createFile, fileUpload} from '../../helpers/file-upload';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

const notificationsStub = Service.extend({
    showAPIError(/* error, options */) {
        // noop - to be stubbed
    }
});

const sessionStub = Service.extend({
    isAuthenticated: false,
    authorize(authorizer, block) {
        if (this.get('isAuthenticated')) {
            block('Authorization', 'Bearer token');
        }
    }
});

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post('/ghost/api/v0.1/uploads/', function () {
        return [200, {'Content-Type': 'application/json'}, '"/content/images/test.png"'];
    }, delay);
};

const stubFailedUpload = function (server, code, error, delay = 0) {
    server.post('/ghost/api/v0.1/uploads/', function () {
        return [code, {'Content-Type': 'application/json'}, JSON.stringify({
            errors: [{
                errorType: error,
                message: `Error: ${error}`
            }]
        })];
    }, delay);
};

describe('Integration: Component: gh-image-uploader', function () {
    setupComponentTest('gh-image-upload', {
        integration: true
    });

    let server;

    beforeEach(function () {
        this.register('service:session', sessionStub);
        this.register('service:notifications', notificationsStub);
        this.inject.service('session', {as: 'sessionService'});
        this.inject.service('notifications', {as: 'notifications'});
        this.set('update', function () {});
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    it('renders', function () {
        this.set('image', 'http://example.com/test.png');
        this.render(hbs`{{gh-image-uploader image=image}}`);
        expect(this.$()).to.have.length(1);
    });

    it('renders form with supplied alt text', function () {
        this.render(hbs`{{gh-image-uploader image=image altText="text test"}}`);
        expect(this.$('[data-test-file-input-description]').text().trim()).to.equal('Upload image of "text test"');
    });

    it('renders form with supplied text', function () {
        this.render(hbs`{{gh-image-uploader image=image text="text test"}}`);
        expect(this.$('[data-test-file-input-description]').text().trim()).to.equal('text test');
    });

    it('generates request to correct endpoint', function (done) {
        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(server.handledRequests.length).to.equal(1);
            expect(server.handledRequests[0].url).to.equal('/ghost/api/v0.1/uploads/');
            expect(server.handledRequests[0].requestHeaders.Authorization).to.be.undefined;
            done();
        });
    });

    it('adds authentication headers to request', function (done) {
        stubSuccessfulUpload(server);

        this.get('sessionService').set('isAuthenticated', true);

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            let [request] = server.handledRequests;
            expect(request.requestHeaders.Authorization).to.equal('Bearer token');
            done();
        });
    });

    it('fires update action on successful upload', function (done) {
        let update = sinon.spy();
        this.set('update', update);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(update.calledOnce).to.be.true;
            expect(update.firstCall.args[0]).to.equal('/content/images/test.png');
            done();
        });
    });

    it('doesn\'t fire update action on failed upload', function (done) {
        let update = sinon.spy();
        this.set('update', update);

        stubFailedUpload(server, 500);

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(update.calledOnce).to.be.false;
            done();
        });
    });

    it('fires fileSelected action on file selection', function (done) {
        let fileSelected = sinon.spy();
        this.set('fileSelected', fileSelected);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image fileSelected=(action fileSelected) update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(fileSelected.calledOnce).to.be.true;
            expect(fileSelected.args[0]).to.not.be.blank;
            done();
        });
    });

    it('fires uploadStarted action on upload start', function (done) {
        let uploadStarted = sinon.spy();
        this.set('uploadStarted', uploadStarted);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image uploadStarted=(action uploadStarted) update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(uploadStarted.calledOnce).to.be.true;
            done();
        });
    });

    it('fires uploadFinished action on successful upload', function (done) {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(uploadFinished.calledOnce).to.be.true;
            done();
        });
    });

    it('fires uploadFinished action on failed upload', function (done) {
        let uploadFinished = sinon.spy();
        this.set('uploadFinished', uploadFinished);

        stubFailedUpload(server);

        this.render(hbs`{{gh-image-uploader image=image uploadFinished=(action uploadFinished) update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(uploadFinished.calledOnce).to.be.true;
            done();
        });
    });

    it('displays invalid file type error', function (done) {
        stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
            expect(this.$('.gh-btn-green').length, 'reset button is displayed').to.equal(1);
            expect(this.$('.gh-btn-green').text()).to.equal('Try Again');
            done();
        });
    });

    it('displays file too large for server error', function (done) {
        stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/The image you uploaded was larger/);
            done();
        });
    });

    it('handles file too large error directly from the web server', function (done) {
        server.post('/ghost/api/v0.1/uploads/', function () {
            return [413, {}, ''];
        });
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/The image you uploaded was larger/);
            done();
        });
    });

    it('displays other server-side error with message', function (done) {
        stubFailedUpload(server, 400, 'UnknownError');
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/Error: UnknownError/);
            done();
        });
    });

    it('handles unknown failure', function (done) {
        server.post('/ghost/api/v0.1/uploads/', function () {
            return [500, {'Content-Type': 'application/json'}, ''];
        });
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/Something went wrong/);
            done();
        });
    });

    it('triggers notifications.showAPIError for VersionMismatchError', function (done) {
        let showAPIError = sinon.spy();
        this.set('notifications.showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'VersionMismatchError');

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(showAPIError.calledOnce).to.be.true;
            done();
        });
    });

    it('doesn\'t trigger notifications.showAPIError for other errors', function (done) {
        let showAPIError = sinon.spy();
        this.set('notifications.showAPIError', showAPIError);

        stubFailedUpload(server, 400, 'UnknownError');
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(showAPIError.called).to.be.false;
            done();
        });
    });

    it('can be reset after a failed upload', function (done) {
        stubFailedUpload(server, 400, 'UnknownError');
        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {type: 'test.png'});

        wait().then(() => {
            run(() => {
                this.$('.gh-btn-green').click();
            });
        });

        wait().then(() => {
            expect(this.$('input[type="file"]').length).to.equal(1);
            done();
        });
    });

    it('displays upload progress', function (done) {
        this.set('done', done);

        // pretender fires a progress event every 50ms
        stubSuccessfulUpload(server, 150);

        this.render(hbs`{{gh-image-uploader image=image uploadFinished=(action done) update=(action update)}}`);
        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        // after 75ms we should have had one progress event
        run.later(this, function () {
            expect(this.$('.progress .bar').length).to.equal(1);
            let [, percentageWidth] = this.$('.progress .bar').attr('style').match(/width: (\d+)%?/);
            expect(percentageWidth).to.be.above(0);
            expect(percentageWidth).to.be.below(100);
        }, 75);
    });

    it('handles drag over/leave', function () {
        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

        run(() => {
            // eslint-disable-next-line new-cap
            let dragover = $.Event('dragover', {
                dataTransfer: {
                    files: []
                }
            });
            this.$('.gh-image-uploader').trigger(dragover);
        });

        expect(this.$('.gh-image-uploader').hasClass('-drag-over'), 'has drag-over class').to.be.true;

        run(() => {
            this.$('.gh-image-uploader').trigger('dragleave');
        });

        expect(this.$('.gh-image-uploader').hasClass('-drag-over'), 'has drag-over class').to.be.false;
    });

    it('triggers file upload on file drop', function (done) {
        let uploadSuccess = sinon.spy();
        // eslint-disable-next-line new-cap
        let drop = $.Event('drop', {
            dataTransfer: {
                files: [createFile(['test'], {name: 'test.png'})]
            }
        });

        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);
        this.render(hbs`{{gh-image-uploader uploadSuccess=(action uploadSuccess)}}`);

        run(() => {
            this.$('.gh-image-uploader').trigger(drop);
        });

        wait().then(() => {
            expect(uploadSuccess.calledOnce).to.be.true;
            expect(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
            done();
        });
    });

    it('validates extension by default', function (done) {
        let uploadSuccess = sinon.spy();
        let uploadFailed = sinon.spy();

        this.set('uploadSuccess', uploadSuccess);
        this.set('uploadFailed', uploadFailed);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)}}`);

        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.json'});

        wait().then(() => {
            expect(uploadSuccess.called).to.be.false;
            expect(uploadFailed.calledOnce).to.be.true;
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
            done();
        });
    });

    it('uploads if validate action supplied and returns true', function (done) {
        let validate = sinon.stub().returns(true);
        let uploadSuccess = sinon.spy();

        this.set('validate', validate);
        this.set('uploadSuccess', uploadSuccess);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            validate=(action validate)}}`);

        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.txt'});

        wait().then(() => {
            expect(validate.calledOnce).to.be.true;
            expect(uploadSuccess.calledOnce).to.be.true;
            done();
        });
    });

    it('skips upload and displays error if validate action supplied and doesn\'t return true', function (done) {
        let validate = sinon.stub().returns(new UnsupportedMediaTypeError());
        let uploadSuccess = sinon.spy();
        let uploadFailed = sinon.spy();

        this.set('validate', validate);
        this.set('uploadSuccess', uploadSuccess);
        this.set('uploadFailed', uploadFailed);

        stubSuccessfulUpload(server);

        this.render(hbs`{{gh-image-uploader
            uploadSuccess=(action uploadSuccess)
            uploadFailed=(action uploadFailed)
            validate=(action validate)}}`);

        fileUpload(this.$('input[type="file"]'), ['test'], {name: 'test.png'});

        wait().then(() => {
            expect(validate.calledOnce).to.be.true;
            expect(uploadSuccess.called).to.be.false;
            expect(uploadFailed.calledOnce).to.be.true;
            expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
            expect(this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
            done();
        });
    });

    describe('unsplash', function () {
        it('has unsplash icon only when unsplash is active & allowed');
        it('opens unsplash modal when icon clicked');
        it('inserts unsplash image when selected');
        it('closes unsplash modal when close is triggered');
    });
});
