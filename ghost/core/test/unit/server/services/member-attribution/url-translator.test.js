const assert = require('node:assert/strict');

const UrlTranslator = require('../../../../../core/server/services/member-attribution/url-translator');

const models = {
    Post: {
        findOne({id}) {
            if (id === 'invalid') {
                return null;
            }
            return {id: 'post_id', get: () => 'Title'};
        }
    },
    User: {
        findOne({id}) {
            if (id === 'invalid') {
                return null;
            }
            return {id: 'user_id', get: () => 'Title'};
        }
    },
    Tag: {
        findOne({id}) {
            if (id === 'invalid') {
                return null;
            }
            return {id: 'tag_id', get: () => 'Title'};
        }
    }
};

describe('UrlTranslator', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new UrlTranslator({});
        });
    });

    describe('getResourceDetails', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlUtils: {
                    relativeToAbsolute: (t) => {
                        return 'https://absolute' + t;
                    },
                    absoluteToRelative: (t) => {
                        return t.replace('https://absolute/with-subdirectory', '').replace('https://absolute', '');
                    }
                },
                urlService: {
                    getUrlByResourceId: (id) => {
                        return '/path/' + id;
                    },
                    getResource: (path) => {
                        switch (path) {
                        case '/path/post': return {
                            config: {type: 'posts'},
                            data: {id: 'post'}
                        };
                        case '/path/tag': return {
                            config: {type: 'tags'},
                            data: {id: 'tag'}
                        };
                        case '/path/page': return {
                            config: {type: 'pages'},
                            data: {id: 'page'}
                        };
                        case '/path/author': return {
                            config: {type: 'authors'},
                            data: {id: 'author'}
                        };
                        }
                    }
                },
                models
            });
        });

        it('skips items without path and type', async function () {
            assert.equal(await translator.getResourceDetails({time: 123}), null);
        });

        it('returns posts for explicit items', async function () {
            assert.deepEqual(await translator.getResourceDetails({id: 'my-post', type: 'post', time: 123}), {
                type: 'post',
                id: 'my-post',
                url: '/path/my-post'
            });
        });

        it('returns null if explicit resource not found', async function () {
            assert.equal(await translator.getResourceDetails({id: 'invalid', type: 'post', time: 123}), null);
        });

        it('returns null for invalid item', async function () {
            assert.equal(await translator.getResourceDetails({time: 123}), null);
        });

        it('returns url type if no path not matching a resource', async function () {
            assert.deepEqual(await translator.getResourceDetails({path: '/test', time: 123}), {
                type: 'url',
                id: null,
                url: '/test'
            });
        });

        it('strips subdirectory for url types', async function () {
            assert.deepEqual(await translator.getResourceDetails({path: '/with-subdirectory/test', time: 123}), {
                type: 'url',
                id: null,
                url: '/test'
            });
        });

        it('returns post type if matching resource', async function () {
            assert.deepEqual(await translator.getResourceDetails({path: '/with-subdirectory/path/post', time: 123}), {
                type: 'post',
                id: 'post',
                url: '/path/post'
            });
        });

        it('returns page type if matching resource', async function () {
            assert.deepEqual(await translator.getResourceDetails({path: '/with-subdirectory/path/page', time: 123}), {
                type: 'page',
                id: 'page',
                url: '/path/page'
            });
        });
    });

    describe('getUrlTitle', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({});
        });

        it('returns homepage', function () {
            assert.equal(translator.getUrlTitle('/'), 'homepage');
        });

        it('returns url', function () {
            assert.equal(translator.getUrlTitle('/url'), '/url');
        });
    });

    describe('getTypeAndIdFromPath', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlService: {
                    getResource: (path) => {
                        switch (path) {
                        case '/post': return {
                            config: {type: 'posts'},
                            data: {id: 'post'}
                        };
                        case '/tag': return {
                            config: {type: 'tags'},
                            data: {id: 'tag'}
                        };
                        case '/page': return {
                            config: {type: 'pages'},
                            data: {id: 'page'}
                        };
                        case '/author': return {
                            config: {type: 'authors'},
                            data: {id: 'author'}
                        };
                        }
                    }
                }
            });
        });

        it('returns posts', function () {
            assert.deepEqual(translator.getTypeAndIdFromPath('/post'), {
                type: 'post',
                id: 'post'
            });
        });

        it('returns pages', function () {
            assert.deepEqual(translator.getTypeAndIdFromPath('/page'), {
                type: 'page',
                id: 'page'
            });
        });

        it('returns authors', function () {
            assert.deepEqual(translator.getTypeAndIdFromPath('/author'), {
                type: 'author',
                id: 'author'
            });
        });

        it('returns tags', function () {
            assert.deepEqual(translator.getTypeAndIdFromPath('/tag'), {
                type: 'tag',
                id: 'tag'
            });
        });

        it('returns undefined', function () {
            assert.equal(translator.getTypeAndIdFromPath('/other'), undefined);
        });
    });

    describe('getResourceById', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlService: {
                    getUrlByResourceId: () => {
                        return '/path';
                    }
                },
                models
            });
        });

        it('returns for post', async function () {
            const result = await translator.getResourceById('id', 'post');
            assert.equal(result.id, 'post_id');
        });

        it('returns for page', async function () {
            const result = await translator.getResourceById('id', 'page');
            assert.equal(result.id, 'post_id');
        });

        it('returns for tag', async function () {
            const result = await translator.getResourceById('id', 'tag');
            assert.equal(result.id, 'tag_id');
        });

        it('returns for user', async function () {
            const result = await translator.getResourceById('id', 'author');
            assert.equal(result.id, 'user_id');
        });

        it('returns for invalid', async function () {
            assert.equal(await translator.getResourceById('id', 'invalid'), null);
        });

        it('returns null for not found post', async function () {
            assert.equal(await translator.getResourceById('invalid', 'post'), null);
        });

        it('returns null for not found page', async function () {
            assert.equal(await translator.getResourceById('invalid', 'page'), null);
        });

        it('returns null for not found author', async function () {
            assert.equal(await translator.getResourceById('invalid', 'author'), null);
        });

        it('returns null for not found tag', async function () {
            assert.equal(await translator.getResourceById('invalid', 'tag'), null);
        });
    });

    describe('relativeToAbsolute', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlUtils: {
                    relativeToAbsolute: (t) => {
                        return 'absolute/' + t;
                    }
                }
            });
        });

        it('passes relativeToAbsolute to urlUtils', async function () {
            assert.equal(translator.relativeToAbsolute('relative'), 'absolute/relative');
        });
    });

    describe('stripSubdirectoryFromPath', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlUtils: {
                    relativeToAbsolute: (t) => {
                        return 'absolute' + t;
                    },
                    absoluteToRelative: (t) => {
                        const prefix = 'absolute/dir/';
                        if (t.startsWith(prefix)) {
                            return t.substring(prefix.length - 1);
                        }
                        return t;
                    }
                }
            });
        });

        it('passes calls to urlUtils', async function () {
            assert.equal(translator.stripSubdirectoryFromPath('/dir/relative'), '/relative');
        });
    });
});
