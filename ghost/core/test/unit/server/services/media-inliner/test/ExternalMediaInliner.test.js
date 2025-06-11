const assert = require('assert/strict');
const fs = require('fs');
const sinon = require('sinon');
const nock = require('nock');
const path = require('path');
const loggingLib = require('@tryghost/logging');
const ExternalMediaInliner = require('../../../../../../core/server/services/media-inliner/ExternalMediaInliner');

describe('ExternalMediaInliner', function () {
    let logging;
    let ghostLogoPng;
    let exeFile;
    let GIF1x1;
    let postModelStub;
    let postMetaModelStub;
    let tagModelStub;
    let userModelStub;

    beforeEach(function () {
        // use a 1x1 gif in nock responses because it's really small and easy to work with
        ghostLogoPng = fs.readFileSync(path.join(__dirname, 'fixtures', 'ghost-logo.png'));
        exeFile = fs.readFileSync(path.join(__dirname, 'fixtures', 'fixture.exe'));
        GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');
        logging = {
            info: sinon.stub(loggingLib, 'info'),
            error: sinon.stub(loggingLib, 'error'),
            warn: sinon.stub(loggingLib, 'warn')
        };

        postModelStub = {
            findAll: sinon.stub().resolves([]),
            edit: sinon.stub().resolves()
        };
        postMetaModelStub = {
            findPage: sinon.stub().resolves({
                data: []
            }),
            edit: sinon.stub().resolves()
        };
        tagModelStub = {
            findPage: sinon.stub().resolves({
                data: []
            }),
            edit: sinon.stub().resolves()
        };
        userModelStub = {
            findPage: sinon.stub().resolves({
                data: []
            }),
            edit: sinon.stub().resolves()
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

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
            postStub.withArgs('lexical').returns(null);

            const postModelInstanceStub = {
                id: 'inlined-post-id',
                get: postStub
            };
            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.ok(postModelStub.edit.calledWith({
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-image.jpg"}]]}'
            }, {
                id: 'inlined-post-id',
                context: {
                    internal: true
                }
            }));
        });

        it('inlines the image from post\'s mobiledoc containing html card', async function () {
            const imageURL = 'https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com/public/images/39719fcb-5af0-4764-bf8b-d375f37a09e5_1141x860';
            const requestMock = nock('https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com')
                .get('/public/images/39719fcb-5af0-4764-bf8b-d375f37a09e5_1141x860')
                .reply(200, GIF1x1);

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(`{"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<img src="${imageURL}" alt="Lorem ipsum">"}]],"markups":[],"sections":[[10,0],[1,"p",[]]],"ghostVersion":"4.0"}`);
            postStub.withArgs('lexical').returns(null);

            const postModelInstanceStub = {
                id: 'inlined-post-with-htmlcard-id',
                get: postStub
            };

            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://bucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.deepEqual(postModelStub.edit.args[0][0], {
                mobiledoc: `{"version":"0.3.1","atoms":[],"cards":[["html",{"html":"<img src="__GHOST_URL__/content/images/unique-image.jpg" alt="Lorem ipsum">"}]],"markups":[],"sections":[[10,0],[1,"p",[]]],"ghostVersion":"4.0"}`
            });
            assert.deepEqual(postModelStub.edit.args[0][1], {
                id: 'inlined-post-with-htmlcard-id',
                context: {
                    internal: true
                }
            });
        });

        it('inlines image in the post\'s lexical content', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1);

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(null);
            postStub.withArgs('lexical').returns(`{"root":{"children":[{"type":"image","version":1,"src":"${imageURL}","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`);

            const postModelInstanceStub = {
                id: 'inlined-post-id',
                get: postStub
            };
            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.ok(postModelStub.edit.calledWith({
                lexical: '{"root":{"children":[{"type":"image","version":1,"src":"__GHOST_URL__/content/images/unique-image.jpg","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
            }, {
                id: 'inlined-post-id',
                context: {
                    internal: true
                }
            }));
        });

        it('inlines the image from post\'s lexical containing html card', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1);

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(null);
            postStub.withArgs('lexical').returns(`{"root":{"children":[{"type":"html","version":1,"html":"<img src="${imageURL}" alt="Lorem ipsum">"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`);

            const postModelInstanceStub = {
                id: 'inlined-post-with-htmlcard-id',
                get: postStub
            };

            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.deepEqual(postModelStub.edit.args[0][0], {
                lexical: `{"root":{"children":[{"type":"html","version":1,"html":"<img src="__GHOST_URL__/content/images/unique-image.jpg" alt="Lorem ipsum">"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`
            });
            assert.deepEqual(postModelStub.edit.args[0][1], {
                id: 'inlined-post-with-htmlcard-id',
                context: {
                    internal: true
                }
            });
        });

        it('inlines srcset images in a lexical html card', async function () {
            const requestMock = nock('https://example.com')
                .get('/path/to/landscape-1x.jpg')
                .reply(200, GIF1x1)
                .get('/path/to/landscape-2x.jpg')
                .reply(200, GIF1x1)
                .get('/path/to/landscape-original.jpg')
                .reply(200, GIF1x1);

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(null);
            postStub.withArgs('lexical').returns(`{"root":{"children":[{"type":"html","version":1,"html":"<img srcset="https://example.com/path/to/landscape-1x.jpg, https://example.com/path/to/landscape-2x.jpg 2x" src="https://example.com/path/to/landscape-original.jpg" />"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`);

            const postModelInstanceStub = {
                id: 'inlined-post-with-htmlcard-id',
                get: postStub
            };

            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://example.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            // NOTE: The file names all being the same as a limitation in how this is stubbed. In production, each image is unique
            assert.deepEqual(postModelStub.edit.args[0][0], {
                lexical: `{"root":{"children":[{"type":"html","version":1,"html":"<img srcset="__GHOST_URL__/content/images/unique-image.jpg, __GHOST_URL__/content/images/unique-image.jpg 2x" src="__GHOST_URL__/content/images/unique-image.jpg" />"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`
            });
            assert.deepEqual(postModelStub.edit.args[0][1], {
                id: 'inlined-post-with-htmlcard-id',
                context: {
                    internal: true
                }
            });
        });

        it('inlines image in the post\'s mobiledoc & lexical content', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1)
                .get('/files/f/image.jpg')
                .reply(200, GIF1x1);

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
            postStub.withArgs('lexical').returns(`{"root":{"children":[{"type":"image","version":1,"src":"${imageURL}","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}`);

            const postModelInstanceStub = {
                id: 'inlined-post-id',
                get: postStub
            };
            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };

            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.ok(postModelStub.edit.calledWith({
                mobiledoc: '{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"__GHOST_URL__/content/images/unique-image.jpg"}]]}',
                lexical: '{"root":{"children":[{"type":"image","version":1,"src":"__GHOST_URL__/content/images/unique-image.jpg","width":1480,"height":486,"title":"","alt":"","caption":"","cardWidth":"regular","href":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}'
            }, {
                id: 'inlined-post-id',
                context: {
                    internal: true
                }
            }));
        });

        it('logs an error when fetching an external media fails', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/image.jpg')
                .reply(404);
            const postModelInstanceStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`)
            };

            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub])
            };

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.equal(logging.error.args[0][0], 'Error downloading remote media: https://img.stockfresh.com/files/f/image.jpg');
        });

        it('logs an error when fetching an external media for simple fields fails', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/simple-image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/simple-image.jpg')
                .reply(500);
            const userModelInstanceStub = {
                id: 'inlined-user-id',
                get: sinon.stub()
                    .withArgs('profile_image')
                    .returns(imageURL)
            };

            userModelStub = {
                findPage: sinon.stub().returns({
                    data: [userModelInstanceStub]
                })
            };

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.equal(logging.error.args[0][0], 'Error downloading remote media: https://img.stockfresh.com/files/f/simple-image.jpg');
        });

        it('logs a warning when no suitable storage adapter found for inlined media extension', async function () {
            const fileURL = 'https://img.stockfresh.com/files/f/inlined.exe';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/inlined.exe')
                .reply(200, exeFile);

            const postModelInstanceStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('mobiledoc')
                    .returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${fileURL}"}]]}`)
            };
            postModelStub = {
                findAll: sinon.stub().returns([postModelInstanceStub]),
                edit: sinon.stub().resolves()
            };
            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
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

            const postStub = sinon.stub();
            postStub.withArgs('mobiledoc').returns(`{"version":"0.3.1","atoms":[],"cards":[["image",{"src":"${imageURL}"}]]}`);
            postStub.withArgs('lexical').returns(null);

            postModelStub = {
                id: 'errored-post-id',
                get: postStub
            };
            postModelStub = {
                findAll: sinon.stub().returns([postModelStub]),
                edit: sinon.stub().throws(new Error('Error saving the post'))
            };
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelStub.edit.calledOnce);
            assert.equal(logging.error.args[0][0], 'Error inlining media for post: errored-post-id');
        });

        it('logs an error when handling tag simple fields inlining throws an error', async function (){
            const imageURL = 'https://img.stockfresh.com/files/f/simple-image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/simple-image.jpg')
                .reply(200, GIF1x1);

            const getMethodStub = sinon.stub();
            getMethodStub.withArgs('feature_image').returns(imageURL);
            getMethodStub.withArgs('og_image').returns(null);
            getMethodStub.withArgs('twitter_image').returns(null);

            const tagModelInstanceStub = {
                id: 'errored-tag-id',
                get: getMethodStub
            };
            tagModelStub.findPage = sinon.stub().returns({
                data: [tagModelInstanceStub]
            });
            tagModelStub.edit = sinon.stub().throws(new Error('Error saving the tag'));
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-image.jpg')
                .returns('unique-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-image.jpg',
                    saveRaw: () => '/content/images/unique-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(tagModelStub.edit.calledOnce);
            assert.equal(logging.error.args[0][0], 'Error inlining media for: errored-tag-id');
        });

        it('inlines image in the post\'s feature_image field', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/posts_feature_image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/posts_feature_image.jpg')
                .reply(200, GIF1x1);

            postModelStub = {
                id: 'inlined-post-id',
                get: sinon.stub()
                    .withArgs('feature_image')
                    .returns(imageURL)
            };
            const postModelMock = {
                findAll: sinon.stub().returns([postModelStub]),
                edit: sinon.stub().resolves()
            };
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-feature-image.jpg')
                .returns('unique-feature-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelMock,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-feature-image.jpg',
                    saveRaw: () => '/content/images/unique-feature-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postModelMock.edit.calledOnce);
            assert.ok(postModelMock.edit.calledWith({
                feature_image: '__GHOST_URL__/content/images/unique-feature-image.jpg'
            }, {
                id: 'inlined-post-id',
                context: {
                    internal: true
                }
            }));
        });

        it('inlines og_image image in posts_meta table', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/posts_meta_image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/posts_meta_image.jpg')
                .reply(200, GIF1x1);

            const getMethodStub = sinon.stub();
            getMethodStub.withArgs('og_image').returns(imageURL);
            getMethodStub.withArgs('twitter_image').returns(null);
            const postsMetaModelInstanceStub = {
                id: 'inlined-post-meta-id',
                get: getMethodStub
            };

            postMetaModelStub.findPage = sinon.stub().resolves({
                data: [postsMetaModelInstanceStub]
            });
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-feature-image.jpg')
                .returns('unique-feature-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-posts-meta-image.jpg',
                    saveRaw: () => '/content/images/unique-posts-meta-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(postMetaModelStub.edit.calledOnce);
            assert.deepEqual(postMetaModelStub.edit.args[0][0], {
                og_image: '__GHOST_URL__/content/images/unique-posts-meta-image.jpg'
            });
            assert.deepEqual(postMetaModelStub.edit.args[0][1], {
                id: 'inlined-post-meta-id',
                context: {
                    internal: true
                }
            });
        });

        it('inlines twitter_image image in tags table', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/tag_twitter_image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/tag_twitter_image.jpg')
                .reply(200, GIF1x1);

            const getMethodStub = sinon.stub();
            getMethodStub.withArgs('twitter_image').returns(imageURL);
            getMethodStub.returns(null);
            const tagModelInstanceStub = {
                id: 'inlined-tag-id',
                get: getMethodStub
            };

            tagModelStub.findPage = sinon.stub().resolves({
                data: [tagModelInstanceStub]
            });
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/unique-tag-twitter-image.jpg')
                .returns('unique-tag-twitter-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/unique-tag-twitter-image.jpg',
                    saveRaw: () => '/content/images/unique-tag-twitter-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(tagModelStub.edit.calledOnce);
            assert.deepEqual(tagModelStub.edit.args[0][0], {
                twitter_image: '__GHOST_URL__/content/images/unique-tag-twitter-image.jpg'
            });
            assert.deepEqual(tagModelStub.edit.args[0][1], {
                id: 'inlined-tag-id',
                context: {
                    internal: true
                }
            });
        });

        it('inlines cover_image image in users table', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/user_cover_image.jpg';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/user_cover_image.jpg')
                .reply(200, GIF1x1);

            const getMethodStub = sinon.stub();
            getMethodStub.withArgs('cover_image').returns(imageURL);
            getMethodStub.returns(null);
            const userModelInstanceStub = {
                id: 'inlined-user-id',
                get: getMethodStub
            };

            userModelStub.findPage = sinon.stub().resolves({
                data: [userModelInstanceStub]
            });
            sinon.stub(path, 'relative')
                .withArgs('/content/images', '/content/images/user-cover-image.jpg')
                .returns('user-cover-image.jpg');

            const inliner = new ExternalMediaInliner({
                PostModel: postModelStub,
                PostMetaModel: postMetaModelStub,
                TagModel: tagModelStub,
                UserModel: userModelStub,
                getMediaStorage: sinon.stub().withArgs('.jpg').returns({
                    getTargetDir: () => '/content/images',
                    getUniqueFileName: () => '/content/images/user-cover-image.jpg',
                    saveRaw: () => '/content/images/user-cover-image.jpg'
                })
            });

            await inliner.inline(['https://img.stockfresh.com']);

            assert.ok(requestMock.isDone());
            assert.ok(userModelStub.edit.calledOnce);
            assert.deepEqual(userModelStub.edit.args[0][0], {
                cover_image: '__GHOST_URL__/content/images/user-cover-image.jpg'
            });
            assert.deepEqual(userModelStub.edit.args[0][1], {
                id: 'inlined-user-id',
                context: {
                    internal: true
                }
            });
        });
    });

    describe('Special URL & file type handling', function () {
        it('Handles URLs with quotes', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo’s-cool.png';
            const requestMock = nock('https://img.stockfresh.com')
                .get(encodeURI('/files/f/ghost-logo’s-cool.png'))
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost-logos-cool.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with spaces', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/ghost logo with spaces.png';
            const requestMock = nock('https://img.stockfresh.com')
                .get(encodeURI('/files/f/ghost logo with spaces.png'))
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost-logo-with-spaces.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with no extension', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/ghost-logo')
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost-logo.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with unicode characters', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/你好.png';
            const requestMock = nock('https://img.stockfresh.com')
                .get(encodeURI('/files/f/你好.png'))
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ni-hao.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with no scheme', async function () {
            const imageURL = '//img.stockfresh.com/files/f/ghost-logo.png';
            const requestMock = nock('http://img.stockfresh.com')
                .get('/files/f/ghost-logo.png')
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost-logo.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with query params', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/ghost-logo.png?version=1&size=large';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/ghost-logo.png?version=1&size=large')
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost-logo-version-1-size-large.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles URLs with duplicated characters', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/ghost---logo.png';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/ghost---logo.png')
                .reply(200, ghostLogoPng);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'ghost---logo.png');
            assert.equal(fileData.extension, '.png');
        });

        it('Handles falling back to `content-type` for type', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/photo.gif?v=1&s=2';
            const requestMock = nock('https://img.stockfresh.com')
                .defaultReplyHeaders({
                    'content-type': 'image/gif'
                })
                .get('/files/f/photo.gif?v=1&s=2')
                .reply(200);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'photo-v-1-s-2.gif');
            assert.equal(fileData.extension, '.gif');
        });

        it('Handles falling back to file path for type', async function () {
            const imageURL = 'https://img.stockfresh.com/files/f/photo.gif?v=1&s=2';
            const requestMock = nock('https://img.stockfresh.com')
                .get('/files/f/photo.gif?v=1&s=2')
                .reply(200);

            const inliner = new ExternalMediaInliner({});
            const response = await inliner.getRemoteMedia(imageURL);
            const fileData = await inliner.extractFileDataFromResponse(imageURL, response);

            assert.ok(requestMock.isDone());
            assert.equal(fileData.filename, 'photo-v-1-s-2.gif');
            assert.equal(fileData.extension, '.gif');
        });
    });

    describe('Find matches', function () {
        it('Finds with full domain', function () {
            const html = '<img src="https://example.com/image.jpg" /><img src="https://anotherexample.com/image.jpg" />';
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image.jpg');
        });

        it('Finds with full domain, http and https', function () {
            const html = '<img src="http://example.com/image.jpg" /><img src="https://example.com/another-image.jpg" />';
            const matches = ExternalMediaInliner.findMatches(html, 'https?://example.com');

            assert.equal(matches.length, 2);
            assert.equal(matches[0], 'http://example.com/image.jpg');
            assert.equal(matches[1], 'https://example.com/another-image.jpg');
        });

        it('Finds in with comma in string', function () {
            const html = `<img src="https://example.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7303a336-fa0e-4377-9378-123456abcdef_640x640.png
" />`;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/fetch/f_auto,q_auto:good,fl_progressive:steep/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F7303a336-fa0e-4377-9378-123456abcdef_640x640.png');
        });

        it('Finds when seperatd by a comma', function () {
            const html = `<img srcsct="https://example.com/image/fetch,one.png 1x, https://example.com/image/fetch,two.png 2x,https://example.com/image/fetch,three.png 3x" />`;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 3);
            assert.equal(matches[0], 'https://example.com/image/fetch,one.png');
            assert.equal(matches[1], 'https://example.com/image/fetch,two.png');
            assert.equal(matches[2], 'https://example.com/image/fetch,three.png');
        });

        it('Finds with parenthesis terminator', function () {
            const html = `(https://example.com/image/one.png)`;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });

        it('Finds with apostrophe terminator', function () {
            const html = `'https://example.com/image/one.png'`;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });

        it('Finds with space terminator', function () {
            const html = ` https://example.com/image/one.png `;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });

        it('Finds with less than terminator', function () {
            const html = ` https://example.com/image/one.png<`;
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });

        it('Finds with encoded &quot; terminator', function () {
            const html = '&quot;https://example.com/image/one.png&quot;';
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });

        it('Finds end of string terminator', function () {
            const html = 'https://example.com/image/one.png';
            const matches = ExternalMediaInliner.findMatches(html, 'https://example.com');

            assert.equal(matches.length, 1);
            assert.equal(matches[0], 'https://example.com/image/one.png');
        });
    });
});
