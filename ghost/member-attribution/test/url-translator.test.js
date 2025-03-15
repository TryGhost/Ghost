require('should');

const UrlTranslator = require('../lib/UrlTranslator');

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
            should(await translator.getResourceDetails({time: 123})).eql(null);
        });

        it('returns posts for explicit items', async function () {
            should(await translator.getResourceDetails({id: 'my-post', type: 'post', time: 123})).eql({
                type: 'post',
                id: 'my-post',
                url: '/path/my-post'
            });
        });

        it('returns null if explicit resource not found', async function () {
            should(await translator.getResourceDetails({id: 'invalid', type: 'post', time: 123})).eql(null);
        });

        it('returns null for invalid item', async function () {
            should(await translator.getResourceDetails({time: 123})).eql(null);
        });

        it('returns url type if no path not matching a resource', async function () {
            should(await translator.getResourceDetails({path: '/test', time: 123})).eql({
                type: 'url',
                id: null,
                url: '/test'
            });
        });

        it('strips subdirectory for url types', async function () {
            should(await translator.getResourceDetails({path: '/with-subdirectory/test', time: 123})).eql({
                type: 'url',
                id: null,
                url: '/test'
            });
        });

        it('returns post type if matching resource', async function () {
            should(await translator.getResourceDetails({path: '/with-subdirectory/path/post', time: 123})).eql({
                type: 'post',
                id: 'post',
                url: '/path/post'
            });
        });

        it('returns page type if matching resource', async function () {
            should(await translator.getResourceDetails({path: '/with-subdirectory/path/page', time: 123})).eql({
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
            should(translator.getUrlTitle('/')).eql('homepage');
        });

        it('returns url', function () {
            should(translator.getUrlTitle('/url')).eql('/url');
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
            should(translator.getTypeAndIdFromPath('/post')).eql({
                type: 'post',
                id: 'post'
            });
        });

        it('returns pages', function () {
            should(translator.getTypeAndIdFromPath('/page')).eql({
                type: 'page',
                id: 'page'
            });
        });

        it('returns authors', function () {
            should(translator.getTypeAndIdFromPath('/author')).eql({
                type: 'author',
                id: 'author'
            });
        });

        it('returns tags', function () {
            should(translator.getTypeAndIdFromPath('/tag')).eql({
                type: 'tag',
                id: 'tag'
            });
        });

        it('returns undefined', function () {
            should(translator.getTypeAndIdFromPath('/other')).eql(undefined);
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
            should(await translator.getResourceById('id', 'post')).match({
                id: 'post_id'
            });
        });

        it('returns for page', async function () {
            should(await translator.getResourceById('id', 'page')).match({
                id: 'post_id'
            });
        });

        it('returns for tag', async function () {
            should(await translator.getResourceById('id', 'tag')).match({
                id: 'tag_id'
            });
        });

        it('returns for user', async function () {
            should(await translator.getResourceById('id', 'author')).match({
                id: 'user_id'
            });
        });

        it('returns for invalid', async function () {
            should(await translator.getResourceById('id', 'invalid')).eql(null);
        });

        it('returns null for not found post', async function () {
            should(await translator.getResourceById('invalid', 'post')).eql(null);
        });

        it('returns null for not found page', async function () {
            should(await translator.getResourceById('invalid', 'page')).eql(null);
        });

        it('returns null for not found author', async function () {
            should(await translator.getResourceById('invalid', 'author')).eql(null);
        });

        it('returns null for not found tag', async function () {
            should(await translator.getResourceById('invalid', 'tag')).eql(null);
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
            should(translator.relativeToAbsolute('relative')).eql('absolute/relative');
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
            should(translator.stripSubdirectoryFromPath('/dir/relative')).eql('/relative');
        });
    });
});
