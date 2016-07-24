/* jshint expr:true */
import sinon from 'sinon';
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';
import {createFile, fileUpload} from '../../helpers/file-upload';
import $ from 'jquery';
import run from 'ember-runloop';
import Service from 'ember-service';

const keyCodes = {
    enter: 13
};

const configStub = Service.extend({
    fileStorage: true
});

const notificationsStub = Service.extend({
    showAPIError(error, options) {
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

describeComponent(
    'gh-image-upload',
    'Integration: Component: gh-image-uploader',
    {
        integration: true
    },
    function() {
        let server;

        beforeEach(function () {
            this.register('service:config', configStub);
            this.register('service:session', sessionStub);
            this.register('service:notifications', notificationsStub);
            this.inject.service('config', {as: 'configService'});
            this.inject.service('session', {as: 'sessionService'});
            this.inject.service('notifications', {as: 'notifications'});
            this.set('update', function () {});
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders', function() {
            this.set('image', 'http://example.com/test.png');
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$()).to.have.length(1);
        });

        it('defaults to upload form', function () {
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(1);
        });

        it('defaults to url form with no filestorage config', function () {
            this.set('configService.fileStorage', false);
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(0);
            expect(this.$('input[type="text"].url').length).to.equal(1);
        });

        it('can switch between form types', function () {
            this.render(hbs`{{gh-image-uploader image=image}}`);
            expect(this.$('input[type="file"]').length).to.equal(1);
            expect(this.$('input[type="text"].url').length).to.equal(0);

            this.$('a.image-url').click();

            expect(this.$('input[type="file"]').length, 'upload form is visible after switch to url form')
                .to.equal(0);
            expect(this.$('input[type="text"].url').length, 'url form is visible after switch to url form')
                .to.equal(1);

            this.$('a.image-upload').click();

            expect(this.$('input[type="file"]').length, 'upload form is visible after switch to upload form')
                .to.equal(1);
            expect(this.$('input[type="text"].url').length, 'url form is visible after switch to upload form')
                .to.equal(0);
        });

        it('triggers formChanged action when switching between forms', function () {
            let formChanged = sinon.spy();
            this.set('formChanged', formChanged);

            this.render(hbs`{{gh-image-uploader image=image formChanged=(action formChanged)}}`);

            this.$('a.image-url').click();
            this.$('a.image-upload').click();

            expect(formChanged.calledTwice).to.be.true;
            expect(formChanged.firstCall.args[0]).to.equal('url-input');
            expect(formChanged.secondCall.args[0]).to.equal('upload');
        });

        describe('file upload form', function () {
            it('renders form with supplied alt text', function () {
                this.render(hbs`{{gh-image-uploader image=image altText="text test"}}`);
                expect(this.$('.description').text().trim()).to.equal('Upload image of "text test"');
            });

            it('renders form with supplied text', function () {
                this.render(hbs`{{gh-image-uploader image=image text="text test"}}`);
                expect(this.$('.description').text().trim()).to.equal('text test');
            });

            it('generates request to correct endpoint', function (done) {
                stubSuccessfulUpload(server);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    expect(update.calledOnce).to.be.false;
                    done();
                });
            });

            it('fires uploadStarted action on upload start', function (done) {
                let uploadStarted = sinon.spy();
                this.set('uploadStarted', uploadStarted);

                stubSuccessfulUpload(server);

                this.render(hbs`{{gh-image-uploader image=image uploadStarted=(action uploadStarted) update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    expect(uploadFinished.calledOnce).to.be.true;
                    done();
                });
            });

            it('displays invalid file type error', function (done) {
                stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                    expect(this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
                    expect(this.$('.btn-green').length, 'reset button is displayed').to.equal(1);
                    expect(this.$('.btn-green').text()).to.equal('Try Again');
                    done();
                });
            });

            it('displays file too large for server error', function (done) {
                stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                    expect(this.$('.failed').text()).to.match(/The image you uploaded was larger/);
                    done();
                });
            });

            it('displays other server-side error with message', function (done) {
                stubFailedUpload(server, 400, 'UnknownError');
                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

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
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    expect(showAPIError.called).to.be.false;
                    done();
                });
            });

            it('can be reset after a failed upload', function (done) {
                stubFailedUpload(server, 400, 'UnknownError');
                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);
                fileUpload(this.$('input[type="file"]'));

                wait().then(() => {
                    run(() => {
                        this.$('.btn-green').click();
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
                fileUpload(this.$('input[type="file"]'));

                // after 75ms we should have had one progress event
                run.later(this, function () {
                    expect(this.$('.progress .bar').length).to.equal(1);
                    let [_, percentageWidth] = this.$('.progress .bar').attr('style').match(/width: (\d+)%?/);
                    expect(percentageWidth).to.be.above(0);
                    expect(percentageWidth).to.be.below(100);
                }, 75);
            });

            it('handles drag over/leave', function () {
                stubSuccessfulUpload(server);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                run(() => {
                    let dragover = $.Event('dragover', {
                        dataTransfer: {
                            files: []
                        }
                    });
                    this.$('.gh-image-uploader').trigger(dragover);
                });

                expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.true;

                run(() => {
                    this.$('.gh-image-uploader').trigger('dragleave');
                });

                expect(this.$('.gh-image-uploader').hasClass('--drag-over'), 'has drag-over class').to.be.false;
            });

            it('triggers file upload on file drop', function (done) {
                let uploadSuccess = sinon.spy();
                let drop = $.Event('drop', {
                    dataTransfer: {
                        files: [createFile()]
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
        });

        describe('URL input form', function () {
            beforeEach(function () {
                this.set('configService.fileStorage', false);
            });

            it('displays save button by default', function () {
                this.set('image', 'http://example.com/test.png');
                this.render(hbs`{{gh-image-uploader image=image text="text test"}}`);
                expect(this.$('button').length).to.equal(1);
                expect(this.$('input[type="text"]').val()).to.equal('http://example.com/test.png');
            });

            it('can render without a save button', function () {
                this.render(hbs`{{gh-image-uploader image=image saveButton=false text="text test"}}`);
                expect(this.$('button').length).to.equal(0);
                expect(this.$('.description').text().trim()).to.equal('text test');
            });

            it('fires update action when save button clicked', function () {
                let update = sinon.spy();
                this.set('update', update);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('button.btn-blue').click();

                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('saved url');
            });

            it('fires onInput action when typing URL', function () {
                let onInput = sinon.spy();
                this.set('onInput', onInput);

                this.render(hbs`{{gh-image-uploader image=image onInput=(action onInput)}}`);

                this.$('input[type="text"]').val('input url');
                this.$('input[type="text"]').change();

                expect(onInput.calledOnce).to.be.true;
                expect(onInput.firstCall.args[0]).to.equal('input url');
            });

            it('saves on enter key', function () {
                let update = sinon.spy();
                this.set('update', update);

                this.render(hbs`{{gh-image-uploader image=image update=(action update)}}`);

                this.$('input[type="text"]').val('saved url');
                this.$('input[type="text"]').change();
                this.$('input[type="text"]').trigger(
                    $.Event('keyup', {keyCode: keyCodes.enter, which: keyCodes.enter})
                );

                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('saved url');
            });
        });
    }
);
