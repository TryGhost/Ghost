/* jshint expr:true */
/* global Blob */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import Ember from 'ember';
import sinon from 'sinon';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

const {run} = Ember;

const createFile = function (content = ['test'], options = {}) {
    let {
        name,
        type,
        lastModifiedDate
    } = options;

    let file = new Blob(content, {type: type ? type : 'text/plain'});
    file.name = name ? name : 'text.txt';

    return file;
};

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
    'gh-file-uploader',
    'Unit: Component: gh-file-uploader',
    {
        needs: [
            'service:ajax',
            'service:session', // used by ajax service
            'service:feature',
            'component:x-file-input'
        ],
        unit: true
    },
    function() {
        let server, url;

        beforeEach(function () {
            server = new Pretender();
            url = '/ghost/api/v0.1/uploads/';
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders', function() {
            // creates the component instance
            let component = this.subject();
            // renders the component on the page
            this.render();
            expect(component).to.be.ok;
            expect(this.$()).to.have.length(1);
        });

        it('fires uploadSuccess action on successful upload', function (done) {
            let uploadSuccess = sinon.spy();
            let component = this.subject({url, uploadSuccess});
            let file = createFile();

            stubSuccessfulUpload(server);

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadSuccess.calledOnce).to.be.true;
                expect(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });

        it('fires uploadStarted action on upload start', function (done) {
            let uploadStarted = sinon.spy();
            let component = this.subject({url, uploadStarted});
            let file = createFile();

            stubSuccessfulUpload(server);

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadStarted.calledOnce).to.be.true;
                done();
            });
        });

        it('fires uploadFinished action on successful upload', function (done) {
            let uploadFinished = sinon.spy();
            let component = this.subject({url, uploadFinished});
            let file = createFile();

            stubSuccessfulUpload(server);

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadFinished.calledOnce).to.be.true;
                done();
            });
        });

        it('fires uploadFinished action on failed upload', function (done) {
            let uploadFinished = sinon.spy();
            let component = this.subject({url, uploadFinished});
            let file = createFile();

            stubFailedUpload(server);

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadFinished.calledOnce).to.be.true;
                done();
            });
        });

        it('displays invalid file type error', function (done) {
            let component = this.subject({url});
            let file = createFile();

            stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');
            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The file type you uploaded is not supported/);
                expect(this.$('.btn-green').length, 'reset button is displayed').to.equal(1);
                expect(this.$('.btn-green').text()).to.equal('Try Again');
                done();
            });
        });

        it('displays file too large for server error', function (done) {
            let component = this.subject({url});
            let file = createFile();

            stubFailedUpload(server, 413, 'RequestEntityTooLargeError');
            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The file you uploaded was larger/);
                done();
            });
        });

        it('handles file too large error directly from the web server', function (done) {
            let component = this.subject({url});
            let file = createFile();

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [413, {}, ''];
            });

            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The file you uploaded was larger/);
                done();
            });
        });

        it('displays other server-side error with message', function (done) {
            let component = this.subject({url});
            let file = createFile();

            stubFailedUpload(server, 400, 'UnknownError');
            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/Error: UnknownError/);
                done();
            });
        });

        it('handles unknown failure', function (done) {
            let component = this.subject({url});
            let file = createFile();

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [500, {'Content-Type': 'application/json'}, ''];
            });

            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/Something went wrong/);
                done();
            });
        });

        it('can be reset after a failed upload', function (done) {
            let component = this.subject({url});
            let file = createFile();

            stubFailedUpload(server, 400, 'UnknownError');
            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

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
            let component = this.subject({url, uploadFinished: done});
            let file = createFile();

            // pretender fires a progress event every 50ms
            stubSuccessfulUpload(server, 150);
            this.render();

            run(() => {
                component.send('fileSelected', [file]);
            });

            // after 75ms we should have had one progress event
            run.later(this, function () {
                expect(this.$('.progress .bar').length).to.equal(1);
                let [_, percentageWidth] = this.$('.progress .bar').attr('style').match(/width: (\d+)%?/);
                expect(percentageWidth).to.be.above(0);
                expect(percentageWidth).to.be.below(100);
            }, 75);
        });

        it('triggers file upload on file drop', function (done) {
            let uploadSuccess = sinon.spy();
            let component = this.subject({url, uploadSuccess});
            let file = createFile();
            let drop = Ember.$.Event('drop', {
                dataTransfer: {
                    files: [file]
                }
            });

            stubSuccessfulUpload(server);
            this.render();

            run(() => {
                this.$().trigger(drop);
            });

            wait().then(() => {
                expect(uploadSuccess.calledOnce).to.be.true;
                expect(uploadSuccess.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });
    }
);
