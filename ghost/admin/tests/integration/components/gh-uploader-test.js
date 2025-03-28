import Pretender from 'pretender';
import ghostPaths from 'ghost-admin/utils/ghost-paths';
import hbs from 'htmlbars-inline-precompile';
import sinon from 'sinon';
import {click, find, findAll, render, settled, waitFor, waitUntil} from '@ember/test-helpers';
import {createFile} from '../../helpers/file-upload';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

const stubSuccessfulUpload = function (server, delay = 0) {
    server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
        return [200, {'Content-Type': 'application/json'}, '{"images": [{"url": "/content/images/test.png"}]}'];
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

describe('Integration: Component: gh-uploader', function () {
    setupRenderingTest();

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
            await render(hbs`<GhUploader @files={{files}}></GhUploader>`);

            this.set('files', [createFile()]);
            await settled();

            let [lastRequest] = server.handledRequests;
            expect(server.handledRequests.length).to.equal(1);
            expect(lastRequest.url).to.equal(`${ghostPaths().apiRoot}/images/upload/`);
            // requestBody is a FormData object
            // this will fail in anything other than Chrome and Firefox
            // https://developer.mozilla.org/en-US/docs/Web/API/FormData#Browser_compatibility
            expect(lastRequest.requestBody.has('file')).to.be.true;
        });

        it('triggers multiple uploads', async function () {
            await render(hbs`<GhUploader @files={{files}}></GhUploader>`);

            this.set('files', [createFile(), createFile()]);
            await settled();

            expect(server.handledRequests.length).to.equal(2);
        });

        it('triggers onStart when upload starts', async function () {
            this.set('uploadStarted', sinon.spy());

            await render(hbs`<GhUploader @files={{files}} @onStart={{this.uploadStarted}}></GhUploader>`);
            this.set('files', [createFile(), createFile()]);
            await settled();

            expect(this.uploadStarted.calledOnce).to.be.true;
        });

        it('triggers onUploadSuccess when a file uploads', async function () {
            this.set('fileUploaded', sinon.spy());

            await render(hbs`<GhUploader @files={{files}} @onUploadSuccess={{this.fileUploaded}}></GhUploader>`);
            this.set('files', [createFile(['test'], {name: 'file1.png'}), createFile()]);
            await settled();

            // triggered for each file
            expect(this.fileUploaded.calledTwice).to.be.true;

            // filename and url is passed in arg
            let firstCall = this.fileUploaded.getCall(0);
            expect(firstCall.args[0].fileName).to.equal('file1.png');
            expect(firstCall.args[0].url).to.equal('/content/images/test.png');
        });

        it('triggers onComplete when all files uploaded', async function () {
            this.set('uploadsFinished', sinon.spy());

            await render(hbs`<GhUploader @files={{files}} @onComplete={{this.uploadsFinished}}></GhUploader>`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await settled();

            expect(this.uploadsFinished.calledOnce).to.be.true;

            // array of filenames and urls is passed in arg
            let [result] = this.uploadsFinished.getCall(0).args;
            expect(result.length).to.equal(2);
            expect(result[0].fileName).to.equal('file1.png');
            expect(result[0].url).to.equal('/content/images/test.png');
            expect(result[1].fileName).to.equal('file2.png');
            expect(result[1].url).to.equal('/content/images/test.png');
        });

        it('onComplete only passes results for last upload', async function () {
            this.set('uploadsFinished', sinon.spy());

            await render(hbs`<GhUploader @files={{files}} @onComplete={{this.uploadsFinished}}></GhUploader>`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'})
            ]);
            await settled();

            this.set('files', [
                createFile(['test'], {name: 'file2.png'})
            ]);

            await settled();

            let [results] = this.uploadsFinished.getCall(1).args;
            expect(results.length).to.equal(1);
            expect(results[0].fileName).to.equal('file2.png');
        });

        it('onComplete returns results in same order as selected', async function () {
            // first request has a delay to simulate larger file
            server.post(`${ghostPaths().apiRoot}/images/upload/`, function () {
                // second request has no delay to simulate small file
                stubSuccessfulUpload(server, 0);

                return [200, {'Content-Type': 'application/json'}, '"/content/images/test.png"'];
            }, 100);

            this.set('uploadsFinished', sinon.spy());

            await render(hbs`<GhUploader @files={{files}} @onComplete={{this.uploadsFinished}}></GhUploader>`);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}), // large - finishes last
                createFile(['test'], {name: 'file2.png'}) // small - finishes first
            ]);
            await settled();

            let [results] = this.uploadsFinished.getCall(0).args;
            expect(results.length).to.equal(2);
            expect(results[0].fileName).to.equal('file1.png');
        });

        it('doesn\'t allow new files to be set whilst uploading', async function () {
            let errorSpy = sinon.spy(console, 'error');
            stubSuccessfulUpload(server, 100);

            await render(hbs`<GhUploader @files={{files}}></GhUploader>`);
            this.set('files', [createFile()]);

            // logs error because upload is in progress
            this.set('files', [createFile()]);

            await settled();

            // runs ok because original upload has finished
            this.set('files', [createFile()]);

            await settled();

            expect(server.handledRequests.length).to.equal(2);
            expect(errorSpy.calledOnce).to.be.true;
            errorSpy.restore();
        });

        it('yields isUploading whilst upload is in progress', async function () {
            stubSuccessfulUpload(server, 100);

            await render(hbs`
            <GhUploader @files={{files}} as |uploader|>
                {{#if uploader.isUploading}}
                    <div class="is-uploading-test"></div>
                {{/if}}
            </GhUploader>`);

            this.set('files', [createFile(), createFile()]);

            await waitFor('.is-uploading-test', {timeout: 150});
            await settled();

            expect(find('.is-uploading-test')).to.not.exist;
        });

        it('yields progressBar component with total upload progress', async function () {
            stubSuccessfulUpload(server, 100);

            await render(hbs`
            <GhUploader @files={{files}} as |uploader|>
                {{uploader.progressBar}}
            </GhUploader>`);

            this.set('files', [createFile(), createFile()]);

            await waitFor('[data-test-progress-bar]', {timeout: 150});
            let progressBar = find('[data-test-progress-bar]');
            await waitUntil(() => {
                let width = parseInt(progressBar.style.width);
                return width > 50;
            }, {timeout: 150});
            await settled();

            let finalProgressWidth = parseInt(find('[data-test-progress-bar]').style.width);
            expect(finalProgressWidth, 'final progress width').to.equal(100);
        });

        it('yields files property', async function () {
            await render(hbs`
            <GhUploader @files={{files}} as |uploader|>
                {{#each uploader.files as |file|}}
                    <div class="file">{{file.name}}</div>
                {{/each}}
            </GhUploader>`);

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

            await render(hbs`
            <GhUploader @files={{files}} @onCancel={{this.cancelled}} as |uploader|>
                {{#if uploader.isUploading}}
                    <button class="cancel-button" type="button" {{on "click" uploader.cancel}}>Cancel</button>
                {{/if}}
            </GhUploader>`);

            this.set('files', [createFile()]);

            await waitFor('.cancel-button');
            await click('.cancel-button');

            expect(this.cancelled.calledOnce, 'onCancel triggered').to.be.true;
            expect(this.complete.notCalled, 'onComplete triggered').to.be.true;
        });

        it('uploads to supplied `uploadUrl`', async function () {
            server.post(`${ghostPaths().apiRoot}/images/`, function () {
                return [200, {'Content-Type': 'application/json'}, '{"images": [{"url": "/content/images/test.png"}]'];
            });

            await render(hbs`<GhUploader @files={{files}} @uploadUrl="/images/"></GhUploader>`);
            this.set('files', [createFile()]);
            await settled();

            let [lastRequest] = server.handledRequests;
            expect(lastRequest.url).to.equal(`${ghostPaths().apiRoot}/images/`);
        });

        it('passes supplied paramName in request', async function () {
            await render(hbs`<GhUploader @files={{files}} @paramName="testupload"></GhUploader>`);
            this.set('files', [createFile()]);
            await settled();

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

            await render(hbs`
                <GhUploader @files={{files}} @extensions="jpg,jpeg" @onFailed={{this.onFailed}}></GhUploader>
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await settled();

            let [onFailedResult] = this.onFailed.firstCall.args;
            expect(onFailedResult.length).to.equal(1);
            expect(onFailedResult[0].fileName, 'onFailed file name').to.equal('test.png');
            expect(onFailedResult[0].message, 'onFailed message').to.match(/not supported/);
        });

        it('accepts custom validation method', async function () {
            this.set('validate', function (file) {
                return `${file.name} failed test validation`;
            });
            this.set('onFailed', sinon.spy());

            await render(hbs`
                <GhUploader @files={{files}} @validate={{this.validate}} @onFailed={{this.onFailed}}></GhUploader>
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await settled();

            let [onFailedResult] = this.onFailed.firstCall.args;
            expect(onFailedResult.length).to.equal(1);
            expect(onFailedResult[0].fileName).to.equal('test.png');
            expect(onFailedResult[0].message).to.equal('test.png failed test validation');
        });

        it('yields errors when validation fails', async function () {
            await render(hbs`
                <GhUploader @files={{files}} @extensions="jpg,jpeg" as |uploader|>
                    {{#each uploader.errors as |error|}}
                        <div class="error-fileName">{{error.fileName}}</div>
                        <div class="error-message">{{error.message}}</div>
                    {{/each}}
                </GhUploader>
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await settled();

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

            await render(hbs`
                <GhUploader @files={{files}} @onFailed={{this.uploadFailed}} @onComplete={{this.uploadComplete}}>
                </GhUploader>
            `);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await settled();

            expect(this.uploadFailed.calledOnce).to.be.true;
            expect(this.uploadComplete.calledOnce).to.be.true;

            let [failures] = this.uploadFailed.firstCall.args;
            expect(failures.length).to.equal(2);
            expect(failures[0].fileName).to.equal('file1.png');
            expect(failures[0].message).to.equal('Error: No upload for you');
        });

        it('triggers onUploadFailure when each upload fails', async function () {
            this.set('uploadFail', sinon.spy());

            await render(hbs`
                <GhUploader @files={{files}} @onUploadFailure={{this.uploadFail}}>
                </GhUploader>
            `);
            this.set('files', [
                createFile(['test'], {name: 'file1.png'}),
                createFile(['test'], {name: 'file2.png'})
            ]);
            await settled();

            expect(this.uploadFail.calledTwice).to.be.true;

            let [firstFailure] = this.uploadFail.firstCall.args;
            expect(firstFailure.fileName).to.equal('file1.png');
            expect(firstFailure.message).to.equal('Error: No upload for you');

            let [secondFailure] = this.uploadFail.secondCall.args;
            expect(secondFailure.fileName).to.equal('file2.png');
            expect(secondFailure.message).to.equal('Error: No upload for you');
        });

        it('yields errors when uploads fail', async function () {
            await render(hbs`
                <GhUploader @files={{files}} as |uploader|>
                    {{#each uploader.errors as |error|}}
                        <div class="error-fileName">{{error.fileName}}</div>
                        <div class="error-message">{{error.message}}</div>
                    {{/each}}
                </GhUploader>
            `);
            this.set('files', [createFile(['test'], {name: 'test.png'})]);
            await settled();

            expect(find('.error-fileName').textContent).to.equal('test.png');
            expect(find('.error-message').textContent).to.equal('Error: No upload for you');
        });
    });
});
