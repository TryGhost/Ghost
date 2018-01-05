import Pretender from 'pretender';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import wait from 'ember-test-helpers/wait';
import {click, find, findAll} from 'ember-native-dom-helpers';
import {createFile} from '../../helpers/file-upload';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupComponentTest} from 'ember-mocha';

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

describe('Integration: Component: gh-uploader', function () {
    setupComponentTest('gh-uploader', {
        integration: true
    });

    let server;

    beforeEach(function () {
        server = new Pretender();
    });

    afterEach(function () {
        server.shutdown();
    });

    describe('uploads', function () {
        beforeEach(function () {
            stubSuccessfulUpload(server);
        });

        it('triggers uploads when `files` is set', async function () {
            this.render(hbs`{{#gh-uploader files=files}}{{/gh-uploader}}`);

            this.set('files', [createFile()]);
            await wait();

            let [lastRequest] = server.handledRequests;
            expect(server.handledRequests.length).to.equal(1);
            expect(lastRequest.url).to.equal('/ghost/api/v0.1/uploads/');
            // requestBody is a FormData object
            // this will fail in anything other than Chrome and Firefox
            // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility
            expect(lastRequest.requestBody.has('uploadimage')).to.be.true;
        });

        it('triggers multiple uploads', async function () {
            this.render(hbs`{{#gh-uploader files=files}}{{/gh-uploader}}`);

            this.set('files', [createFile(), createFile()]);
            await wait();

            expect(server.handledRequests.length).to.equal(2);
        });

        it('triggers onStart when upload starts', async function () {
            this.set('uploadStarted', sinon.spy());

            this.render(hbs`{{#gh-uploader files=files onStart=(action uploadStarted)}}{{/gh-uploader}}`);
            this.set('files', [createFile(), createFile()]);
            await wait();

            expect(this.get('uploadStarted').calledOnce).to.be.true;
        });

        it('triggers onUploadSuccess when a file uploads', async function () {
            this.set('fileUploaded', sinon.spy());

            this.render(hbs`{{#gh-uploader files=files onUploadSuccess=(action fileUploaded)}}{{/gh-uploader}}`);
            this.set('files', [createFile(['test'], {name: 'file1.png'}), createFile()]);
            await wait();

            // triggered for each file
            expect(this.get('fileUploaded').calledTwice).to.be.true;

            // filename and url is passed in arg
            let firstCall = this.get('fileUploaded').getCall(0);
            expect(firstCall.args[0].fileName).to.equal('file1.png');
            expect(firstCall.args[0].url).to.equal('/content/images/test.png');
        });

        it('triggers onComplete when all files uploaded', async function () {
            this.set('uploadsFinished', sinon.spy());

            this.render(hbs`{{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await wait();

            expect(this.get('uploadsFinished').calledOnce).to.be.true;

            // array of filenames and urls is passed in arg
            let [result] = this.get('uploadsFinished').getCall(0).args;
            expect(result.length).to.equal(2);
            expect(result[0].fileName).to.equal('file1.png');
            expect(result[0].url).to.equal('/content/images/test.png');
            expect(result[1].fileName).to.equal('file2.png');
            expect(result[1].url).to.equal('/content/images/test.png');
        });

        it('onComplete only passes results for last upload', async function () {
            this.set('uploadsFinished', sinon.spy());

            this.render(hbs`{{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'})
            ]);
            await wait();

            this.set('files', [
                createFile(['test'], {name: 'file2.png'})
            ]);

            await wait();

            let [results] = this.get('uploadsFinished').getCall(1).args;
            expect(results.length).to.equal(1);
            expect(results[0].fileName).to.equal('file2.png');
        });

        it('onComplete returns results in same order as selected', async function () {
            // first request has a delay to simulate larger file
            server.post('/ghost/api/v0.1/uploads/', function () {
                // second request has no delay to simulate small file
                stubSuccessfulUpload(server, 0);

                return [200, {'Content-Type': 'application/json'}, '"/content/images/test.png"'];
            }, 100);

            this.set('uploadsFinished', sinon.spy());

            this.render(hbs`{{#gh-uploader files=files onComplete=(action uploadsFinished)}}{{/gh-uploader}}`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}), // large - finishes last
                createFile(['test'], {name: 'file2.png'}) // small - finishes first
            ]);
            await wait();

            let [results] = this.get('uploadsFinished').getCall(0).args;
            expect(results.length).to.equal(2);
            expect(results[0].fileName).to.equal('file1.png');
        });

        it('doesn\'t allow new files to be set whilst uploading', async function () {
            let errorSpy = sinon.spy(console, 'error');
            stubSuccessfulUpload(server, 100);

            this.render(hbs`{{#gh-uploader files=files}}{{/gh-uploader}}`);
            this.set('files', [createFile()]);

            // logs error because upload is in progress
            run.later(() => {
                this.set('files', [createFile()]);
            }, 50);

            // runs ok because original upload has finished
            run.later(() => {
                this.set('files', [createFile()]);
            }, 200);

            await wait();

            expect(server.handledRequests.length).to.equal(2);
            expect(errorSpy.calledOnce).to.be.true;
            errorSpy.restore();
        });

        it('yields isUploading whilst upload is in progress', async function () {
            stubSuccessfulUpload(server, 200);

            this.render(hbs`
            {{#gh-uploader files=files as |uploader|}}
                {{#if uploader.isUploading}}
                    <div class="is-uploading-test"></div>
                {{/if}}
            {{/gh-uploader}}`);

            this.set('files', [createFile(), createFile()]);

            run.later(() => {
                expect(find('.is-uploading-test')).to.exist;
            }, 100);

            await wait();

            expect(find('.is-uploading-test')).to.not.exist;
        });

        it('yields progressBar component with total upload progress', async function () {
            stubSuccessfulUpload(server, 200);

            this.render(hbs`
            {{#gh-uploader files=files as |uploader|}}
                {{uploader.progressBar}}
            {{/gh-uploader}}`);

            this.set('files', [createFile(), createFile()]);

            run.later(() => {
                expect(find('[data-test-progress-bar]')).to.exist;
                let progressWidth = parseInt(find('[data-test-progress-bar]').style.width);
                expect(progressWidth).to.be.above(0);
                expect(progressWidth).to.be.below(100);
            }, 100);

            await wait();

            let progressWidth = parseInt(find('[data-test-progress-bar]').style.width);
            expect(progressWidth).to.equal(100);
        });

        it('yields files property', function () {
            this.render(hbs`
            {{#gh-uploader files=files as |uploader|}}
                {{#each uploader.files as |file|}}
                    <div class="file">{{file.name}}</div>
                {{/each}}
            {{/gh-uploader}}`);

            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);

            expect(findAll('.file')[0].textContent).to.equal('file1.png');
            expect(findAll('.file')[1].textContent).to.equal('file2.png');
        });

        it('can be cancelled', async function () {
            stubSuccessfulUpload(server, 200);
            this.set('cancelled', sinon.spy());
            this.set('complete', sinon.spy());

            this.render(hbs`
            {{#gh-uploader files=files onCancel=(action cancelled) as |uploader|}}
                <button class="cancel-button" {{action uploader.cancel}}>Cancel</button>
            {{/gh-uploader}}`);

            this.set('files', [createFile()]);

            run.later(() => {
                click('.cancel-button');
            }, 50);

            await wait();

            expect(this.get('cancelled').calledOnce, 'onCancel triggered').to.be.true;
            expect(this.get('complete').notCalled, 'onComplete triggered').to.be.true;
        });

        it('uploads to supplied `uploadUrl`', async function () {
            server.post('/ghost/api/v0.1/images/', function () {
                return [200, {'Content-Type': 'application/json'}, '"/content/images/test.png"'];
            });

            this.render(hbs`{{#gh-uploader files=files uploadUrl="/images/"}}{{/gh-uploader}}`);
            this.set('files', [createFile()]);
            await wait();

            let [lastRequest] = server.handledRequests;
            expect(lastRequest.url).to.equal('/ghost/api/v0.1/images/');
        });

        it('passes supplied paramName in request', async function () {
            this.render(hbs`{{#gh-uploader files=files paramName="testupload"}}{{/gh-uploader}}`);
            this.set('files', [createFile()]);
            await wait();

            let [lastRequest] = server.handledRequests;
            // requestBody is a FormData object
            // this will fail in anything other than Chrome and Firefox
            // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility
            expect(lastRequest.requestBody.has('testupload')).to.be.true;
        });
    });

    describe('validation', function () {
        it('validates file extensions by default', async function () {
            this.set('onFailed', sinon.spy());

            this.render(hbs`
                {{#gh-uploader files=files extensions="jpg,jpeg" onFailed=(action onFailed)}}{{/gh-uploader}}
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await wait();

            let [onFailedResult] = this.get('onFailed').firstCall.args;
            expect(onFailedResult.length).to.equal(1);
            expect(onFailedResult[0].fileName, 'onFailed file name').to.equal('test.png');
            expect(onFailedResult[0].message, 'onFailed message').to.match(/not supported/);
        });

        it('accepts custom validation method', async function () {
            this.set('validate', function (file) {
                return `${file.name} failed test validation`;
            });
            this.set('onFailed', sinon.spy());

            this.render(hbs`
                {{#gh-uploader files=files validate=(action validate) onFailed=(action onFailed)}}{{/gh-uploader}}
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await wait();

            let [onFailedResult] = this.get('onFailed').firstCall.args;
            expect(onFailedResult.length).to.equal(1);
            expect(onFailedResult[0].fileName).to.equal('test.png');
            expect(onFailedResult[0].message).to.equal('test.png failed test validation');
        });

        it('yields errors when validation fails', async function () {
            this.render(hbs`
                {{#gh-uploader files=files extensions="jpg,jpeg" as |uploader|}}
                    {{#each uploader.errors as |error|}}
                        <div class="error-fileName">{{error.fileName}}</div>
                        <div class="error-message">{{error.message}}</div>
                    {{/each}}
                {{/gh-uploader}}
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await wait();

            expect(find('.error-fileName').textContent).to.equal('test.png');
            expect(find('.error-message').textContent).to.match(/not supported/);
        });
    });

    describe('server errors', function () {
        beforeEach(function () {
            stubFailedUpload(server, 500, 'No upload for you');
        });

        it('triggers onFailed when uploads complete', async function () {
            this.set('uploadFailed', sinon.spy());
            this.set('uploadComplete', sinon.spy());

            this.render(hbs`
                {{#gh-uploader
                    files=files
                    onFailed=(action uploadFailed)
                    onComplete=(action uploadComplete)}}
                {{/gh-uploader}}
            `);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await wait();

            expect(this.get('uploadFailed').calledOnce).to.be.true;
            expect(this.get('uploadComplete').calledOnce).to.be.true;

            let [failures] = this.get('uploadFailed').firstCall.args;
            expect(failures.length).to.equal(2);
            expect(failures[0].fileName).to.equal('file1.png');
            expect(failures[0].message).to.equal('Error: No upload for you');
        });

        it('triggers onUploadFailure when each upload fails', async function () {
            this.set('uploadFail', sinon.spy());

            this.render(hbs`
                {{#gh-uploader
                    files=files
                    onUploadFailure=(action uploadFail)}}
                {{/gh-uploader}}
            `);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await wait();

            expect(this.get('uploadFail').calledTwice).to.be.true;

            let [firstFailure] = this.get('uploadFail').firstCall.args;
            expect(firstFailure.fileName).to.equal('file1.png');
            expect(firstFailure.message).to.equal('Error: No upload for you');

            let [secondFailure] = this.get('uploadFail').secondCall.args;
            expect(secondFailure.fileName).to.equal('file2.png');
            expect(secondFailure.message).to.equal('Error: No upload for you');
        });

        it('yields errors when uploads fail', async function () {
            this.render(hbs`
                {{#gh-uploader files=files as |uploader|}}
                    {{#each uploader.errors as |error|}}
                        <div class="error-fileName">{{error.fileName}}</div>
                        <div class="error-message">{{error.message}}</div>
                    {{/each}}
                {{/gh-uploader}}
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await wait();

            expect(find('.error-fileName').textContent).to.equal('test.png');
            expect(find('.error-message').textContent).to.equal('Error: No upload for you');
        });
    });
});
