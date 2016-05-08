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
    'gh-image-uploader',
    'Unit: Component: gh-image-uploader',
    {
        needs: [
            'service:config',
            'service:session',
            'service:ajax',
            'service:feature',
            'component:x-file-input',
            'component:one-way-input'
        ],
        unit: true
    },
    function() {
        let server;

        beforeEach(function () {
            server = new Pretender();
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

        it('fires update action on successful upload', function (done) {
            let component = this.subject();
            let update = sinon.spy();
            let file = createFile();

            stubSuccessfulUpload(server);

            this.render();
            component.attrs.update = update;

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });

        it('fires uploadStarted action on upload start', function (done) {
            let component = this.subject();
            let uploadStarted = sinon.spy();
            let file = createFile();

            stubSuccessfulUpload(server);

            this.render();
            component.attrs.update = () => {};
            component.attrs.uploadStarted = uploadStarted;

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadStarted.calledOnce).to.be.true;
                done();
            });
        });

        it('fires uploadFinished action on successful upload', function (done) {
            let component = this.subject();
            let uploadFinished = sinon.spy();
            let file = createFile();

            stubSuccessfulUpload(server);

            this.render();
            component.attrs.update = () => {};
            component.attrs.uploadFinished = uploadFinished;

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadFinished.calledOnce).to.be.true;
                done();
            });
        });

        it('fires uploadFinished action on failed upload', function (done) {
            let component = this.subject();
            let uploadFinished = sinon.spy();
            let file = createFile();

            stubFailedUpload(server);

            this.render();
            component.attrs.update = () => {};
            component.attrs.uploadFinished = uploadFinished;

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(uploadFinished.calledOnce).to.be.true;
                done();
            });
        });

        it('displays invalid file type error', function (done) {
            let component = this.subject();
            let file = createFile();

            stubFailedUpload(server, 415, 'UnsupportedMediaTypeError');

            this.render();
            component.attrs.update = () => {};

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The image type you uploaded is not supported/);
                expect(this.$('.btn-green').length, 'reset button is displayed').to.equal(1);
                expect(this.$('.btn-green').text()).to.equal('Try Again');
                done();
            });
        });

        it('displays file too large for server error', function (done) {
            let component = this.subject();
            let file = createFile();

            stubFailedUpload(server, 413, 'RequestEntityTooLargeError');

            this.render();
            component.attrs.update = () => {};

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The image you uploaded was larger/);
                done();
            });
        });

        it('handles file too large error directly from the web server', function (done) {
            let component = this.subject();
            let file = createFile();

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [413, {}, ''];
            });

            this.render();
            component.attrs.update = () => {};

            run(() => {
                component.send('fileSelected', [file]);
            });

            wait().then(() => {
                expect(this.$('.failed').length, 'error message is displayed').to.equal(1);
                expect(this.$('.failed').text()).to.match(/The image you uploaded was larger/);
                done();
            });
        });

        it('displays other server-side error with message', function (done) {
            let component = this.subject();
            let file = createFile();

            stubFailedUpload(server, 400, 'UnknownError');

            this.render();
            component.attrs.update = () => {};

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
            let component = this.subject();
            let file = createFile();

            server.post('/ghost/api/v0.1/uploads/', function () {
                return [500, {'Content-Type': 'application/json'}, ''];
            });

            this.render();
            component.attrs.update = () => {};

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
            let component = this.subject();
            let file = createFile();

            stubFailedUpload(server, 400, 'UnknownError');

            this.render();
            component.attrs.update = () => {};

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
            let component = this.subject();
            let file = createFile();

            // pretender fires a progress event every 50ms
            stubSuccessfulUpload(server, 150);

            this.render();
            component.attrs.update = () => {};
            component.attrs.uploadFinished = done;

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
            let component = this.subject();
            let file = createFile();
            let update = sinon.spy();
            let drop = Ember.$.Event('drop', {
                dataTransfer: {
                    files: [file]
                }
            });

            stubSuccessfulUpload(server);

            this.render();
            component.attrs.update = update;

            run(() => {
                this.$().trigger(drop);
            });

            wait().then(() => {
                expect(update.calledOnce).to.be.true;
                expect(update.firstCall.args[0]).to.equal('/content/images/test.png');
                done();
            });
        });
    }
);
