const assert = require('assert');
const sinon = require('sinon');
const nock = require('nock');
const loggingLib = require('@tryghost/logging');
const ExternalMediaInliner = require('../index');

describe('ExternalMediaInliner', function () {
    let logging;
    let GIF1x1;

    beforeEach(function () {
        // use a 1x1 gif in nock responses because it's really small and easy to work with
        GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
        logging = {
            info: sinon.stub(loggingLib, 'info'),
            error: sinon.stub(loggingLib, 'error'),
            warn: sinon.stub(loggingLib, 'warn')
        };
    });

    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    it('Creates an External Media Inliner instance', function () {
        assert.ok(new ExternalMediaInliner({}));
    });

    describe('inline', function () {
        it('inlines image in the post\'s mobiledoc content', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1);

            const postModelStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`)
            };
            const postModelMock = {
                findPage: sinon.stub().returns({
                    data: [postModelStub]
                }),
                edit: sinon.stub().resolves()
            };
            const inliner = new ExternalMediaInliner({
                PostModel: postModelMock,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelMock.edit.calledOnce);
            assert.ok(postModelMock.edit.calledWith({
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-image.jpg"}]]}'
            }, {
                id: 'inlined-post-id'
            }));
        });

        it('logs an error when fetching an external media fails', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(404);
            const postModelStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`)
            };

            const postModelMock = {
                findPage: sinon.stub().returns({
                    data: [postModelStub]
                })
            };

            const inliner = new ExternalMediaInliner({
                PostModel: postModelMock
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(logging.error.calledTwice);
            assert.equal(logging.error.args[0][0], 'Error downloading remote media: https://img.stockfresh.com/files/f/image.jpg');
        });

        it('logs a warning when no suitable storage adapter found for inlined media extension', async function () {
            const fileURL = 'https://img.stockfresh.com/files/f/inlined.exe';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/inlined.exe')
                .reply(200, GIF1x1);

            const postModelStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${fileURL}"}]]}`)
            };
            const postModelMock = {
                findPage: sinon.stub().returns({
                    data: [postModelStub]
                }),
                edit: sinon.stub().resolves()
            };
            const inliner = new ExternalMediaInliner({
                PostModel: postModelMock,
                getMediaStorage: sinon.stub().withArgs('.exe').returns(null)
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(logging.warn.calledOnce);
            assert.equal(logging.warn.args[0][0], 'No storage adapter found for file extension: .exe');
        });

        it('logs an error when handling post inlining throws an error', async function (){
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1);

            const postModelStub = {
                id: 'errored-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`)
            };
            const postModelMock = {
                findPage: sinon.stub().returns({
                    data: [postModelStub]
                }),
                edit: sinon.stub().throws(new Error('Error saving the post'))
            };
            const inliner = new ExternalMediaInliner({
                PostModel: postModelMock,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelMock.edit.calledOnce);
            assert.ok(logging.error.calledTwice);
            assert.equal(logging.error.args[0][0], 'Error inlining media for post: errored-post-id');
        });
    });
});
