const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const path = require('path');
const BlogIcon = require('../../../../../core/server/lib/image/blog-icon');

describe('lib/image: blog icon', function () {
    describe('getIconUrl', function () {
        it('custom uploaded ico blog icon', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                urlFor: (key, boolean) => [key, boolean]
            }, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return '/content/images/2017/04/my-icon.ico';
                    }
                }
            }});
            assert.deepEqual(blogIcon.getIconUrl(), [{relativeUrl: '/content/images/2017/04/my-icon.ico'}, undefined]);
        });

        it('custom uploaded png blog icon', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                urlFor: (key, boolean) => [key, boolean]
            }, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return '/content/images/2017/04/my-icon.png';
                    }
                }
            }});
            assert.deepEqual(blogIcon.getIconUrl(), [{relativeUrl: '/content/images/size/w256h256/2017/04/my-icon.png'}, undefined]);
        });

        it('default ico blog icon', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                urlFor: key => key
            }, settingsCache: {
                get: () => {}
            }});
            assert.deepEqual(blogIcon.getIconUrl(), {relativeUrl: '/favicon.ico'});
        });

        describe('absolute URL', function () {
            it('custom uploaded ico blog icon', function () {
                const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                    urlFor: (key, boolean) => [key, boolean]
                }, settingsCache: {
                    get: (key) => {
                        if (key === 'icon') {
                            return '/content/images/2017/04/my-icon.ico';
                        }
                    }
                }});
                assert.deepEqual(blogIcon.getIconUrl({absolute: true}), [{relativeUrl: '/content/images/2017/04/my-icon.ico'}, true]);
            });

            it('custom uploaded png blog icon', function () {
                const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                    urlFor: (key, boolean) => [key, boolean]
                }, settingsCache: {
                    get: (key) => {
                        if (key === 'icon') {
                            return '/content/images/2017/04/my-icon.png';
                        }
                    }
                }});
                assert.deepEqual(blogIcon.getIconUrl({absolute: true}), [{relativeUrl: '/content/images/size/w256h256/2017/04/my-icon.png'}, true]);
            });

            it('default ico blog icon', function () {
                const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                    urlFor: (key, boolean) => [key, boolean]
                }, settingsCache: {
                    get: () => {}
                }});
                assert.deepEqual(blogIcon.getIconUrl({absolute: true}), [{relativeUrl: '/favicon.ico'}, true]);
            });

            it('returns null if no fallback is requested', function () {
                const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {
                    urlFor: (key, boolean) => [key, boolean]
                }, settingsCache: {
                    get: () => {}
                }});

                assert.equal(blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}), null);
            });
        });
    });

    describe('getIconPath', function () {
        it('custom uploaded ico blog icon', function () {
            const stub = sinon.stub();
            const blogIcon = new BlogIcon({config: {}, storageUtils: {
                getLocalImagesStoragePath: stub
            }, urlUtils: {}, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return '/content/images/2017/04/my-icon.ico';
                    }
                }
            }});

            blogIcon.getIconPath();
            assert.equal(stub.calledOnce, true);
        });

        it('custom uploaded png blog icon', function () {
            const stub = sinon.stub();
            const blogIcon = new BlogIcon({config: {}, storageUtils: {
                getLocalImagesStoragePath: stub
            }, urlUtils: {}, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return '/content/images/2017/04/my-icon.png';
                    }
                }
            }});

            blogIcon.getIconPath();
            assert.equal(stub.calledOnce, true);
        });

        it('default ico blog icon', function () {
            const root = '/home/test';
            const blogIcon = new BlogIcon({config: {
                get: (key) => {
                    if (key === 'paths:publicFilePath') {
                        return root;
                    }
                }
            }, storageUtils: {}, urlUtils: {}, settingsCache: {
                get: () => {}
            }});
            assert.equal(blogIcon.getIconPath(), path.join(root, 'favicon.ico'));
        });
    });

    describe('getIconType', function () {
        it('returns x-icon for ico icons', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {}});
            assert.equal(blogIcon.getIconType('favicon.ico'), 'x-icon');
        });

        it('returns png for png icon', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {}});
            assert.equal(blogIcon.getIconType('favicon.png'), 'png');
        });

        it('returns x-icon for ico icons when the icon is cached', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return 'favicon.ico';
                    }
                }
            }});
            assert.equal(blogIcon.getIconType(), 'x-icon');
        });

        it('returns png for png icon when the icon is cached', function () {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {
                get: (key) => {
                    if (key === 'icon') {
                        return 'favicon.png';
                    }
                }
            }});
            assert.equal(blogIcon.getIconType(), 'png');
        });
    });

    describe('getIconDimensions', function () {
        it('[success] returns .ico dimensions', function (done) {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {}});
            blogIcon.getIconDimensions(path.join(__dirname, '../../../../utils/fixtures/images/favicon.ico'))
                .then(function (result) {
                    assertExists(result);
                    assert.deepEqual(result, {
                        width: 48,
                        height: 48
                    });
                    done();
                }).catch(done);
        });

        it('[success] returns .png dimensions', function (done) {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {}});
            blogIcon.getIconDimensions(path.join(__dirname, '../../../../utils/fixtures/images/favicon.png'))
                .then(function (result) {
                    assertExists(result);
                    assert.deepEqual(result, {
                        width: 100,
                        height: 100
                    });
                    done();
                }).catch(done);
        });

        it('[success] returns .ico dimensions for icon with multiple sizes', function (done) {
            const blogIcon = new BlogIcon({config: {}, storageUtils: {}, urlUtils: {}, settingsCache: {}});
            blogIcon.getIconDimensions(path.join(__dirname, '../../../../utils/fixtures/images/favicon_multi_sizes.ico'))
                .then(function (result) {
                    assertExists(result);
                    assert.deepEqual(result, {
                        width: 64,
                        height: 64
                    });
                    done();
                }).catch(done);
        });

        it('[failure] return error message', function (done) {
            const blogIcon = new BlogIcon({config: {}, tpl: key => key
                , storageUtils: {}, urlUtils: {}, settingsCache: {}});

            blogIcon.getIconDimensions(path.join(__dirname, '../../../../utils/fixtures/images/favicon_multi_sizes_FILE_DOES_NOT_EXIST.ico'))
                .catch(function (error) {
                    assertExists(error);
                    assert.equal(error.message, 'Could not fetch icon dimensions.');
                    done();
                });
        });
    });
});
